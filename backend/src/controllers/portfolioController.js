import {
  getUserPortfolio,
  getUserTransactions,
} from "../services/portfolioService.js";

export async function getPortfolio(req, res, next) {
  try {
    const result = await getUserPortfolio(req.user.id);
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTransactions(req, res, next) {
  try {
    const transactions = await getUserTransactions(req.user.id);
    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    next(error);
  }
}
