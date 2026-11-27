import "dotenv/config";
import assert from "node:assert/strict";
import http from "node:http";
import { io as createSocketClient } from "socket.io-client";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";
import { attachSocketIO } from "../src/server.js";
import marketDataService from "../src/services/market/marketDataService.js";
import {
  mapAndValidateZylaResponse,
  refreshNseSnapshots,
  resetZylaRefreshStateForTests,
} from "../src/services/market/zylaMarketService.js";

let httpServer;
let ioServer;

function makeMockZylaPayload({
  companyName,
  nseSymbol,
  industry,
  nsePrice,
  previousClose,
  change,
  percentChange,
  dayHigh,
  dayLow,
  yearHigh52W,
  yearLow52W,
  volume,
  marketCapCr,
  quoteDate = "27 Nov 2026",
  quoteTime = "12:00:00",
}) {
  return {
    companyName,
    industry,
    companyProfile: {
      companyName,
      exchangeCodeNse: nseSymbol,
      exchangeCodeBse: "500001", // ignored
    },
    currentPrice: {
      NSE: String(nsePrice),
      BSE: "999999.99", // ignored
    },
    percentChange: String(percentChange),
    yearHigh: String(yearHigh52W),
    yearLow: String(yearLow52W),
    keyMetrics: {
      priceandVolume: [{ key: "volume", value: String(volume) }],
    },
    stockDetailsReusableData: {
      close: String(previousClose),
      date: quoteDate,
      time: quoteTime,
      price: String(nsePrice),
      percentChange: String(percentChange),
      marketCap: String(marketCapCr),
      high: String(dayHigh),
      low: String(dayLow),
      pPerEBasicExcludingExtraordinaryItemsTTM: "25.4", // ignored
      averageRating: "Buy", // ignored
    },
    change: String(change),
  };
}

function testMappingAndValidation() {
  // Valid payload + recomputes inconsistent change & percentChange + strips ignored fields
  const mapped = mapAndValidateZylaResponse(
    makeMockZylaPayload({
      companyName: "Reliance Industries",
      nseSymbol: "RELIANCE",
      industry: "Oil & Gas Operations",
      nsePrice: 1400,
      previousClose: 1350,
      change: 999, // intentionally inconsistent
      percentChange: 99.99, // intentionally inconsistent
      dayHigh: 1410,
      dayLow: 1345,
      yearHigh52W: 1611.2,
      yearLow52W: 1152.3,
      volume: 15.12,
      marketCapCr: 1870332.18,
    }),
    { symbol: "RELIANCE", query: "Reliance Industries", aliases: ["RELIANCE"] }
  );

  assert.equal(mapped.symbol, "RELIANCE");
  assert.equal(mapped.nsePrice, 1400);
  assert.equal(mapped.previousClose, 1350);
  assert.equal(mapped.change, 50, "Change must match nsePrice - previousClose");
  assert.equal(
    mapped.percentChange,
    3.7,
    "Percent change must be calculated consistently from nsePrice & previousClose"
  );
  assert.equal("bseCode" in mapped, false);
  assert.equal("bsePrice" in mapped, false);
  assert.equal("peRatio" in mapped, false);
  assert.equal("analystRating" in mapped, false);

  // Alias match (TMCV -> TATAMOTORS)
  const tataMapped = mapAndValidateZylaResponse(
    makeMockZylaPayload({
      companyName: "Tata Motors",
      nseSymbol: "TMCV",
      industry: "Auto & Truck Manufacturers",
      nsePrice: 430,
      previousClose: 435,
      change: -5,
      percentChange: -1.15,
      dayHigh: 438,
      dayLow: 427,
      yearHigh52W: 508.95,
      yearLow52W: 308,
      volume: 7.69,
      marketCapCr: 158249.46,
    }),
    { symbol: "TATAMOTORS", query: "Tata Motors", aliases: ["TATAMOTORS", "TMCV"] }
  );
  assert.equal(tataMapped.symbol, "TATAMOTORS");
  assert.equal(tataMapped.nseSymbol, "TMCV");

  // Symbol mismatch must reject
  assert.throws(
    () =>
      mapAndValidateZylaResponse(
        makeMockZylaPayload({
          companyName: "Wipro",
          nseSymbol: "WIPRO",
          industry: "IT",
          nsePrice: 500,
          previousClose: 495,
          change: 5,
          percentChange: 1.01,
          dayHigh: 505,
          dayLow: 492,
          yearHigh52W: 600,
          yearLow52W: 400,
          volume: 10,
          marketCapCr: 100000,
        }),
        { symbol: "INFY", query: "Infosys", aliases: ["INFY"] }
      ),
    /does not match/i
  );

  // Missing or non-positive nsePrice must reject
  assert.throws(
    () =>
      mapAndValidateZylaResponse(
        { companyName: "TCS", currentPrice: {} },
        { symbol: "TCS", query: "TCS", aliases: ["TCS"] }
      ),
    /Invalid or missing NSE price/i
  );

  console.log("1. Selected-field mapping & validation checks passed");
}

async function runTests() {
  const backupStocks = await prisma.stocks.findMany();
  const backupById = new Map(backupStocks.map((s) => [s.id, s]));

  // Verify no Zyla HTTP requests happen automatically on startup or ticks
  const originalFetch = globalThis.fetch;
  let automaticZylaCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("zylalabs.com")) {
      automaticZylaCalls += 1;
      throw new Error("Unexpected automatic Zyla API call");
    }
    return originalFetch(url, options);
  };

  try {
    testMappingAndValidation();
    resetZylaRefreshStateForTests();

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

    // Run ticks & ensure 0 Zyla API calls occurred automatically
    marketDataService.tick();
    marketDataService.tick();
    assert.equal(
      automaticZylaCalls,
      0,
      "Startup and simulation ticks must never call Zyla"
    );

    await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    const { port } = httpServer.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    // Connect Socket.IO listener to verify rebase broadcasts work cleanly
    const socket = createSocketClient(baseUrl, { transports: ["websocket"] });
    const receivedBroadcasts = [];
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Socket timeout")), 5000);
      socket.on("market:snapshot", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    socket.on("market:price_update", (payload) => {
      receivedBroadcasts.push(payload);
    });

    const preTestTcs = marketDataService.getLatestPrice("TCS");
    const preTestItc = marketDataService.getLatestPrice("ITC");

    // 2. Mocked parallel refresh (8 valid, 1 invalid payload, 1 HTTP 500)
    const mockFetch = async (url) => {
      const parsedUrl = new URL(String(url));
      const nameParam = parsedUrl.searchParams.get("name") || "";

      if (nameParam === "TCS") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ companyName: "TCS", currentPrice: {} }),
        };
      }
      if (nameParam === "ITC") {
        return {
          ok: false,
          status: 500,
          json: async () => ({ message: "Upstream error" }),
        };
      }

      const mapByQuery = {
        "Reliance Industries": { symbol: "RELIANCE", price: 1412.5, prev: 1390 },
        Infosys: { symbol: "INFY", price: 1210.0, prev: 1180 },
        "HDFC Bank": { symbol: "HDFCBANK", price: 890.25, prev: 875 },
        "ICICI Bank": { symbol: "ICICIBANK", price: 1620.0, prev: 1600 },
        "State Bank of India": { symbol: "SBIN", price: 1150.4, prev: 1135 },
        "Larsen & Toubro": { symbol: "LT", price: 4180.0, prev: 4140 },
        "Bharti Airtel": { symbol: "BHARTIARTL", price: 2110.0, prev: 2090 },
        "Tata Motors": { symbol: "TMCV", price: 441.75, prev: 431.5 },
      };

      const item = mapByQuery[nameParam];
      assert.ok(item, `Unexpected mock query name: ${nameParam}`);

      return {
        ok: true,
        status: 200,
        json: async () =>
          makeMockZylaPayload({
            companyName: nameParam,
            nseSymbol: item.symbol,
            industry: "Mocked Industry",
            nsePrice: item.price,
            previousClose: item.prev,
            change: 999, // verify validation overwrites inconsistent change
            percentChange: 99.99,
            dayHigh: item.price + 10,
            dayLow: item.prev - 5,
            yearHigh52W: item.price + 200,
            yearLow52W: item.price - 200,
            volume: 12.34,
            marketCapCr: 500000.25,
          }),
      };
    };

    const refreshResult = await refreshNseSnapshots({
      fetchImpl: mockFetch,
      apiKey: "mock-test-key",
      cooldownMs: 0,
    });

    assert.equal(refreshResult.updatedCount, 8);
    assert.equal(refreshResult.failedCount, 2);
    assert.deepEqual(
      refreshResult.failed.map((f) => f.symbol).sort(),
      ["ITC", "TCS"]
    );

    // Check PostgreSQL persistence for updated stock & untouched failed stocks
    const relianceDb = await prisma.stocks.findFirst({
      where: { symbol: "RELIANCE" },
    });
    assert.equal(Number(relianceDb.nse_reference_price), 1412.5);
    assert.equal(Number(relianceDb.current_price), 1412.5);
    assert.equal(Number(relianceDb.nse_change), 22.5);
    assert.equal(Number(relianceDb.nse_percent_change), 1.62);
    assert.ok(relianceDb.nse_quote_fetched_at instanceof Date);

    const tcsDb = await prisma.stocks.findFirst({ where: { symbol: "TCS" } });
    const tcsBackup = backupById.get(tcsDb.id);
    assert.equal(
      tcsDb.nse_reference_price?.toString() ?? null,
      tcsBackup.nse_reference_price?.toString() ?? null,
      "Failed TCS refresh must not overwrite DB NSE snapshot"
    );

    // Verify in-memory simulation rebased for succeeded stocks & untouched for failed stocks
    const liveReliance = marketDataService.getLatestPrice("RELIANCE");
    assert.equal(liveReliance.currentPrice, 1412.5);
    assert.equal(liveReliance.nseReferencePrice, 1412.5);
    assert.equal(marketDataService.getLatestPrice("TCS").currentPrice, preTestTcs.currentPrice);
    assert.equal(marketDataService.getLatestPrice("ITC").currentPrice, preTestItc.currentPrice);

    // Verify Socket.IO broadcast & continued simulation ticks
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.ok(
      receivedBroadcasts.length >= 1,
      "Rebase should broadcast market:price_update over Socket.IO"
    );
    const ticked = marketDataService.tick();
    assert.equal(ticked.length, 10, "All 10 simulated stocks keep ticking after rebase");

    console.log("2. Mocked DB update, partial failure, rebase & Socket.IO checks passed");

    // 3. Global duplicate-request lock (409 Conflict)
    resetZylaRefreshStateForTests();
    let releaseSlow;
    const slowGate = new Promise((resolve) => {
      releaseSlow = resolve;
    });
    const slowMockFetch = async (url) => {
      await slowGate;
      return mockFetch(url);
    };

    const inFlight = refreshNseSnapshots({
      fetchImpl: slowMockFetch,
      apiKey: "mock-test-key",
      cooldownMs: 0,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    await assert.rejects(
      () =>
        refreshNseSnapshots({
          fetchImpl: mockFetch,
          apiKey: "mock-test-key",
          cooldownMs: 0,
        }),
      (err) => err.statusCode === 409
    );

    releaseSlow();
    await inFlight;

    // 4. Cooldown protection (429 Too Many Requests without invoking mockFetch)
    let callsDuringCooldown = 0;
    await assert.rejects(
      () =>
        refreshNseSnapshots({
          fetchImpl: async () => {
            callsDuringCooldown += 1;
            return {};
          },
          apiKey: "mock-test-key",
          cooldownMs: 60000,
        }),
      (err) => err.statusCode === 429
    );
    assert.equal(
      callsDuringCooldown,
      0,
      "Cooldown rejection must block upstream Zyla requests"
    );

    console.log("3. Duplicate-lock (409) & cooldown (429) protection checks passed");

    socket.disconnect();
  } finally {
    globalThis.fetch = originalFetch;
    await marketDataService.stop().catch(() => {});
    ioServer?.close();
    httpServer?.close();

    // Restore exact pre-test PostgreSQL stocks rows
    const restores = backupStocks.map((row) =>
      prisma.stocks.update({
        where: { id: row.id },
        data: {
          company_name: row.company_name,
          current_price: row.current_price,
          price_updated_at: row.price_updated_at,
          updated_at: row.updated_at,
          industry: row.industry,
          nse_reference_price: row.nse_reference_price,
          nse_previous_close: row.nse_previous_close,
          nse_change: row.nse_change,
          nse_percent_change: row.nse_percent_change,
          nse_day_high: row.nse_day_high,
          nse_day_low: row.nse_day_low,
          nse_year_high_52w: row.nse_year_high_52w,
          nse_year_low_52w: row.nse_year_low_52w,
          nse_volume: row.nse_volume,
          market_cap_cr: row.market_cap_cr,
          quote_date: row.quote_date,
          quote_time: row.quote_time,
          nse_quote_fetched_at: row.nse_quote_fetched_at,
        },
      })
    );
    if (restores.length > 0) {
      await prisma.$transaction(restores).catch(() => {});
    }
    resetZylaRefreshStateForTests();
    await prisma.$disconnect();
  }
}

await runTests();
console.log("ALL ZYLA MANUAL REFRESH & REBASE TESTS PASSED!");
