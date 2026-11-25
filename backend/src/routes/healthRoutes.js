import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    error.statusCode = 503;
    error.message = "Database connection failed";
    next(error);
  }
});

export default router;
