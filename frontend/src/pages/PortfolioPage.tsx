import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Briefcase, Compass, RefreshCw } from "lucide-react";
import { AuthRequiredCard } from "@/components/common/AuthRequiredCard";
import { Badge } from "@/components/common/Badge";
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
        <div className="h-8 w-44 animate-pulse rounded-lg bg-[var(--tx-surface-elevated)]" />
        <div className="h-28 w-full animate-pulse rounded-xl bg-[var(--tx-surface-elevated)]" />
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
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--tx-border)] pb-6 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.02em] text-[var(--tx-text-muted)]">
            Virtual INR Account · Real-Time Valuation
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="tx-heading-page text-2xl sm:text-[26px]">
              My Portfolio
            </h1>
            <MarketBadge connectionStatus={connectionStatus} />
          </div>
          <p className="text-[13px] text-[var(--tx-text-secondary)]">
            Holdings valuation and unrealized P&amp;L updated dynamically from
            the backend simulator.
          </p>
        </div>

        <Button
          variant="secondary"
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
          className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[var(--tx-loss-border)] bg-[var(--tx-loss-bg)] px-4 py-3 text-[13px] text-[var(--tx-loss)] sm:flex-row sm:items-center"
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Card key={idx}>
              <CardContent className="pt-5">
                <div className="h-3 w-24 animate-pulse rounded bg-[var(--tx-surface-elevated)]" />
                <div className="mt-3.5 h-6 w-28 animate-pulse rounded bg-[var(--tx-surface-elevated)]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : liveView ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card interactive>
            <CardHeader className="pb-1.5">
              <CardTitle className="tx-label">Available Cash</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tracking-[-0.02em] tabular-nums text-[var(--tx-text)]">
                {formatINR(liveView.summary.cashBalance)}
              </p>
            </CardContent>
          </Card>

          <Card interactive>
            <CardHeader className="pb-1.5">
              <CardTitle className="tx-label">Invested Value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tracking-[-0.02em] tabular-nums text-[var(--tx-text)]">
                {formatINR(liveView.summary.totalInvestedValue)}
              </p>
            </CardContent>
          </Card>

          <Card interactive>
            <CardHeader className="pb-1.5">
              <CardTitle className="tx-label">Holdings Value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tracking-[-0.02em] tabular-nums text-[var(--tx-text)]">
                {formatINR(liveView.summary.totalCurrentHoldingsValue)}
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" interactive>
            <CardHeader className="pb-1.5">
              <CardTitle className="tx-label">Total Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold tracking-[-0.02em] tabular-nums text-[var(--tx-text)]">
                {formatINR(liveView.summary.totalPortfolioValue)}
              </p>
            </CardContent>
          </Card>

          <Card variant="glass" interactive>
            <CardHeader className="pb-1.5">
              <CardTitle className="tx-label">Unrealized P&amp;L</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <p
                className={cn(
                  "text-xl font-bold tracking-[-0.02em] tabular-nums",
                  pnlPositive
                    ? "text-[var(--tx-gain)]"
                    : pnlNegative
                      ? "text-[var(--tx-loss)]"
                      : "text-[var(--tx-text)]"
                )}
              >
                {pnlPositive ? "+" : ""}
                {formatINR(liveView.summary.totalUnrealizedPnl)}
              </p>
              <Badge
                variant={
                  pnlPositive ? "gain" : pnlNegative ? "loss" : "neutral"
                }
                size="sm"
              >
                {formatPercent(liveView.summary.totalUnrealizedPnlPercent)}
              </Badge>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Holdings Table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[var(--tx-border)] pb-4">
          <CardTitle className="tx-heading-section">Stock Holdings</CardTitle>
          <CardDescription>
            {liveView
              ? `${liveView.holdings.length} active ${liveView.holdings.length === 1 ? "position" : "positions"}`
              : "Your current stock positions"}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 sm:px-0">
          {loading && !liveView ? (
            <div className="space-y-2.5 p-5 sm:p-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-10 w-full animate-pulse rounded-lg bg-[var(--tx-surface-elevated)]"
                />
              ))}
            </div>
          ) : !liveView || liveView.holdings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--tx-border)] bg-[var(--tx-surface-elevated)] text-[var(--tx-text-muted)]">
                <Briefcase className="h-4 w-4" />
              </span>
              <p className="text-[13px] text-[var(--tx-text-secondary)]">
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
            <div className="max-h-[460px] overflow-auto tx-scrollbar">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead className="sticky top-0 z-10 border-b border-[var(--tx-border)] bg-[var(--tx-surface-muted)]/95 backdrop-blur-xs">
                  <tr>
                    <th className="tx-label px-5 py-3.5 sm:px-6">Stock</th>
                    <th className="tx-label px-4 py-3.5">Symbol</th>
                    <th className="tx-label px-4 py-3.5 text-right">
                      Quantity
                    </th>
                    <th className="tx-label px-4 py-3.5 text-right">
                      Avg Buy Price
                    </th>
                    <th className="tx-label px-4 py-3.5 text-right">
                      Current Price
                    </th>
                    <th className="tx-label px-4 py-3.5 text-right">
                      Invested Value
                    </th>
                    <th className="tx-label px-4 py-3.5 text-right">
                      Current Value
                    </th>
                    <th className="tx-label px-5 py-3.5 text-right sm:px-6">
                      P&amp;L
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--tx-border)]">
                  {liveView.holdings.map((holding) => {
                    const isUp = holding.unrealizedPnl > 0;
                    const isDown = holding.unrealizedPnl < 0;

                    return (
                      <tr
                        key={holding.stockId}
                        className="group transition-colors duration-150 hover:bg-[var(--tx-surface-hover)]"
                      >
                        <td className="px-5 py-3.5 sm:px-6">
                          <Link
                            to={`/stocks/${holding.symbol}?action=sell`}
                            className="block truncate text-[13px] font-medium text-[var(--tx-text)] transition-opacity group-hover:opacity-90"
                          >
                            {holding.companyName}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            to={`/stocks/${holding.symbol}?action=sell`}
                            className="text-xs font-semibold tracking-[0.06em] text-[var(--tx-text-secondary)] transition-colors hover:text-[var(--tx-text)]"
                          >
                            {holding.symbol}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-right text-[13px] font-medium tabular-nums text-[var(--tx-text)]">
                          {formatNumber(holding.quantity)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-[13px] tabular-nums text-[var(--tx-text-secondary)]">
                          {formatINR(holding.averageBuyPrice)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-[13px] font-semibold tabular-nums text-[var(--tx-text)]">
                          {formatINR(holding.currentPrice)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-[13px] tabular-nums text-[var(--tx-text-secondary)]">
                          {formatINR(holding.investedValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-[13px] font-semibold tabular-nums text-[var(--tx-text)]">
                          {formatINR(holding.currentValue)}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums sm:px-6">
                          <p
                            className={cn(
                              "text-[13px] font-semibold",
                              isUp
                                ? "text-[var(--tx-gain)]"
                                : isDown
                                  ? "text-[var(--tx-loss)]"
                                  : "text-[var(--tx-text-muted)]"
                            )}
                          >
                            {isUp ? "+" : ""}
                            {formatINR(holding.unrealizedPnl)}
                          </p>
                          <p
                            className={cn(
                              "text-[11px] font-medium",
                              isUp
                                ? "text-[var(--tx-gain)]"
                                : isDown
                                  ? "text-[var(--tx-loss)]"
                                  : "text-[var(--tx-text-muted)]"
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
