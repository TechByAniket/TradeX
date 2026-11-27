import prisma from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.ts";
import { createHttpError } from "../utils/httpError.js";
import marketDataService from "./market/marketDataService.js";

const toMoney = (decimalVal) => Number(new Prisma.Decimal(decimalVal).toFixed(2));

export async function getUserPortfolio(userId) {
  const portfolio = await prisma.portfolios.findUnique({
    where: { user_id: userId },
    include: { holdings: { include: { stocks: true }, orderBy: { stocks: { symbol: "asc" } } } },
  });
  if (!portfolio) throw createHttpError("Portfolio not found", 404);

  let totalInvested = new Prisma.Decimal(0);
  let totalCurrent = new Prisma.Decimal(0);

  const holdings = portfolio.holdings.map((holding) => {
    const qtyDecimal = new Prisma.Decimal(holding.quantity.toString());
    const avgPrice = new Prisma.Decimal(holding.average_price);

    let livePrice;
    try {
      livePrice = marketDataService.getLatestPrice(holding.stocks.symbol).currentPrice;
    } catch {
      livePrice = holding.stocks.current_price !== null ? Number(holding.stocks.current_price) : Number(avgPrice);
    }

    const currentPrice = new Prisma.Decimal(livePrice);
    const investedValue = avgPrice.mul(qtyDecimal);
    const currentValue = currentPrice.mul(qtyDecimal);
    const unrealizedPnl = currentValue.sub(investedValue);
    const unrealizedPnlPercent = investedValue.gt(0) ? unrealizedPnl.div(investedValue).mul(100) : new Prisma.Decimal(0);

    totalInvested = totalInvested.add(investedValue);
    totalCurrent = totalCurrent.add(currentValue);

    return {
      stockId: holding.stock_id,
      symbol: holding.stocks.symbol,
      companyName: holding.stocks.company_name,
      quantity: Number(holding.quantity),
      averageBuyPrice: toMoney(avgPrice),
      currentPrice: toMoney(currentPrice),
      investedValue: toMoney(investedValue),
      currentValue: toMoney(currentValue),
      unrealizedPnl: toMoney(unrealizedPnl),
      unrealizedPnlPercent: toMoney(unrealizedPnlPercent),
    };
  });

  const cashBalance = new Prisma.Decimal(portfolio.cash_balance);
  const totalUnrealizedPnl = totalCurrent.sub(totalInvested);
  const totalUnrealizedPnlPercent = totalInvested.gt(0)
    ? totalUnrealizedPnl.div(totalInvested).mul(100)
    : new Prisma.Decimal(0);

  return {
    portfolio: {
      id: portfolio.id,
      currency: portfolio.currency,
      cashBalance: toMoney(cashBalance),
      totalInvestedValue: toMoney(totalInvested),
      totalCurrentHoldingsValue: toMoney(totalCurrent),
      totalPortfolioValue: toMoney(cashBalance.add(totalCurrent)),
      totalUnrealizedPnl: toMoney(totalUnrealizedPnl),
      totalUnrealizedPnlPercent: toMoney(totalUnrealizedPnlPercent),
      simulatedMarket: marketDataService.isSimulated(),
    },
    holdings,
  };
}

export async function getUserTransactions(userId) {
  const transactions = await prisma.transactions.findMany({
    where: { portfolios: { user_id: userId } },
    include: { orders: { include: { stocks: { select: { symbol: true, company_name: true } } } } },
    orderBy: { created_at: "desc" },
  });

  return transactions.map((tx) => ({
    id: tx.id,
    orderId: tx.order_id,
    symbol: tx.orders.stocks.symbol,
    companyName: tx.orders.stocks.company_name,
    quantity: Number(tx.orders.quantity),
    type: tx.transaction_type,
    amount: toMoney(tx.amount),
    balanceAfter: toMoney(tx.balance_after),
    currency: tx.currency,
    createdAt: tx.created_at,
  }));
}
