import { Router } from "express";
import { googleAuth, getMe, login, register } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.get("/me", authenticate, getMe);

export default router;
