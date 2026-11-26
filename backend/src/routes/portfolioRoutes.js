import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { getPortfolio, getTransactions } from "../controllers/portfolioController.js";

const router = Router();

router.use(authenticate);

router.get("/", getPortfolio);
router.get("/transactions", getTransactions);

export default router;
