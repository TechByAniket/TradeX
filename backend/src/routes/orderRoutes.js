import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { buyStock, listOrders, sellStock } from "../controllers/orderController.js";

const router = Router();

router.use(authenticate);

router.get("/", listOrders);
router.post("/buy", buyStock);
router.post("/sell", sellStock);

export default router;
