import { Router } from "express";
import {
  getAllStocks,
  getStockBySymbol,
  getStockHistory,
} from "../controllers/marketController.js";

const router = Router();

router.get("/stocks", getAllStocks);
router.get("/stocks/:symbol", getStockBySymbol);
router.get("/stocks/:symbol/history", getStockHistory);

export default router;
