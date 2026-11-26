import { Link } from "react-router-dom";
import { AlertCircle, Briefcase, Compass, RefreshCw } from "lucide-react";
import { Button } from "@/components/common/Button";
import { MarketBadge } from "@/components/common/MarketBadge";
import { useAuth } from "@/context/AuthContext";
import { useMarket } from "@/context/MarketContext";
import { MarketMoversCard } from "@/features/dashboard/MarketMoversCard";
import { MarketSummaryCards } from "@/features/dashboard/MarketSummaryCards";
import { WatchlistPreviewTable } from "@/features/dashboard/WatchlistPreviewTable";

function formatTodayDate(): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export function OverviewPage() {
  const { user } = useAuth();
  const {
    stocks,
    loading,
    error,
    lastUpdated,
    connectionStatus,
    refreshStocks,
  } = useMarket();

  return (
    <div className="space-y-6">
      {/* Welcome header & primary actions */}
      <div className="flex flex-col justify-between gap-5 border-b border-[var(--tx-border)] pb-6 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.02em] text-[var(--tx-text-muted)]">
            {formatTodayDate()} · NSE Simulated Desk
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="tx-heading-page text-2xl sm:text-[26px]">
              {user ? `Welcome back, ${user.name}` : "TradeX Market Desk"}
            </h1>
            <MarketBadge connectionStatus={connectionStatus} />
          </div>
          <p className="max-w-2xl text-[13px] leading-relaxed text-[var(--tx-text-secondary)]">
            Real-time simulated NSE equity quotes and virtual INR order
            execution backed by live Socket.IO updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/stocks">
            <Button variant="primary" size="md">
              <Compass className="h-4 w-4" />
              Explore Stocks
            </Button>
          </Link>
          <Link to="/portfolio">
            <Button variant="secondary" size="md">
              <Briefcase className="h-4 w-4" />
              View Portfolio
            </Button>
          </Link>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[var(--tx-loss-border)] bg-[var(--tx-loss-bg)] px-4 py-3 text-[13px] text-[var(--tx-loss)] sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refreshStocks();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Market summary cards */}
      <MarketSummaryCards
        stocks={stocks}
        loading={loading}
        lastUpdated={lastUpdated}
        connectionStatus={connectionStatus}
      />

      {/* Market watchlist preview & market movers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <WatchlistPreviewTable stocks={stocks} loading={loading} />
        </div>
        <div className="lg:col-span-4">
          <MarketMoversCard stocks={stocks} loading={loading} />
        </div>
      </div>
    </div>
  );
}
