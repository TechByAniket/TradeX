import "dotenv/config";
import assert from "node:assert/strict";
import http from "node:http";
import { io as createSocketClient } from "socket.io-client";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { attachSocketIO } from "../src/server.js";
import marketDataService from "../src/services/market/marketDataService.js";
import { SimulatedMarketDataProvider } from "../src/services/market/simulatedMarketProvider.js";

const runTag = Date.now();
const userAEmail = `market.a.${runTag}@example.com`;
const userBEmail = `market.b.${runTag}@example.com`;
const testEmails = [userAEmail, userBEmail];

let httpServer;
let ioServer;

async function apiRequest(baseUrl, path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await res.json();
  return { status: res.status, body };
}

function round2(val) {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

async function testUnitSimulationModel() {
  const testProvider = new SimulatedMarketDataProvider({
    simulationIntervalMs: 60000,
    persistIntervalMs: 60000,
    historyLimit: 5,
  });

  await testProvider.start();
  // Duplicate start() must be idempotent
  await testProvider.start();

  const initial = testProvider.getLatestPrices();
  assert.equal(initial.length, 10, "Should initialize all 10 stocks");

  const refBySymbol = new Map();
  for (const s of initial) {
    assert.ok(s.currentPrice > 0, `${s.symbol} initial price must be positive`);
    assert.equal(s.previousClose, s.currentPrice);
    assert.equal(s.dayHigh, s.currentPrice);
    assert.equal(s.dayLow, s.currentPrice);
    refBySymbol.set(s.symbol, s.previousClose);
  }

  let prevMap = new Map(initial.map((s) => [s.symbol, s]));
  for (let i = 0; i < 12; i += 1) {
    const updated = testProvider.tick();
    assert.equal(updated.length, 10);

    for (const s of updated) {
      const prev = prevMap.get(s.symbol);
      const ref = refBySymbol.get(s.symbol);

      assert.ok(s.currentPrice > 0, `${s.symbol} price must remain positive`);
      assert.equal(s.currentPrice, round2(s.currentPrice), "Price must be rounded to 2 decimals");

      const stepMovePct = Math.abs(s.currentPrice - prev.currentPrice) / prev.currentPrice;
      assert.ok(stepMovePct <= 0.0055, `${s.symbol} single-tick move exceeded bound: ${stepMovePct}`);

      const devFromRefPct = Math.abs(s.currentPrice - ref) / ref;
      assert.ok(devFromRefPct <= 0.081, `${s.symbol} deviated beyond ±8% bound: ${devFromRefPct}`);

      const expectedChange = round2(s.currentPrice - s.previousClose);
      const expectedChangePct = round2((expectedChange / s.previousClose) * 100);
      assert.equal(s.change, expectedChange);
      assert.equal(s.changePercent, expectedChangePct);

      assert.ok(s.dayHigh >= s.currentPrice && s.dayHigh >= prev.dayHigh);
      assert.ok(s.dayLow <= s.currentPrice && s.dayLow <= prev.dayLow);
      assert.ok(s.volume >= prev.volume, "Volume must never decrease");
    }

    prevMap = new Map(updated.map((s) => [s.symbol, s]));
  }

  // History buffer limit enforcement (capped at 5)
  const relianceHistory = testProvider.getPriceHistory("RELIANCE");
  assert.ok(relianceHistory);
  assert.equal(relianceHistory.history.length, 5, "History buffer must cap at historyLimit");

  await testProvider.stop();
  console.log("1. Unit simulation model checks passed");
}

async function testIntegrationFlows() {
  httpServer = http.createServer(app);
  ioServer = attachSocketIO(httpServer);

  await marketDataService.start((stocks, timestamp) => {
    ioServer.emit("market:price_update", {
      provider: marketDataService.getProviderName(),
      simulated: marketDataService.isSimulated(),
      stocks,
      timestamp,
    });
  });

  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const { port } = httpServer.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  // 2. Market REST endpoints
  const allRes = await apiRequest(baseUrl, "/api/market/stocks");
  assert.equal(allRes.status, 200);
  assert.equal(allRes.body.simulated, true);
  assert.equal(allRes.body.count, 10);

  const singleRes = await apiRequest(baseUrl, "/api/market/stocks/reliance");
  assert.equal(singleRes.status, 200);
  assert.equal(singleRes.body.stock.symbol, "RELIANCE");

  const histRes = await apiRequest(baseUrl, "/api/market/stocks/RELIANCE/history");
  assert.equal(histRes.status, 200);
  assert.equal(histRes.body.symbol, "RELIANCE");
  assert.ok(histRes.body.history.length >= 1);

  const missingStockRes = await apiRequest(baseUrl, "/api/market/stocks/UNKNOWNXYZ");
  assert.equal(missingStockRes.status, 404);

  const missingHistRes = await apiRequest(baseUrl, "/api/market/stocks/UNKNOWNXYZ/history");
  assert.equal(missingHistRes.status, 404);
  console.log("2. Market REST endpoints passed");

  // 3. Socket.IO snapshot, live broadcast, and reconnect snapshot
  const socketClient = createSocketClient(baseUrl, {
    transports: ["websocket"],
  });

  const snapshot = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Timed out waiting for market:snapshot")), 5000);
    socketClient.once("market:snapshot", (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });
  assert.equal(snapshot.simulated, true);
  assert.equal(snapshot.stocks.length, 10);

  const priceUpdatePromise = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Timed out waiting for market:price_update")), 5000);
    socketClient.once("market:price_update", (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });
  marketDataService.tick();
  const updatePayload = await priceUpdatePromise;
  assert.equal(updatePayload.stocks.length, 10);
  assert.ok(updatePayload.timestamp);

  // Reconnect snapshot check
  socketClient.disconnect();
  socketClient.connect();
  const reconnectSnapshot = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Timed out waiting for reconnect snapshot")), 5000);
    socketClient.once("market:snapshot", (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });
  assert.equal(reconnectSnapshot.stocks.length, 10);
  socketClient.disconnect();
  console.log("3. Socket.IO snapshot & price_update checks passed");

  // 4. Register User A & User B
  const regA = await apiRequest(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Trader A", email: userAEmail, password: "Password123!" }),
  });
  assert.equal(regA.status, 201);
  const tokenA = regA.body.token;

  const regB = await apiRequest(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Trader B", email: userBEmail, password: "Password123!" }),
  });
  assert.equal(regB.status, 201);
  const tokenB = regB.body.token;

  // 5. BUY order must use backend simulated price (ignore client-sent price/totalAmount)
  const buyRes = await apiRequest(baseUrl, "/api/orders/buy", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      symbol: "ITC",
      quantity: 5,
      price: 1,
      totalAmount: 5,
    }),
  });
  assert.equal(buyRes.status, 201);
  assert.notEqual(buyRes.body.order.executionPrice, 1);
  const itcHistoryAfterBuy = marketDataService.getPriceHistory("ITC").history;
  assert.ok(
    itcHistoryAfterBuy.some((pt) => pt.price === buyRes.body.order.executionPrice),
    "BUY executionPrice must match a recorded backend market price"
  );
  assert.equal(
    buyRes.body.order.totalAmount,
    round2(buyRes.body.order.executionPrice * 5)
  );
  assert.equal(buyRes.body.holding.quantity, 5);
  assert.equal(
    buyRes.body.cashBalance,
    round2(100000 - buyRes.body.order.totalAmount)
  );

  // Insufficient cash BUY -> 400 without mutating cash balance
  const bigBuyRes = await apiRequest(baseUrl, "/api/orders/buy", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ symbol: "TCS", quantity: 1000 }),
  });
  assert.equal(bigBuyRes.status, 400);

  // Unknown symbol order -> 404
  const unknownBuyRes = await apiRequest(baseUrl, "/api/orders/buy", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ symbol: "NONEXISTENT", quantity: 1 }),
  });
  assert.equal(unknownBuyRes.status, 404);

  // 6. Portfolio P&L reflects changing simulated prices
  marketDataService.tick();
  const portfolioA = await apiRequest(baseUrl, "/api/portfolio", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(portfolioA.status, 200);
  assert.equal(portfolioA.body.holdings.length, 1);
  const itcHolding = portfolioA.body.holdings[0];
  assert.equal(itcHolding.symbol, "ITC");
  assert.ok(itcHolding.currentPrice > 0);
  assert.equal(itcHolding.currentValue, round2(itcHolding.currentPrice * 5));
  assert.equal(
    itcHolding.unrealizedPnl,
    round2(itcHolding.currentValue - itcHolding.investedValue)
  );
  assert.equal(
    portfolioA.body.portfolio.totalPortfolioValue,
    round2(portfolioA.body.portfolio.cashBalance + itcHolding.currentValue)
  );

  // 7. User isolation: User B portfolio, orders, transactions are unaffected by User A
  const portfolioB = await apiRequest(baseUrl, "/api/portfolio", {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(portfolioB.status, 200);
  assert.equal(portfolioB.body.portfolio.cashBalance, 100000);
  assert.equal(portfolioB.body.holdings.length, 0);

  const ordersB = await apiRequest(baseUrl, "/api/orders", {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(ordersB.status, 200);
  assert.equal(ordersB.body.count, 0);

  // 8. Oversell rejected -> 400
  const oversellRes = await apiRequest(baseUrl, "/api/orders/sell", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ symbol: "ITC", quantity: 10 }),
  });
  assert.equal(oversellRes.status, 400);

  // 9. Valid partial SELL + full SELL using latest backend price
  const sellPartialRes = await apiRequest(baseUrl, "/api/orders/sell", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ symbol: "ITC", quantity: 2, price: 999999 }),
  });
  assert.equal(sellPartialRes.status, 201);
  assert.notEqual(sellPartialRes.body.order.executionPrice, 999999);
  const itcHistoryAfterSell = marketDataService.getPriceHistory("ITC").history;
  assert.ok(
    itcHistoryAfterSell.some((pt) => pt.price === sellPartialRes.body.order.executionPrice),
    "SELL executionPrice must match a recorded backend market price"
  );
  assert.equal(sellPartialRes.body.holding.quantity, 3);

  const sellFullRes = await apiRequest(baseUrl, "/api/orders/sell", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ symbol: "ITC", quantity: 3 }),
  });
  assert.equal(sellFullRes.status, 201);
  assert.equal(sellFullRes.body.holding, null);

  const txARes = await apiRequest(baseUrl, "/api/portfolio/transactions", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(txARes.status, 200);
  assert.equal(txARes.body.count, 3);

  console.log("4. Trading engine & portfolio integration checks passed");
}

try {
  await testUnitSimulationModel();
  await testIntegrationFlows();
  console.log("ALL MARKET SIMULATION & TRADING TESTS PASSED!");
} finally {
  const testUsers = await prisma.users.findMany({
    where: { email: { in: testEmails } },
    select: { id: true },
  });
  const userIds = testUsers.map((u) => u.id);
  if (userIds.length > 0) {
    const portfolios = await prisma.portfolios.findMany({
      where: { user_id: { in: userIds } },
      select: { id: true },
    });
    const portfolioIds = portfolios.map((p) => p.id);
    if (portfolioIds.length > 0) {
      await prisma.transactions.deleteMany({ where: { portfolio_id: { in: portfolioIds } } });
      await prisma.holdings.deleteMany({ where: { portfolio_id: { in: portfolioIds } } });
    }
    await prisma.orders.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.portfolios.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.users.deleteMany({ where: { id: { in: userIds } } });
  }
  await marketDataService.stop().catch(() => {});
  ioServer?.close();
  httpServer?.close();
  await prisma.$disconnect();
}
