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
      {/* A. Welcome section + E. Quick actions */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end dark:border-slate-800">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
              {user ? `Welcome back, ${user.name}` : "Welcome to TradeX"}
            </h1>
            <MarketBadge connectionStatus={connectionStatus} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatTodayDate()} · Live simulated NSE market overview
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
            <Button variant="outline" size="md">
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
          className="flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
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

      {/* B. Compact Market Overview */}
      <MarketSummaryCards
        stocks={stocks}
        loading={loading}
        lastUpdated={lastUpdated}
        connectionStatus={connectionStatus}
      />

      {/* C. Stock Watchlist Preview + D. Market Movers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WatchlistPreviewTable stocks={stocks} loading={loading} />
        </div>
        <div>
          <MarketMoversCard stocks={stocks} loading={loading} />
        </div>
      </div>
    </div>
  );
}
