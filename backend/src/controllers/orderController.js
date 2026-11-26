import {
  getUserOrders,
  placeBuyOrder,
  placeSellOrder,
} from "../services/orderService.js";

export async function buyStock(req, res, next) {
  try {
    const result = await placeBuyOrder(req.user.id, req.body || {});
    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function sellStock(req, res, next) {
  try {
    const result = await placeSellOrder(req.user.id, req.body || {});
    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function listOrders(req, res, next) {
  try {
    const orders = await getUserOrders(req.user.id);
    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
}
