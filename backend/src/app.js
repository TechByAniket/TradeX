import express from "express";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import marketRoutes from "./routes/marketRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/orders", orderRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
