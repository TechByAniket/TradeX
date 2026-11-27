import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getApiErrorMessage } from "@/services/apiClient";
import {
  fetchMarketStocks,
  fetchNseStatus,
  triggerNseRefresh,
} from "@/services/marketService";
import { getMarketSocket } from "@/services/socketService";
import type { MarketSocketPayload, MarketStock } from "@/types/market";

export type SocketConnectionStatus =
  | "connecting"
  | "live"
  | "reconnecting"
  | "offline";

export interface NseRefreshNotice {
  type: "success" | "error";
  message: string;
  updatedCount?: number;
  failedCount?: number;
  fetchedAt?: string | null;
}

interface MarketContextValue {
  stocks: MarketStock[];
  stockBySymbol: Record<string, MarketStock>;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  simulated: boolean;
  connectionStatus: SocketConnectionStatus;
  nseRefreshing: boolean;
  lastNseFetchAt: string | null;
  nseUpdatedInSession: boolean;
  nseNotice: NseRefreshNotice | null;
  refreshStocks: () => Promise<void>;
  refreshLiveNsePrices: () => Promise<void>;
  dismissNseNotice: () => void;
}

const MarketContext = createContext<MarketContextValue | null>(null);

function findLatestNseFetchAt(stocks: MarketStock[]): string | null {
  let latestMs = 0;
  let latestIso: string | null = null;
  for (const s of stocks) {
    if (!s.nseQuoteFetchedAt) continue;
    const ms = new Date(s.nseQuoteFetchedAt).getTime();
    if (Number.isFinite(ms) && ms > latestMs) {
      latestMs = ms;
      latestIso = s.nseQuoteFetchedAt;
    }
  }
  return latestIso;
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const [stocks, setStocks] = useState<MarketStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(true);
  const [connectionStatus, setConnectionStatus] =
    useState<SocketConnectionStatus>("connecting");

  const [nseRefreshing, setNseRefreshing] = useState(false);
  const [lastNseFetchAt, setLastNseFetchAt] = useState<string | null>(null);
  const [nseUpdatedInSession, setNseUpdatedInSession] = useState(false);
  const [nseNotice, setNseNotice] = useState<NseRefreshNotice | null>(null);
  const nseRefreshingRef = useRef(false);

  const applyMarketPayload = useCallback(
    (incomingStocks: MarketStock[], timestamp?: string, isSim = true) => {
      setStocks(incomingStocks);
      setSimulated(isSim);
      if (timestamp) {
        setLastUpdated(timestamp);
      } else if (incomingStocks[0]?.lastUpdated) {
        setLastUpdated(incomingStocks[0].lastUpdated);
      }
      const stockFetchAt = findLatestNseFetchAt(incomingStocks);
      if (stockFetchAt) {
        setLastNseFetchAt((prev) => prev || stockFetchAt);
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

  const refreshLiveNsePrices = useCallback(async () => {
    if (nseRefreshingRef.current) return;

    nseRefreshingRef.current = true;
    setNseRefreshing(true);
    setNseNotice(null);

    try {
      const result = await triggerNseRefresh();
      if (result.fetchedAt) {
        setLastNseFetchAt(result.fetchedAt);
      }

      if (result.updatedCount > 0) {
        setNseUpdatedInSession(true);
      }

      const message =
        result.updatedCount === 0
          ? "No NSE stocks could be updated. Existing simulated market remains active."
          : result.failedCount > 0
            ? `Updated ${result.updatedCount} NSE reference prices (${result.failedCount} failed). Simulation continues from updated prices.`
            : `Updated ${result.updatedCount} NSE reference prices. Simulation continues from updated prices.`;

      setNseNotice({
        type: result.updatedCount > 0 ? "success" : "error",
        message,
        updatedCount: result.updatedCount,
        failedCount: result.failedCount,
        fetchedAt: result.fetchedAt,
      });

      await refreshStocks();
    } catch (err) {
      setNseNotice({
        type: "error",
        message: getApiErrorMessage(
          err,
          "Unable to fetch NSE snapshot. Simulation continues normally."
        ),
      });
    } finally {
      nseRefreshingRef.current = false;
      setNseRefreshing(false);
    }
  }, [refreshStocks]);

  const dismissNseNotice = useCallback(() => {
    setNseNotice(null);
  }, []);

  useEffect(() => {
    void refreshStocks();
    void fetchNseStatus()
      .then((status) => {
        if (status.lastFetchedAt) {
          setLastNseFetchAt(status.lastFetchedAt);
        }
      })
      .catch(() => {
        // Non-blocking status lookup
      });

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
      nseRefreshing,
      lastNseFetchAt,
      nseUpdatedInSession,
      nseNotice,
      refreshStocks,
      refreshLiveNsePrices,
      dismissNseNotice,
    }),
    [
      stocks,
      stockBySymbol,
      loading,
      error,
      lastUpdated,
      simulated,
      connectionStatus,
      nseRefreshing,
      lastNseFetchAt,
      nseUpdatedInSession,
      nseNotice,
      refreshStocks,
      refreshLiveNsePrices,
      dismissNseNotice,
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
