import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Minus,
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
import { useMarket } from "@/context/MarketContext";
import { StockPriceChart } from "@/features/stocks/StockPriceChart";
import { OrderTicket } from "@/features/trading/OrderTicket";
import { formatINR, formatNumber, formatPercent } from "@/lib/utils";
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
        <div className="h-6 w-36 animate-pulse rounded-md bg-[var(--tx-surface-elevated)]" />
        <div className="h-32 w-full animate-pulse rounded-xl bg-[var(--tx-surface-elevated)]" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-24 animate-pulse rounded-xl bg-[var(--tx-surface-elevated)]"
            />
          ))}
        </div>
        <div className="h-80 w-full animate-pulse rounded-xl bg-[var(--tx-surface-elevated)]" />
      </div>
    );
  }

  if (!stock && stockError) {
    return (
      <div className="space-y-4">
        <Link
          to="/stocks"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--tx-text-secondary)] transition-colors hover:text-[var(--tx-text)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Explore Stocks
        </Link>

        <Card variant="elevated">
          <CardContent className="flex flex-col items-start gap-4 pt-6">
            <div className="flex items-center gap-2 text-[var(--tx-loss)]">
              <AlertCircle className="h-5 w-5" />
              <h1 className="tx-heading-section text-lg">Stock unavailable</h1>
            </div>
            <p className="text-[13px] text-[var(--tx-text-secondary)]">
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/stocks"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--tx-text-secondary)] transition-colors hover:text-[var(--tx-text)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Explore Stocks
        </Link>
        <MarketBadge connectionStatus={connectionStatus} />
      </div>

      {/* Price Header */}
      <Card variant="elevated">
        <CardContent className="flex flex-col justify-between gap-5 pt-6 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="neutral" size="md">
                {stock.symbol} · {stock.exchange}
              </Badge>
              <span className="text-xs text-[var(--tx-text-muted)]">
                {stock.currency}
              </span>
            </div>
            <h1 className="tx-heading-page text-2xl sm:text-[28px]">
              {stock.companyName}
            </h1>
            <p className="text-xs text-[var(--tx-text-muted)]">
              Last quote update{" "}
              <span className="tabular-nums text-[var(--tx-text-secondary)]">
                {formatLastUpdated(stock.lastUpdated)}
              </span>
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <p className="text-3xl font-bold tracking-[-0.03em] tabular-nums text-[var(--tx-text)] sm:text-[34px]">
              <LivePriceText price={stock.currentPrice} />
            </p>
            <Badge
              variant={isUp ? "gain" : isDown ? "loss" : "neutral"}
              size="md"
            >
              {isUp ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : isDown ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              <span>
                {isUp ? "+" : ""}
                {formatINR(stock.change)} ({formatPercent(stock.changePercent)})
              </span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Price Chart + Trading Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <StockPriceChart
            symbol={stock.symbol}
            history={history}
            loading={historyLoading}
            isPositive={!isDown}
            error={historyError}
          />
        </div>
        <div className="lg:col-span-4">
          <OrderTicket stock={stock} initialSide={initialSide} />
        </div>
      </div>

      {/* Supported Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card interactive>
          <CardHeader className="pb-1">
            <CardTitle className="tx-label">Previous Close</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold tabular-nums text-[var(--tx-text)]">
              {formatINR(stock.previousClose)}
            </p>
          </CardContent>
        </Card>

        <Card interactive>
          <CardHeader className="pb-1">
            <CardTitle className="tx-label">Day High</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold tabular-nums text-[var(--tx-gain)]">
              {formatINR(stock.dayHigh)}
            </p>
          </CardContent>
        </Card>

        <Card interactive>
          <CardHeader className="pb-1">
            <CardTitle className="tx-label">Day Low</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold tabular-nums text-[var(--tx-loss)]">
              {formatINR(stock.dayLow)}
            </p>
          </CardContent>
        </Card>

        <Card interactive>
          <CardHeader className="pb-1">
            <CardTitle className="tx-label">Session Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold tabular-nums text-[var(--tx-text)]">
              {formatNumber(stock.volume)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stored Manual NSE Reference Snapshot */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 border-b border-[var(--tx-border)] pb-4">
          <div>
            <CardTitle className="tx-heading-section">
              NSE Reference Snapshot
            </CardTitle>
            <CardDescription>
              Last manually fetched NSE reference metrics (separate from live
              simulation)
            </CardDescription>
          </div>
          {stock.nseQuoteFetchedAt && (
            <Badge variant="neutral" size="sm">
              Fetched {formatLastUpdated(stock.nseQuoteFetchedAt)}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="pt-5">
          {!stock.nseQuoteFetchedAt && stock.nseReferencePrice == null ? (
            <p className="text-[13px] text-[var(--tx-text-muted)]">
              No NSE snapshot fetched yet. Use{" "}
              <span className="font-semibold text-[var(--tx-text-secondary)]">
                LIVE NSE PRICES
              </span>{" "}
              on the Overview page to load the latest NSE reference data.
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <div className="space-y-1">
                <dt className="tx-label">NSE Reference Price</dt>
                <dd className="text-sm font-semibold tabular-nums text-[var(--tx-text)]">
                  {stock.nseReferencePrice != null
                    ? formatINR(stock.nseReferencePrice)
                    : "—"}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="tx-label">Previous Close</dt>
                <dd className="text-sm font-semibold tabular-nums text-[var(--tx-text)]">
                  {stock.nsePreviousClose != null
                    ? formatINR(stock.nsePreviousClose)
                    : "—"}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="tx-label">Change / %</dt>
                <dd
                  className={
                    (stock.nseChange ?? 0) > 0
                      ? "text-sm font-semibold tabular-nums text-[var(--tx-gain)]"
                      : (stock.nseChange ?? 0) < 0
                        ? "text-sm font-semibold tabular-nums text-[var(--tx-loss)]"
                        : "text-sm font-semibold tabular-nums text-[var(--tx-text)]"
                  }
                >
                  {stock.nseChange != null ? (
                    <>
                      {stock.nseChange > 0 ? "+" : ""}
                      {formatINR(stock.nseChange)}
                      {stock.nsePercentChange != null
                        ? ` (${formatPercent(stock.nsePercentChange)})`
                        : ""}
                    </>
                  ) : stock.nsePercentChange != null ? (
                    formatPercent(stock.nsePercentChange)
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="tx-label">Day Range (Low – High)</dt>
                <dd className="text-sm font-semibold tabular-nums text-[var(--tx-text)]">
                  {stock.nseDayLow != null && stock.nseDayHigh != null
                    ? `${formatINR(stock.nseDayLow)} – ${formatINR(stock.nseDayHigh)}`
                    : "—"}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="tx-label">52W Range (Low – High)</dt>
                <dd className="text-sm font-semibold tabular-nums text-[var(--tx-text)]">
                  {stock.nseYearLow52W != null && stock.nseYearHigh52W != null
                    ? `${formatINR(stock.nseYearLow52W)} – ${formatINR(stock.nseYearHigh52W)}`
                    : "—"}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="tx-label">NSE Volume</dt>
                <dd className="text-sm font-semibold tabular-nums text-[var(--tx-text)]">
                  {stock.nseVolume != null ? formatNumber(stock.nseVolume) : "—"}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="tx-label">Market Cap (Cr)</dt>
                <dd className="text-sm font-semibold tabular-nums text-[var(--tx-text)]">
                  {stock.marketCapCr != null
                    ? `₹${formatNumber(stock.marketCapCr)} Cr`
                    : "—"}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="tx-label">Industry</dt>
                <dd className="truncate text-sm font-medium text-[var(--tx-text)]">
                  {stock.industry || "—"}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
