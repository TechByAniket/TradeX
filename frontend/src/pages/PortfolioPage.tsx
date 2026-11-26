import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Compass, RefreshCw } from "lucide-react";
import { AuthRequiredCard } from "@/components/common/AuthRequiredCard";
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
import { cn, formatINR, formatNumber, formatPercent } from "@/lib/utils";
import { getApiErrorMessage } from "@/services/apiClient";
import { fetchPortfolio } from "@/services/tradingService";
import type { PortfolioResponse } from "@/types/trading";

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function PortfolioPage() {
  const { user, authLoading } = useAuth();
  const { stockBySymbol, connectionStatus } = useMarket();

  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolio = useCallback(async () => {
    if (!user) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetchPortfolio();
      setData(response);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load portfolio data."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  const liveView = useMemo(() => {
    if (!data) return null;

    let totalInvested = 0;
    let totalCurrent = 0;

    const holdings = data.holdings.map((holding) => {
      const liveMarketPrice = stockBySymbol[holding.symbol]?.currentPrice;
      const currentPrice =
        liveMarketPrice !== undefined ? liveMarketPrice : holding.currentPrice;
      const currentValue = round2(currentPrice * holding.quantity);
      const unrealizedPnl = round2(currentValue - holding.investedValue);
      const unrealizedPnlPercent =
        holding.investedValue > 0
          ? round2((unrealizedPnl / holding.investedValue) * 100)
          : 0;

      totalInvested = round2(totalInvested + holding.investedValue);
      totalCurrent = round2(totalCurrent + currentValue);

      return {
        ...holding,
        currentPrice,
        currentValue,
        unrealizedPnl,
        unrealizedPnlPercent,
      };
    });

    const cashBalance = data.portfolio.cashBalance;
    const totalPortfolioValue = round2(cashBalance + totalCurrent);
    const totalUnrealizedPnl = round2(totalCurrent - totalInvested);
    const totalUnrealizedPnlPercent =
      totalInvested > 0
        ? round2((totalUnrealizedPnl / totalInvested) * 100)
        : 0;

    return {
      summary: {
        cashBalance,
        totalInvestedValue: totalInvested,
        totalCurrentHoldingsValue: totalCurrent,
        totalPortfolioValue,
        totalUnrealizedPnl,
        totalUnrealizedPnlPercent,
      },
      holdings,
    };
  }, [data, stockBySymbol]);

  if (authLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-28 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (!user) {
    return (
      <AuthRequiredCard
        title="Sign in to view My Portfolio"
        description="Sign in with your TradeX account to inspect your virtual cash balance, holdings, and unrealized P&L."
      />
    );
  }

  const pnlPositive = (liveView?.summary.totalUnrealizedPnl ?? 0) > 0;
  const pnlNegative = (liveView?.summary.totalUnrealizedPnl ?? 0) < 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end dark:border-slate-800">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
              My Portfolio
            </h1>
            <MarketBadge connectionStatus={connectionStatus} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Virtual holdings valuation and unrealized P&L updated with live
            simulated prices.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void loadPortfolio();
          }}
          disabled={loading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadPortfolio()}>
            Retry
          </Button>
        </div>
      )}

      {/* Portfolio Summary Cards */}
      {loading && !liveView ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Card key={idx}>
              <CardContent className="pt-5">
                <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-3 h-6 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : liveView ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Available Cash
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                {formatINR(liveView.summary.cashBalance)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Invested Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                {formatINR(liveView.summary.totalInvestedValue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Holdings Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                {formatINR(liveView.summary.totalCurrentHoldingsValue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                {formatINR(liveView.summary.totalPortfolioValue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Unrealized P&amp;L
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  pnlPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : pnlNegative
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-900 dark:text-slate-50"
                )}
              >
                {pnlPositive ? "+" : ""}
                {formatINR(liveView.summary.totalUnrealizedPnl)}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-xs font-medium tabular-nums",
                  pnlPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : pnlNegative
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-500 dark:text-slate-400"
                )}
              >
                {formatPercent(liveView.summary.totalUnrealizedPnlPercent)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Holdings Table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800/80">
          <CardTitle>Stock Holdings</CardTitle>
          <CardDescription>
            {liveView
              ? `${liveView.holdings.length} active ${liveView.holdings.length === 1 ? "position" : "positions"}`
              : "Your current stock positions"}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading && !liveView ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-10 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70"
                />
              ))}
            </div>
          ) : !liveView || liveView.holdings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You do not own any shares yet.
              </p>
              <Link to="/stocks">
                <Button variant="primary" size="sm">
                  <Compass className="h-4 w-4" />
                  Explore Stocks
                </Button>
              </Link>
            </div>
          ) : (
            <div className="max-h-[460px] overflow-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-3.5">Stock</th>
                    <th className="px-4 py-3.5">Symbol</th>
                    <th className="px-4 py-3.5 text-right">Quantity</th>
                    <th className="px-4 py-3.5 text-right">Avg Buy Price</th>
                    <th className="px-4 py-3.5 text-right">Current Price</th>
                    <th className="px-4 py-3.5 text-right">Invested Value</th>
                    <th className="px-4 py-3.5 text-right">Current Value</th>
                    <th className="px-6 py-3.5 text-right">P&amp;L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {liveView.holdings.map((holding) => {
                    const isUp = holding.unrealizedPnl > 0;
                    const isDown = holding.unrealizedPnl < 0;

                    return (
                      <tr
                        key={holding.stockId}
                        className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-6 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                          <Link
                            to={`/stocks/${holding.symbol}?action=sell`}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {holding.companyName}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            to={`/stocks/${holding.symbol}?action=sell`}
                            className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {holding.symbol}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium tabular-nums text-slate-900 dark:text-slate-100">
                          {formatNumber(holding.quantity)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {formatINR(holding.averageBuyPrice)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                          {formatINR(holding.currentPrice)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {formatINR(holding.investedValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                          {formatINR(holding.currentValue)}
                        </td>
                        <td className="px-6 py-3.5 text-right tabular-nums">
                          <p
                            className={cn(
                              "font-semibold",
                              isUp
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isDown
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-slate-500 dark:text-slate-400"
                            )}
                          >
                            {isUp ? "+" : ""}
                            {formatINR(holding.unrealizedPnl)}
                          </p>
                          <p
                            className={cn(
                              "text-xs font-medium",
                              isUp
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isDown
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-slate-500 dark:text-slate-400"
                            )}
                          >
                            {formatPercent(holding.unrealizedPnlPercent)}
                          </p>
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
