import prisma from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.ts";
import { createHttpError } from "../utils/httpError.js";
import marketDataService from "./market/marketDataService.js";

const toMoney = (decimalVal) => Number(new Prisma.Decimal(decimalVal).toFixed(2));

function prepareOrder(symbol, rawQuantity) {
  const qty = Number(rawQuantity);
  if (!Number.isSafeInteger(qty) || qty <= 0) {
    throw createHttpError("Quantity must be a positive whole number", 400);
  }

  const marketStock = marketDataService.getLatestPrice(symbol);
  const executionPrice = new Prisma.Decimal(marketStock.currentPrice).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
  const totalAmount = executionPrice.mul(qty).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  if (totalAmount.lte(0)) {
    throw createHttpError("Calculated order amount must be positive", 400);
  }

  return { qtyBigInt: BigInt(qty), marketStock, executionPrice, totalAmount };
}

function serializeOrder(order, symbol, companyName) {
  return {
    id: order.id,
    symbol,
    companyName,
    orderType: order.order_type,
    quantity: Number(order.quantity),
    executionPrice: toMoney(order.execution_price),
    totalAmount: toMoney(order.total_amount),
    status: order.status,
    createdAt: order.created_at,
  };
}

async function recordOrderAndTransaction(tx, {
  userId, portfolio, marketStock, orderType, transactionType, qtyBigInt, executionPrice, totalAmount, holding,
}) {
  const order = await tx.orders.create({
    data: {
      user_id: userId, stock_id: marketStock.id, order_type: orderType,
      quantity: qtyBigInt, execution_price: executionPrice, total_amount: totalAmount, status: "EXECUTED",
    },
  });

  const transaction = await tx.transactions.create({
    data: {
      portfolio_id: portfolio.id, order_id: order.id, transaction_type: transactionType,
      amount: totalAmount, balance_after: portfolio.cash_balance, currency: portfolio.currency,
    },
  });

  return {
    order: serializeOrder(order, marketStock.symbol, marketStock.companyName),
    transaction: {
      id: transaction.id,
      type: transaction.transaction_type,
      amount: toMoney(transaction.amount),
      balanceAfter: toMoney(transaction.balance_after),
      currency: transaction.currency,
      createdAt: transaction.created_at,
    },
    holding,
    cashBalance: toMoney(portfolio.cash_balance),
  };
}

export async function placeBuyOrder(userId, { symbol, quantity }) {
  const { qtyBigInt, marketStock, executionPrice, totalAmount } = prepareOrder(symbol, quantity);

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const debit = await tx.portfolios.updateMany({
      where: { user_id: userId, cash_balance: { gte: totalAmount } },
      data: { cash_balance: { decrement: totalAmount }, updated_at: now },
    });

    if (debit.count === 0) {
      const exists = await tx.portfolios.findUnique({ where: { user_id: userId }, select: { id: true } });
      throw createHttpError(exists ? "Insufficient cash balance for this buy order" : "User portfolio not found", exists ? 400 : 404);
    }

    const portfolio = await tx.portfolios.findUnique({ where: { user_id: userId } });
    const existing = await tx.holdings.findUnique({
      where: { portfolio_id_stock_id: { portfolio_id: portfolio.id, stock_id: marketStock.id } },
    });

    let updatedHolding;
    if (existing) {
      const newQty = existing.quantity + qtyBigInt;
      const newAvg = new Prisma.Decimal(existing.average_price)
        .mul(existing.quantity.toString())
        .add(totalAmount)
        .div(newQty.toString())
        .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
      updatedHolding = await tx.holdings.update({
        where: { id: existing.id },
        data: { quantity: newQty, average_price: newAvg, updated_at: now },
      });
    } else {
      updatedHolding = await tx.holdings.create({
        data: { portfolio_id: portfolio.id, stock_id: marketStock.id, quantity: qtyBigInt, average_price: executionPrice },
      });
    }

    return recordOrderAndTransaction(tx, {
      userId, portfolio, marketStock, orderType: "BUY", transactionType: "BUY_DEBIT",
      qtyBigInt, executionPrice, totalAmount,
      holding: {
        symbol: marketStock.symbol,
        quantity: Number(updatedHolding.quantity),
        averageBuyPrice: toMoney(updatedHolding.average_price),
      },
    });
  });
}

export async function placeSellOrder(userId, { symbol, quantity }) {
  const { qtyBigInt, marketStock, executionPrice, totalAmount } = prepareOrder(symbol, quantity);

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const portfolio = await tx.portfolios.findUnique({ where: { user_id: userId } });
    if (!portfolio) throw createHttpError("User portfolio not found", 404);

    // Partial sell decrements (> qty); full sell deletes row to honor CHECK (quantity > 0)
    const partial = await tx.holdings.updateMany({
      where: { portfolio_id: portfolio.id, stock_id: marketStock.id, quantity: { gt: qtyBigInt } },
      data: { quantity: { decrement: qtyBigInt }, updated_at: now },
    });

    let holding = null;
    if (partial.count > 0) {
      const remaining = await tx.holdings.findUnique({
        where: { portfolio_id_stock_id: { portfolio_id: portfolio.id, stock_id: marketStock.id } },
      });
      if (remaining) {
        holding = { symbol: marketStock.symbol, quantity: Number(remaining.quantity), averageBuyPrice: toMoney(remaining.average_price) };
      }
    } else {
      const full = await tx.holdings.deleteMany({
        where: { portfolio_id: portfolio.id, stock_id: marketStock.id, quantity: qtyBigInt },
      });
      if (full.count === 0) throw createHttpError("Insufficient stock quantity to sell", 400);
    }

    const updatedPortfolio = await tx.portfolios.update({
      where: { id: portfolio.id },
      data: { cash_balance: { increment: totalAmount }, updated_at: now },
    });

    return recordOrderAndTransaction(tx, {
      userId, portfolio: updatedPortfolio, marketStock, orderType: "SELL", transactionType: "SELL_CREDIT",
      qtyBigInt, executionPrice, totalAmount, holding,
    });
  });
}

export async function getUserOrders(userId) {
  const orders = await prisma.orders.findMany({
    where: { user_id: userId },
    include: { stocks: { select: { symbol: true, company_name: true } } },
    orderBy: { created_at: "desc" },
  });
  return orders.map((o) => serializeOrder(o, o.stocks.symbol, o.stocks.company_name));
}
