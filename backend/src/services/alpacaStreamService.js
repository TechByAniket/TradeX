import WebSocket from "ws";

const ALPACA_STREAM_BASE_URL = "wss://stream.data.alpaca.markets/v2";
const MAX_RECONNECT_DELAY_MS = 30000;
const BASE_RECONNECT_DELAY_MS = 2000;

export function startAlpacaMarketStream({
  apiKey = process.env.ALPACA_API_KEY,
  apiSecret = process.env.ALPACA_API_SECRET,
  feed = process.env.ALPACA_DATA_FEED || "iex",
  symbols = ["AAPL"],
  autoReconnect = true,
  onAuthenticated,
  onSubscribed,
  onEvent,
  onError,
} = {}) {
  const key = apiKey?.trim();
  const secret = apiSecret?.trim();
  const dataFeed = (feed || "iex").trim().toLowerCase();

  if (!key || !secret) {
    const err = new Error(
      "Missing ALPACA_API_KEY or ALPACA_API_SECRET in environment variables"
    );
    console.error(`[Alpaca] ${err.message}`);
    onError?.(err);
    return {
      stop: () => {},
    };
  }

  const wsUrl = `${ALPACA_STREAM_BASE_URL}/${dataFeed}`;
  let ws = null;
  let stopped = false;
  let shouldReconnect = autoReconnect;
  let reconnectAttempts = 0;
  let reconnectTimer = null;

  function scheduleReconnect() {
    if (stopped || !shouldReconnect || reconnectTimer) {
      return;
    }

    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttempts,
      MAX_RECONNECT_DELAY_MS
    );
    reconnectAttempts += 1;

    console.log(`[Alpaca] Reconnecting in ${Math.round(delay / 1000)}s...`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function handleMessage(item) {
    if (!item || typeof item !== "object") return;

    if (item.T === "success") {
      if (item.msg === "connected") {
        console.log(`[Alpaca] Connected to ${wsUrl}. Authenticating...`);
        ws.send(
          JSON.stringify({
            action: "auth",
            key,
            secret,
          })
        );
      } else if (item.msg === "authenticated") {
        reconnectAttempts = 0;
        console.log("[Alpaca] Authentication succeeded.");
        onAuthenticated?.();

        ws.send(
          JSON.stringify({
            action: "subscribe",
            trades: symbols,
            quotes: symbols,
          })
        );
      }
      return;
    }

    if (item.T === "subscription") {
      const trades = (item.trades || []).join(", ") || "none";
      const quotes = (item.quotes || []).join(", ") || "none";
      console.log(
        `[Alpaca] Subscription active — trades: [${trades}], quotes: [${quotes}]`
      );
      onSubscribed?.(item);
      return;
    }

    if (item.T === "t" || item.T === "T") {
      console.log(
        `[Alpaca Trade] Symbol: ${item.S} | Price: $${item.p} | Size: ${item.s} | Timestamp: ${item.t}`
      );
      onEvent?.({
        type: "trade",
        symbol: item.S,
        price: item.p,
        size: item.s,
        timestamp: item.t,
      });
      return;
    }

    if (item.T === "q" || item.T === "Q") {
      console.log(
        `[Alpaca Quote] Symbol: ${item.S} | Bid: $${item.bp} | Ask: $${item.ap} | Timestamp: ${item.t}`
      );
      onEvent?.({
        type: "quote",
        symbol: item.S,
        bidPrice: item.bp,
        askPrice: item.ap,
        timestamp: item.t,
      });
      return;
    }

    if (item.T === "error") {
      const errorMsg = `Alpaca error (${item.code ?? "unknown"}): ${item.msg}`;
      console.error(`[Alpaca] ${errorMsg}`);
      const err = new Error(errorMsg);
      err.code = item.code;

      const isAuthError =
        [401, 402, 403].includes(item.code) || /auth/i.test(item.msg || "");
      const isConnectionLimit = item.code === 406;

      if (isAuthError || isConnectionLimit) {
        shouldReconnect = false;
        if (isConnectionLimit) {
          console.error(
            "[Alpaca] Another WebSocket connection is already active for this API key. Close the other connection and restart."
          );
        }
        ws?.close(1000, item.msg || "Stream error");
      }

      onError?.(err);
    }
  }

  function connect() {
    if (stopped) return;

    ws = new WebSocket(wsUrl);

    ws.on("open", () => {
      console.log(`[Alpaca] WebSocket open (${wsUrl})`);
    });

    ws.on("message", (raw) => {
      const rawMessage = raw.toString();
      console.log("[Alpaca Debug] Raw message:", rawMessage);

      try {
        const parsed = JSON.parse(rawMessage);
        const messages = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of messages) {
          handleMessage(item);
        }
      } catch (error) {
        console.error("[Alpaca] Failed to parse message:", error.message);
      }
    });

    ws.on("error", (error) => {
      console.error(`[Alpaca] WebSocket error: ${error.message}`);
      onError?.(error);
    });

    ws.on("close", (code, reasonBuffer) => {
      const reason = reasonBuffer?.toString() || "none";
      console.log(`[Alpaca] Disconnected (code: ${code}, reason: ${reason})`);
      scheduleReconnect();
    });
  }

  connect();

  return {
    stop() {
      stopped = true;
      shouldReconnect = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close(1000, "Client shutdown");
      }
    },
  };
}
