import prisma from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.ts";
import marketDataService from "./market/marketDataService.js";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function getUserPortfolio(userId) {
  const portfolio = await prisma.portfolios.findUnique({
    where: { user_id: userId },
    include: {
      holdings: {
        include: {
          stocks: true,
        },
        orderBy: {
          stocks: { symbol: "asc" },
        },
      },
    },
  });

  if (!portfolio) {
    throw createHttpError("Portfolio not found", 404);
  }

  let totalInvestedDecimal = new Prisma.Decimal(0);
  let totalCurrentDecimal = new Prisma.Decimal(0);

  const holdings = portfolio.holdings.map((holding) => {
    const qty = Number(holding.quantity);
    const qtyDecimal = new Prisma.Decimal(holding.quantity.toString());
    const avgPrice = new Prisma.Decimal(holding.average_price);

    let currentPriceValue = null;
    try {
      const marketStock = marketDataService.getLatestPrice(holding.stocks.symbol);
      currentPriceValue = marketStock.currentPrice;
    } catch {
      currentPriceValue =
        holding.stocks.current_price !== null
          ? Number(holding.stocks.current_price)
          : Number(avgPrice);
    }

    const currentPrice = new Prisma.Decimal(currentPriceValue);
    const investedValue = avgPrice.mul(qtyDecimal);
    const currentValue = currentPrice.mul(qtyDecimal);
    const unrealizedPnl = currentValue.sub(investedValue);
    const unrealizedPnlPercent = investedValue.gt(0)
      ? unrealizedPnl.div(investedValue).mul(100)
      : new Prisma.Decimal(0);

    totalInvestedDecimal = totalInvestedDecimal.add(investedValue);
    totalCurrentDecimal = totalCurrentDecimal.add(currentValue);

    return {
      stockId: holding.stock_id,
      symbol: holding.stocks.symbol,
      companyName: holding.stocks.company_name,
      quantity: qty,
      averageBuyPrice: Number(avgPrice.toFixed(2)),
      currentPrice: Number(currentPrice.toFixed(2)),
      investedValue: Number(investedValue.toFixed(2)),
      currentValue: Number(currentValue.toFixed(2)),
      unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
      unrealizedPnlPercent: Number(unrealizedPnlPercent.toFixed(2)),
    };
  });

  const cashBalance = new Prisma.Decimal(portfolio.cash_balance);
  const totalPortfolioValue = cashBalance.add(totalCurrentDecimal);
  const totalUnrealizedPnl = totalCurrentDecimal.sub(totalInvestedDecimal);
  const totalUnrealizedPnlPercent = totalInvestedDecimal.gt(0)
    ? totalUnrealizedPnl.div(totalInvestedDecimal).mul(100)
    : new Prisma.Decimal(0);

  return {
    portfolio: {
      id: portfolio.id,
      currency: portfolio.currency,
      cashBalance: Number(cashBalance.toFixed(2)),
      totalInvestedValue: Number(totalInvestedDecimal.toFixed(2)),
      totalCurrentHoldingsValue: Number(totalCurrentDecimal.toFixed(2)),
      totalPortfolioValue: Number(totalPortfolioValue.toFixed(2)),
      totalUnrealizedPnl: Number(totalUnrealizedPnl.toFixed(2)),
      totalUnrealizedPnlPercent: Number(totalUnrealizedPnlPercent.toFixed(2)),
      simulatedMarket: marketDataService.isSimulated(),
    },
    holdings,
  };
}

export async function getUserTransactions(userId) {
  const transactions = await prisma.transactions.findMany({
    where: {
      portfolios: {
        user_id: userId,
      },
    },
    include: {
      orders: {
        include: {
          stocks: {
            select: {
              symbol: true,
              company_name: true,
            },
          },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return transactions.map((tx) => ({
    id: tx.id,
    orderId: tx.order_id,
    symbol: tx.orders.stocks.symbol,
    companyName: tx.orders.stocks.company_name,
    quantity: Number(tx.orders.quantity),
    type: tx.transaction_type,
    amount: Number(new Prisma.Decimal(tx.amount).toFixed(2)),
    balanceAfter: Number(new Prisma.Decimal(tx.balance_after).toFixed(2)),
    currency: tx.currency,
    createdAt: tx.created_at,
  }));
}
