import "dotenv/config";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import prisma from "./config/prisma.js";
import marketDataService from "./services/market/marketDataService.js";

const PORT = process.env.PORT || 5000;

export function attachSocketIO(httpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const sendSnapshot = (socket) => {
    socket.emit("market:snapshot", {
      provider: marketDataService.getProviderName(),
      simulated: marketDataService.isSimulated(),
      stocks: marketDataService.getLatestPrices(),
      timestamp: new Date().toISOString(),
    });
  };

  io.on("connection", (socket) => {
    sendSnapshot(socket);

    socket.on("market:subscribe", () => {
      sendSnapshot(socket);
    });
  });

  return io;
}

async function start() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connected");

    const httpServer = http.createServer(app);
    const io = attachSocketIO(httpServer);

    await marketDataService.start((stocks, timestamp) => {
      io.emit("market:price_update", {
        provider: marketDataService.getProviderName(),
        simulated: marketDataService.isSimulated(),
        stocks,
        timestamp,
      });
    });

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`Received ${signal}. Shutting down...`);
      await marketDataService.stop();
      io.close();
      httpServer.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server:", error.message);
    await marketDataService.stop().catch(() => {});
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

const isMainModule =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  start();
}
