import { io, type Socket } from "socket.io-client";
import { ENV } from "@/lib/env";

let socketInstance: Socket | null = null;

export function getMarketSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(ENV.socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 10000,
    });
  }
  return socketInstance;
}
