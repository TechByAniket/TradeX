import { Activity, BarChart3, Clock, TrendingUp } from "lucide-react";
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
  live: "Real-time Socket.IO active",
  connecting: "Connecting to live stream",
  reconnecting: "Reconnecting to stream",
  offline: "Stream disconnected",
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
              <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-3 h-6 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const advancers = stocks.filter((s) => s.change > 0).length;
  const decliners = stocks.filter((s) => s.change < 0).length;
  const flat = stocks.length - advancers - decliners;

  const topGainer =
    stocks.length > 0
      ? [...stocks].sort((a, b) => b.changePercent - a.changePercent)[0]
      : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tracked Stocks
            </span>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            {stocks.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            NSE simulated symbols (INR)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Market Breadth
            </span>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2.5 text-2xl font-semibold tabular-nums">
            <span className="text-emerald-600 dark:text-emerald-400">
              {advancers} Up
            </span>
            <span className="text-sm font-normal text-slate-300 dark:text-slate-700">
              /
            </span>
            <span className="text-rose-600 dark:text-rose-400">
              {decliners} Down
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {flat > 0 ? `${flat} unchanged vs prev close` : "Active movers"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Leading Stock
            </span>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          {topGainer ? (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  {topGainer.symbol}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    topGainer.changePercent > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : topGainer.changePercent < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-500"
                  )}
                >
                  {formatPercent(topGainer.changePercent)}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                {topGainer.companyName}
              </p>
            </>
          ) : (
            <p className="mt-2 text-2xl font-semibold text-slate-400">—</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Last Sync
            </span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            {formatTimeOnly(lastUpdated)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {STREAM_LABEL[connectionStatus]}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
