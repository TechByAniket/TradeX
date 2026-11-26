import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getApiErrorMessage } from "@/services/apiClient";
import { fetchMarketStocks } from "@/services/marketService";
import { getMarketSocket } from "@/services/socketService";
import type { MarketSocketPayload, MarketStock } from "@/types/market";

export type SocketConnectionStatus =
  | "connecting"
  | "live"
  | "reconnecting"
  | "offline";

interface MarketContextValue {
  stocks: MarketStock[];
  stockBySymbol: Record<string, MarketStock>;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  simulated: boolean;
  connectionStatus: SocketConnectionStatus;
  refreshStocks: () => Promise<void>;
}

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const [stocks, setStocks] = useState<MarketStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(true);
  const [connectionStatus, setConnectionStatus] =
    useState<SocketConnectionStatus>("connecting");

  const applyMarketPayload = useCallback(
    (incomingStocks: MarketStock[], timestamp?: string, isSim = true) => {
      setStocks(incomingStocks);
      setSimulated(isSim);
      if (timestamp) {
        setLastUpdated(timestamp);
      } else if (incomingStocks[0]?.lastUpdated) {
        setLastUpdated(incomingStocks[0].lastUpdated);
      }
      setError(null);
      setLoading(false);
    },
    []
  );

  const refreshStocks = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchMarketStocks();
      applyMarketPayload(res.stocks, res.stocks[0]?.lastUpdated, res.simulated);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Unable to load simulated market data.")
      );
      setLoading(false);
    }
  }, [applyMarketPayload]);

  useEffect(() => {
    void refreshStocks();

    const socket = getMarketSocket();

    const handleConnect = () => {
      setConnectionStatus("live");
      socket.emit("market:subscribe");
    };

    const handleDisconnect = () => {
      setConnectionStatus("reconnecting");
    };

    const handleConnectError = () => {
      setConnectionStatus("offline");
    };

    const handleMarketUpdate = (payload: MarketSocketPayload) => {
      if (Array.isArray(payload?.stocks)) {
        applyMarketPayload(
          payload.stocks,
          payload.timestamp,
          payload.simulated ?? true
        );
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("market:snapshot", handleMarketUpdate);
    socket.on("market:price_update", handleMarketUpdate);

    if (!socket.connected) {
      socket.connect();
    } else {
      setConnectionStatus("live");
      socket.emit("market:subscribe");
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("market:snapshot", handleMarketUpdate);
      socket.off("market:price_update", handleMarketUpdate);
      socket.disconnect();
    };
  }, [applyMarketPayload, refreshStocks]);

  const stockBySymbol = useMemo(() => {
    const map: Record<string, MarketStock> = {};
    for (const stock of stocks) {
      map[stock.symbol] = stock;
    }
    return map;
  }, [stocks]);

  const value = useMemo(
    () => ({
      stocks,
      stockBySymbol,
      loading,
      error,
      lastUpdated,
      simulated,
      connectionStatus,
      refreshStocks,
    }),
    [
      stocks,
      stockBySymbol,
      loading,
      error,
      lastUpdated,
      simulated,
      connectionStatus,
      refreshStocks,
    ]
  );

  return (
    <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
  );
}

export function useMarket(): MarketContextValue {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error("useMarket must be used within MarketProvider");
  }
  return context;
}
