import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bookmark,
  ChevronDown,
  Info,
  Minus,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { LivePriceText } from "@/components/common/LivePriceText";
import { MarketBadge } from "@/components/common/MarketBadge";
import { useAuth } from "@/context/AuthContext";
import { useMarket } from "@/context/MarketContext";
import { cn, formatINR, formatPercent } from "@/lib/utils";

const WATCHLIST_PREFIX = "tradex_watchlist_";
const DEFAULT_SYMBOLS = ["RELIANCE", "TCS", "INFY", "HDFCBANK"];

function getStorageKey(userId?: string): string {
  return `${WATCHLIST_PREFIX}${userId ?? "guest"}`;
}

function loadWatchlistSymbols(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_SYMBOLS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === "string");
    }
  } catch {
    // Fallback to defaults if storage contains invalid JSON
  }
  return DEFAULT_SYMBOLS;
}

export function WatchlistPage() {
  const { user } = useAuth();
  const { stocks, stockBySymbol, loading, connectionStatus } = useMarket();
  const storageKey = getStorageKey(user?.id);

  const [symbols, setSymbols] = useState<string[]>(() =>
    loadWatchlistSymbols(storageKey)
  );
  const [selectedSymbol, setSelectedSymbol] = useState("");

  useEffect(() => {
    setSymbols(loadWatchlistSymbols(storageKey));
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(symbols));
  }, [storageKey, symbols]);

  const availableToAdd = useMemo(
    () => stocks.filter((s) => !symbols.includes(s.symbol)),
    [stocks, symbols]
  );

  useEffect(() => {
    if (
      availableToAdd.length > 0 &&
      !availableToAdd.some((s) => s.symbol === selectedSymbol)
    ) {
      setSelectedSymbol(availableToAdd[0].symbol);
    } else if (availableToAdd.length === 0) {
      setSelectedSymbol("");
    }
  }, [availableToAdd, selectedSymbol]);

  const watchedStocks = useMemo(
    () =>
      symbols
        .map((sym) => stockBySymbol[sym])
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    [symbols, stockBySymbol]
  );

  const handleAdd = () => {
    if (!selectedSymbol || symbols.includes(selectedSymbol)) return;
    setSymbols((prev) => [...prev, selectedSymbol]);
  };

  const handleRemove = (symbolToRemove: string) => {
    setSymbols((prev) => prev.filter((sym) => sym !== symbolToRemove));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--tx-border)] pb-6 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.02em] text-[var(--tx-text-muted)]">
            Tracked Equities · Quick Execution
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="tx-heading-page text-2xl sm:text-[26px]">
              Watchlist
            </h1>
            <MarketBadge connectionStatus={connectionStatus} />
          </div>
          <p className="text-[13px] text-[var(--tx-text-secondary)]">
            Monitor preferred stocks with real-time simulated quotes and direct
            order ticket links.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              aria-label="Select stock to add to watchlist"
              disabled={availableToAdd.length === 0}
              className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface-muted)] pr-8 pl-3 text-xs font-medium text-[var(--tx-text)] transition-colors hover:border-[var(--tx-border-hover)] focus:border-[var(--tx-border-hover)] focus:bg-[var(--tx-surface-elevated)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {availableToAdd.length === 0 ? (
                <option value="">All stocks added</option>
              ) : (
                availableToAdd.map((stock) => (
                  <option key={stock.symbol} value={stock.symbol}>
                    {stock.symbol} — {stock.companyName}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--tx-text-muted)]" />
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleAdd}
            disabled={!selectedSymbol}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--tx-border)] bg-[var(--tx-surface)] px-4 py-3 text-xs text-[var(--tx-text-secondary)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tx-text-muted)]" />
        <span>
          Watchlist selections are stored locally in this browser (backend
          watchlist sync API is not implemented yet). Market prices stream live
          from the backend.
        </span>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[var(--tx-border)] pb-4">
          <CardTitle className="tx-heading-section">
            Tracked Symbols ({watchedStocks.length})
          </CardTitle>
          <CardDescription>
            Select any row to inspect intraday charts or open BUY / SELL orders
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 sm:px-0">
          {loading && stocks.length === 0 ? (
            <div className="space-y-2.5 p-5 sm:p-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-11 w-full animate-pulse rounded-lg bg-[var(--tx-surface-elevated)]"
                />
              ))}
            </div>
          ) : watchedStocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-14 text-center">
              <Bookmark className="h-5 w-5 text-[var(--tx-text-muted)]" />
              <p className="text-[13px] text-[var(--tx-text-secondary)]">
                Your watchlist is empty. Select a stock above to start tracking.
              </p>
            </div>
          ) : (
            <div className="max-h-[480px] overflow-auto tx-scrollbar">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead className="sticky top-0 z-10 border-b border-[var(--tx-border)] bg-[var(--tx-surface-muted)]/95 backdrop-blur-xs">
                  <tr>
                    <th className="tx-label px-5 py-3.5 sm:px-6">Company</th>
                    <th className="tx-label px-4 py-3.5">Symbol</th>
                    <th className="tx-label px-4 py-3.5 text-right">Price</th>
                    <th className="tx-label px-4 py-3.5 text-right">Change</th>
                    <th className="tx-label px-4 py-3.5 text-right">
                      Change %
                    </th>
                    <th className="tx-label px-5 py-3.5 text-right sm:px-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--tx-border)]">
                  {watchedStocks.map((stock) => {
                    const isUp = stock.change > 0;
                    const isDown = stock.change < 0;

                    return (
                      <tr
                        key={stock.id}
                        className="group transition-colors duration-150 hover:bg-[var(--tx-surface-hover)]"
                      >
                        <td className="px-5 py-3.5 sm:px-6">
                          <Link
                            to={`/stocks/${stock.symbol}`}
                            className="block truncate text-[13px] font-medium text-[var(--tx-text)] transition-opacity group-hover:opacity-90"
                          >
                            {stock.companyName}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            to={`/stocks/${stock.symbol}`}
                            className="text-xs font-semibold tracking-[0.06em] text-[var(--tx-text-secondary)] transition-colors hover:text-[var(--tx-text)]"
                          >
                            {stock.symbol}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-right text-[13px] font-semibold tabular-nums text-[var(--tx-text)]">
                          <LivePriceText price={stock.currentPrice} />
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3.5 text-right text-[13px] font-medium tabular-nums",
                            isUp
                              ? "text-[var(--tx-gain)]"
                              : isDown
                                ? "text-[var(--tx-loss)]"
                                : "text-[var(--tx-text-muted)]"
                          )}
                        >
                          {isUp ? "+" : ""}
                          {formatINR(stock.change)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Badge
                            variant={isUp ? "gain" : isDown ? "loss" : "neutral"}
                            size="sm"
                          >
                            {isUp ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : isDown ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                            {formatPercent(stock.changePercent)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right sm:px-6">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <Link to={`/stocks/${stock.symbol}?action=buy`}>
                              <Button
                                variant="primary"
                                size="sm"
                                className="h-7 px-2.5 text-[11px]"
                              >
                                BUY
                              </Button>
                            </Link>
                            <Link to={`/stocks/${stock.symbol}?action=sell`}>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 px-2.5 text-[11px]"
                              >
                                SELL
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(stock.symbol)}
                              aria-label={`Remove ${stock.symbol} from watchlist`}
                              className="h-7 w-7 p-0 text-[var(--tx-text-muted)] hover:text-[var(--tx-loss)]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
