import prisma from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.ts";
import marketDataService from "./market/marketDataService.js";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseQuantity(rawQuantity) {
  const num = Number(rawQuantity);
  if (!Number.isSafeInteger(num) || num <= 0) {
    throw createHttpError("Quantity must be a positive whole number", 400);
  }
  return {
    qtyBigInt: BigInt(num),
    qtyDecimal: new Prisma.Decimal(num),
    qtyNumber: num,
  };
}

function serializeOrder(order, symbol, companyName) {
  return {
    id: order.id,
    symbol,
    companyName,
    orderType: order.order_type,
    quantity: Number(order.quantity),
    executionPrice: Number(new Prisma.Decimal(order.execution_price).toFixed(2)),
    totalAmount: Number(new Prisma.Decimal(order.total_amount).toFixed(2)),
    status: order.status,
    createdAt: order.created_at,
  };
}

export async function placeBuyOrder(userId, { symbol, quantity }) {
  const { qtyBigInt, qtyDecimal } = parseQuantity(quantity);
  const marketStock = marketDataService.getLatestPrice(symbol);

  const executionPrice = new Prisma.Decimal(marketStock.currentPrice).toDecimalPlaces(
    4,
    Prisma.Decimal.ROUND_HALF_UP
  );
  const totalAmount = executionPrice
    .mul(qtyDecimal)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  if (totalAmount.lte(0)) {
    throw createHttpError("Calculated order amount must be positive", 400);
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();

    const debitResult = await tx.portfolios.updateMany({
      where: {
        user_id: userId,
        cash_balance: { gte: totalAmount },
      },
      data: {
        cash_balance: { decrement: totalAmount },
        updated_at: now,
      },
    });

    if (debitResult.count === 0) {
      const portfolioExists = await tx.portfolios.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });
      if (!portfolioExists) {
        throw createHttpError("User portfolio not found", 404);
      }
      throw createHttpError("Insufficient cash balance for this buy order", 400);
    }

    const updatedPortfolio = await tx.portfolios.findUnique({
      where: { user_id: userId },
    });

    const existingHolding = await tx.holdings.findUnique({
      where: {
        portfolio_id_stock_id: {
          portfolio_id: updatedPortfolio.id,
          stock_id: marketStock.id,
        },
      },
    });

    let updatedHolding;
    if (existingHolding) {
      const prevQty = existingHolding.quantity;
      const newQty = prevQty + qtyBigInt;
      const prevCost = new Prisma.Decimal(existingHolding.average_price).mul(
        prevQty.toString()
      );
      const newAvgPrice = prevCost
        .add(totalAmount)
        .div(newQty.toString())
        .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

      updatedHolding = await tx.holdings.update({
        where: { id: existingHolding.id },
        data: {
          quantity: newQty,
          average_price: newAvgPrice,
          updated_at: now,
        },
      });
    } else {
      updatedHolding = await tx.holdings.create({
        data: {
          portfolio_id: updatedPortfolio.id,
          stock_id: marketStock.id,
          quantity: qtyBigInt,
          average_price: executionPrice,
        },
      });
    }

    const order = await tx.orders.create({
      data: {
        user_id: userId,
        stock_id: marketStock.id,
        order_type: "BUY",
        quantity: qtyBigInt,
        execution_price: executionPrice,
        total_amount: totalAmount,
        status: "EXECUTED",
      },
    });

    const transaction = await tx.transactions.create({
      data: {
        portfolio_id: updatedPortfolio.id,
        order_id: order.id,
        transaction_type: "BUY_DEBIT",
        amount: totalAmount,
        balance_after: updatedPortfolio.cash_balance,
        currency: updatedPortfolio.currency,
      },
    });

    return {
      order: serializeOrder(order, marketStock.symbol, marketStock.companyName),
      transaction: {
        id: transaction.id,
        type: transaction.transaction_type,
        amount: Number(new Prisma.Decimal(transaction.amount).toFixed(2)),
        balanceAfter: Number(new Prisma.Decimal(transaction.balance_after).toFixed(2)),
        currency: transaction.currency,
        createdAt: transaction.created_at,
      },
      holding: {
        symbol: marketStock.symbol,
        quantity: Number(updatedHolding.quantity),
        averageBuyPrice: Number(
          new Prisma.Decimal(updatedHolding.average_price).toFixed(2)
        ),
      },
      cashBalance: Number(new Prisma.Decimal(updatedPortfolio.cash_balance).toFixed(2)),
    };
  });
}

export async function placeSellOrder(userId, { symbol, quantity }) {
  const { qtyBigInt, qtyDecimal } = parseQuantity(quantity);
  const marketStock = marketDataService.getLatestPrice(symbol);

  const executionPrice = new Prisma.Decimal(marketStock.currentPrice).toDecimalPlaces(
    4,
    Prisma.Decimal.ROUND_HALF_UP
  );
  const totalAmount = executionPrice
    .mul(qtyDecimal)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  if (totalAmount.lte(0)) {
    throw createHttpError("Calculated order amount must be positive", 400);
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();

    const portfolio = await tx.portfolios.findUnique({
      where: { user_id: userId },
    });

    if (!portfolio) {
      throw createHttpError("User portfolio not found", 404);
    }

    const partialSellResult = await tx.holdings.updateMany({
      where: {
        portfolio_id: portfolio.id,
        stock_id: marketStock.id,
        quantity: { gt: qtyBigInt },
      },
      data: {
        quantity: { decrement: qtyBigInt },
        updated_at: now,
      },
    });

    let holdingSummary = null;
    if (partialSellResult.count > 0) {
      const remainingHolding = await tx.holdings.findUnique({
        where: {
          portfolio_id_stock_id: {
            portfolio_id: portfolio.id,
            stock_id: marketStock.id,
          },
        },
      });
      if (remainingHolding) {
        holdingSummary = {
          symbol: marketStock.symbol,
          quantity: Number(remainingHolding.quantity),
          averageBuyPrice: Number(
            new Prisma.Decimal(remainingHolding.average_price).toFixed(2)
          ),
        };
      }
    } else {
      const fullSellResult = await tx.holdings.deleteMany({
        where: {
          portfolio_id: portfolio.id,
          stock_id: marketStock.id,
          quantity: qtyBigInt,
        },
      });

      if (fullSellResult.count === 0) {
        throw createHttpError("Insufficient stock quantity to sell", 400);
      }
    }

    const updatedPortfolio = await tx.portfolios.update({
      where: { id: portfolio.id },
      data: {
        cash_balance: { increment: totalAmount },
        updated_at: now,
      },
    });

    const order = await tx.orders.create({
      data: {
        user_id: userId,
        stock_id: marketStock.id,
        order_type: "SELL",
        quantity: qtyBigInt,
        execution_price: executionPrice,
        total_amount: totalAmount,
        status: "EXECUTED",
      },
    });

    const transaction = await tx.transactions.create({
      data: {
        portfolio_id: updatedPortfolio.id,
        order_id: order.id,
        transaction_type: "SELL_CREDIT",
        amount: totalAmount,
        balance_after: updatedPortfolio.cash_balance,
        currency: updatedPortfolio.currency,
      },
    });

    return {
      order: serializeOrder(order, marketStock.symbol, marketStock.companyName),
      transaction: {
        id: transaction.id,
        type: transaction.transaction_type,
        amount: Number(new Prisma.Decimal(transaction.amount).toFixed(2)),
        balanceAfter: Number(new Prisma.Decimal(transaction.balance_after).toFixed(2)),
        currency: transaction.currency,
        createdAt: transaction.created_at,
      },
      holding: holdingSummary,
      cashBalance: Number(new Prisma.Decimal(updatedPortfolio.cash_balance).toFixed(2)),
    };
  });
}

export async function getUserOrders(userId) {
  const orders = await prisma.orders.findMany({
    where: { user_id: userId },
    include: {
      stocks: {
        select: {
          symbol: true,
          company_name: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return orders.map((order) =>
    serializeOrder(order, order.stocks.symbol, order.stocks.company_name)
  );
}
