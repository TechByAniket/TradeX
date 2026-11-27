import { Link } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Compass,
  RefreshCw,
  X,
} from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { MarketBadge } from "@/components/common/MarketBadge";
import { useAuth } from "@/context/AuthContext";
import { useMarket } from "@/context/MarketContext";
import { MarketMoversCard } from "@/features/dashboard/MarketMoversCard";
import { MarketQuotesTable } from "@/features/dashboard/MarketQuotesTable";
import { MarketSummaryCards } from "@/features/dashboard/MarketSummaryCards";
import { cn } from "@/lib/utils";

function formatTodayDate(): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function formatSnapshotTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function OverviewPage() {
  const { user } = useAuth();
  const {
    stocks,
    loading,
    error,
    lastUpdated,
    connectionStatus,
    nseRefreshing,
    lastNseFetchAt,
    nseUpdatedInSession,
    nseNotice,
    refreshStocks,
    refreshLiveNsePrices,
    dismissNseNotice,
  } = useMarket();

  return (
    <div className="space-y-6">
      {/* Welcome header & primary actions */}
      <div className="flex flex-col justify-between gap-5 border-b border-[var(--tx-border)] pb-6 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.02em] text-[var(--tx-text-muted)]">
            {formatTodayDate()} · NSE Simulated Desk
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="tx-heading-page text-2xl sm:text-[26px]">
              {user ? `Welcome back, ${user.name}` : "TradeX Market Desk"}
            </h1>
            <MarketBadge connectionStatus={connectionStatus} />
            {nseUpdatedInSession && (
              <Badge variant="gain" size="sm">
                NSE SNAPSHOT UPDATED
              </Badge>
            )}
          </div>
          <p className="max-w-2xl text-[13px] leading-relaxed text-[var(--tx-text-secondary)]">
            Simulated NSE equity ticks in virtual INR.
            {lastNseFetchAt && (
              <span className="ml-1.5 text-[var(--tx-text-muted)] tabular-nums">
                Last NSE snapshot: {formatSnapshotTimestamp(lastNseFetchAt)}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            disabled={nseRefreshing}
            onClick={() => {
              void refreshLiveNsePrices();
            }}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", nseRefreshing && "animate-spin")}
            />
            {nseRefreshing ? "Fetching NSE..." : "LIVE NSE PRICES"}
          </Button>
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

      {/* NSE manual refresh notification */}
      {nseNotice && (
        <div
          role={nseNotice.type === "error" ? "alert" : "status"}
          className={cn(
            "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-[13px]",
            nseNotice.type === "success"
              ? "border-[var(--tx-gain-border)] bg-[var(--tx-gain-bg)] text-[var(--tx-gain)]"
              : "border-[var(--tx-loss-border)] bg-[var(--tx-loss-bg)] text-[var(--tx-loss)]"
          )}
        >
          <div className="flex items-start gap-2.5">
            {nseNotice.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="space-y-0.5">
              <p className="font-medium">{nseNotice.message}</p>
              {nseNotice.type === "success" && (
                <p className="text-xs text-[var(--tx-text-secondary)] tabular-nums">
                  {nseNotice.updatedCount ?? 0} updated
                  {nseNotice.failedCount ? ` · ${nseNotice.failedCount} failed` : ""}
                  {nseNotice.fetchedAt
                    ? ` · Fetched ${formatSnapshotTimestamp(nseNotice.fetchedAt)}`
                    : ""}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={dismissNseNotice}
            aria-label="Dismiss notification"
            className="cursor-pointer rounded p-1 text-current opacity-75 transition-opacity hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Market feed error banner */}
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

      {/* Market quotes table & market movers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <MarketQuotesTable stocks={stocks} loading={loading} />
        </div>
        <div className="lg:col-span-4">
          <MarketMoversCard stocks={stocks} loading={loading} />
        </div>
      </div>
    </div>
  );
}
