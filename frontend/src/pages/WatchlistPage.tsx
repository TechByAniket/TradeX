import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Info,
  Minus,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
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
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end dark:border-slate-800">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
              Watchlist
            </h1>
            <MarketBadge connectionStatus={connectionStatus} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track your selected stocks with live simulated prices and quick
            trade access.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            aria-label="Select stock to add to watchlist"
            disabled={availableToAdd.length === 0}
            className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none disabled:opacity-50 sm:w-64 sm:flex-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
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

      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <span>
          Watchlist selections are saved locally in this browser (backend
          watchlist sync API is not implemented yet). Market prices update live
          from the backend.
        </span>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800/80">
          <CardTitle>Tracked Symbols ({watchedStocks.length})</CardTitle>
          <CardDescription>
            Click any stock to view its chart or place BUY / SELL orders
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading && stocks.length === 0 ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-11 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70"
                />
              ))}
            </div>
          ) : watchedStocks.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Your watchlist is empty. Select a stock above to start tracking.
            </div>
          ) : (
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-3.5">Company</th>
                    <th className="px-4 py-3.5">Symbol</th>
                    <th className="px-4 py-3.5 text-right">Current Price</th>
                    <th className="px-4 py-3.5 text-right">Change</th>
                    <th className="px-4 py-3.5 text-right">Change %</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {watchedStocks.map((stock) => {
                    const isUp = stock.change > 0;
                    const isDown = stock.change < 0;

                    return (
                      <tr
                        key={stock.id}
                        className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-6 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                          <Link
                            to={`/stocks/${stock.symbol}`}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {stock.companyName}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            to={`/stocks/${stock.symbol}`}
                            className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {stock.symbol}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                          {formatINR(stock.currentPrice)}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3.5 text-right font-medium tabular-nums",
                            isUp
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isDown
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-slate-500 dark:text-slate-400"
                          )}
                        >
                          {isUp ? "+" : ""}
                          {formatINR(stock.change)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={cn(
                              "inline-flex items-center justify-end gap-1 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
                              isUp
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : isDown
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            )}
                          >
                            {isUp ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : isDown ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                            {formatPercent(stock.changePercent)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <Link to={`/stocks/${stock.symbol}?action=buy`}>
                              <Button variant="primary" size="sm">
                                BUY
                              </Button>
                            </Link>
                            <Link to={`/stocks/${stock.symbol}?action=sell`}>
                              <Button variant="outline" size="sm">
                                SELL
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(stock.symbol)}
                              aria-label={`Remove ${stock.symbol} from watchlist`}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-slate-500 hover:text-rose-600" />
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
