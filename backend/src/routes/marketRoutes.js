import { Router } from "express";
import {
  getAllStocks,
  getNseStatus,
  getStockBySymbol,
  getStockHistory,
  refreshNseMarketPrices,
} from "../controllers/marketController.js";

const router = Router();

router.get("/stocks", getAllStocks);
router.get("/stocks/:symbol", getStockBySymbol);
router.get("/stocks/:symbol/history", getStockHistory);
router.get("/nse-status", getNseStatus);
router.post("/nse-refresh", refreshNseMarketPrices);

export default router;
