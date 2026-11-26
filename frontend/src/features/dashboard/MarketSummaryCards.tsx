import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Card, CardContent } from "@/components/common/Card";
import { cn, formatPercent } from "@/lib/utils";
import type { SocketConnectionStatus } from "@/context/MarketContext";
import type { MarketStock } from "@/types/market";

interface MarketSummaryCardsProps {
  stocks: MarketStock[];
  loading: boolean;
  lastUpdated: string | null;
  connectionStatus: SocketConnectionStatus;
}

function formatTimeOnly(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

const STREAM_LABEL: Record<SocketConnectionStatus, string> = {
  live: "Socket.IO stream active",
  connecting: "Connecting to live stream",
  reconnecting: "Reconnecting to stream",
  offline: "Stream disconnected",
};

const STREAM_DOT: Record<SocketConnectionStatus, string> = {
  live: "bg-emerald-400",
  connecting: "bg-amber-400",
  reconnecting: "bg-amber-400",
  offline: "bg-red-400",
};

export function MarketSummaryCards({
  stocks,
  loading,
  lastUpdated,
  connectionStatus,
}: MarketSummaryCardsProps) {
  if (loading && stocks.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx}>
            <CardContent className="pt-5">
              <div className="h-3 w-24 animate-pulse rounded bg-[var(--tx-surface-elevated)]" />
              <div className="mt-3.5 h-7 w-28 animate-pulse rounded bg-[var(--tx-surface-elevated)]" />
              <div className="mt-2.5 h-3 w-36 animate-pulse rounded bg-[var(--tx-surface-muted)]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const advancers = stocks.filter((s) => s.change > 0).length;
  const decliners = stocks.filter((s) => s.change < 0).length;
  const flat = stocks.length - advancers - decliners;
  const total = stocks.length || 1;
  const upPct = Math.round((advancers / total) * 100);
  const downPct = Math.round((decliners / total) * 100);

  const topGainer =
    stocks.length > 0
      ? [...stocks].sort((a, b) => b.changePercent - a.changePercent)[0]
      : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. Tracked Stocks */}
      <Card interactive>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <span className="tx-label">Tracked Stocks</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--tx-border)] bg-[var(--tx-surface-muted)] text-[var(--tx-text-muted)]">
              <BarChart3 className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <p className="text-[28px] font-bold leading-none tracking-[-0.03em] tabular-nums text-[var(--tx-text)]">
              {stocks.length}
            </p>
            <Badge variant="neutral" size="sm">
              NSE · INR
            </Badge>
          </div>
          <p className="mt-2.5 text-xs text-[var(--tx-text-muted)]">
            Simulated instruments active
          </p>
        </CardContent>
      </Card>

      {/* 2. Market Breadth */}
      <Card interactive>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <span className="tx-label">Market Breadth</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--tx-border)] bg-[var(--tx-surface-muted)] text-[var(--tx-text-muted)]">
              <Activity className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2 text-[22px] font-bold leading-none tracking-[-0.02em] tabular-nums">
            <span className="text-[var(--tx-gain)]">{advancers} Up</span>
            <span className="text-sm font-normal text-[var(--tx-text-muted)]">
              /
            </span>
            <span className="text-[var(--tx-loss)]">{decliners} Down</span>
          </div>
          <div
            aria-hidden="true"
            className="mt-3 flex h-1 w-full overflow-hidden rounded-full bg-[var(--tx-surface-elevated)]"
          >
            <div
              className="h-full bg-emerald-400/85 transition-all duration-300"
              style={{ width: `${upPct}%` }}
            />
            <div
              className="h-full bg-red-400/85 transition-all duration-300"
              style={{ width: `${downPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--tx-text-muted)]">
            {flat > 0 ? `${flat} unchanged vs prev close` : "Session ratio vs prev close"}
          </p>
        </CardContent>
      </Card>

      {/* 3. Leading Stock (subtle elevated treatment) */}
      <Card variant="elevated" interactive>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <span className="tx-label">Leading Stock</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--tx-border-strong)] bg-[var(--tx-glass)] text-[var(--tx-text-secondary)]">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
          </div>
          {topGainer ? (
            <>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Link
                  to={`/stocks/${topGainer.symbol}`}
                  className="group inline-flex items-center gap-1 text-[22px] font-bold leading-none tracking-[-0.025em] text-[var(--tx-text)] transition-opacity hover:opacity-80"
                >
                  <span>{topGainer.symbol}</span>
                  <ArrowUpRight className="h-4 w-4 text-[var(--tx-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Badge
                  variant={
                    topGainer.changePercent > 0
                      ? "gain"
                      : topGainer.changePercent < 0
                        ? "loss"
                        : "neutral"
                  }
                >
                  {formatPercent(topGainer.changePercent)}
                </Badge>
              </div>
              <p className="mt-2.5 truncate text-xs text-[var(--tx-text-secondary)]">
                {topGainer.companyName}
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold text-[var(--tx-text-muted)]">
                —
              </p>
              <p className="mt-2 text-xs text-[var(--tx-text-muted)]">
                Waiting for market feed
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* 4. Last Sync (selective glass treatment) */}
      <Card variant="glass" interactive>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <span className="tx-label">Last Sync</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--tx-border)] bg-[var(--tx-surface)] text-[var(--tx-text-muted)]">
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-3 text-[26px] font-bold leading-none tracking-[-0.025em] tabular-nums text-[var(--tx-text)]">
            {formatTimeOnly(lastUpdated)}
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-xs text-[var(--tx-text-secondary)]">
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                STREAM_DOT[connectionStatus]
              )}
            />
            <span className="truncate">{STREAM_LABEL[connectionStatus]}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
