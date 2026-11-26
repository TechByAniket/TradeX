import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { MarketBadge } from "@/components/common/MarketBadge";
import { useMarket } from "@/context/MarketContext";
import { StockPriceChart } from "@/features/stocks/StockPriceChart";
import { OrderTicket } from "@/features/trading/OrderTicket";
import { cn, formatINR, formatNumber, formatPercent } from "@/lib/utils";
import { getApiErrorMessage } from "@/services/apiClient";
import { fetchStockBySymbol, fetchStockHistory } from "@/services/marketService";
import type { MarketStock, StockHistoryPoint } from "@/types/market";

const MAX_CHART_POINTS = 500;

function formatLastUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function StockDetailsPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const [searchParams] = useSearchParams();
  const initialSide =
    searchParams.get("action")?.toUpperCase() === "SELL" ? "SELL" : "BUY";
  const normalizedSymbol = (symbol || "").trim().toUpperCase();

  const { stockBySymbol, connectionStatus } = useMarket();
  const liveStock = normalizedSymbol
    ? stockBySymbol[normalizedSymbol]
    : undefined;

  const [fetchedStock, setFetchedStock] = useState<MarketStock | null>(null);
  const [stockLoading, setStockLoading] = useState(!liveStock);
  const [stockError, setStockError] = useState<string | null>(null);

  const [history, setHistory] = useState<StockHistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const stock = liveStock ?? fetchedStock;

  useEffect(() => {
    if (!normalizedSymbol) {
      setStockError("Stock symbol is required");
      setStockLoading(false);
      setHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setFetchedStock(null);
    setStockError(null);
    setHistory([]);
    setHistoryError(null);
    setStockLoading(!liveStock);
    setHistoryLoading(true);

    fetchStockBySymbol(normalizedSymbol)
      .then((res) => {
        if (!cancelled) {
          setFetchedStock(res.stock);
          setStockError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStockError(
            getApiErrorMessage(err, `Unable to load stock ${normalizedSymbol}`)
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStockLoading(false);
        }
      });

    fetchStockHistory(normalizedSymbol)
      .then((res) => {
        if (!cancelled) {
          setHistory(res.history);
          setHistoryError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setHistoryError(
            getApiErrorMessage(err, "Unable to load price history")
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // Intentionally keyed only on symbol change so live ticks don't re-trigger REST fetches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedSymbol]);

  useEffect(() => {
    if (!liveStock) return;

    setHistory((prev) => {
      const lastPoint = prev[prev.length - 1];
      if (lastPoint && lastPoint.timestamp === liveStock.lastUpdated) {
        return prev;
      }

      const next = [
        ...prev,
        {
          price: liveStock.currentPrice,
          timestamp: liveStock.lastUpdated,
        },
      ];

      if (next.length > MAX_CHART_POINTS) {
        return next.slice(next.length - MAX_CHART_POINTS);
      }
      return next;
    });
  }, [liveStock]);

  if (stockLoading && !stock) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-28 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-72 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (!stock && stockError) {
    return (
      <div className="space-y-4">
        <Link
          to="/stocks"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Explore Stocks
        </Link>

        <Card>
          <CardContent className="flex flex-col items-start gap-4 pt-6">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-5 w-5" />
              <h1 className="text-lg font-semibold">Stock unavailable</h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {stockError}
            </p>
            <Link to="/stocks">
              <Button variant="primary" size="sm">
                Browse supported stocks
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stock) {
    return null;
  }

  const isUp = stock.change > 0;
  const isDown = stock.change < 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/stocks"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Explore Stocks
        </Link>
        <MarketBadge connectionStatus={connectionStatus} />
      </div>

      {/* Price Header */}
      <Card>
        <CardContent className="flex flex-col justify-between gap-4 pt-6 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {stock.companyName}
              </h1>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {stock.symbol}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {stock.exchange} · {stock.currency} · Last updated{" "}
              <span className="tabular-nums">
                {formatLastUpdated(stock.lastUpdated)}
              </span>
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
              {formatINR(stock.currentPrice)}
            </p>
            <div className="mt-1 inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
                  isUp
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isDown
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-500 dark:text-slate-400"
                )}
              >
                {isUp ? (
                  <TrendingUp className="h-4 w-4" />
                ) : isDown ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                {isUp ? "+" : ""}
                {formatINR(stock.change)} ({formatPercent(stock.changePercent)})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supported Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Previous Close
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-50">
              {formatINR(stock.previousClose)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Day High
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-50">
              {formatINR(stock.dayHigh)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Day Low
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-50">
              {formatINR(stock.dayLow)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-50">
              {formatNumber(stock.volume)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Price Chart + Trading Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StockPriceChart
            symbol={stock.symbol}
            history={history}
            loading={historyLoading}
            isPositive={!isDown}
            error={historyError}
          />
        </div>
        <div>
          <OrderTicket stock={stock} initialSide={initialSide} />
        </div>
      </div>
    </div>
  );
}
