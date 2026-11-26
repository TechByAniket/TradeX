import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { formatINR } from "@/lib/utils";
import type { StockHistoryPoint } from "@/types/market";

interface StockPriceChartProps {
  symbol: string;
  history: StockHistoryPoint[];
  loading: boolean;
  isPositive: boolean;
  error?: string | null;
}

interface ChartPoint extends StockHistoryPoint {
  timeLabel: string;
}

function formatShortTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatFullTimestamp(iso: string): string {
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

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}

function ChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0].payload;
  return (
    <div className="tx-glass-strong rounded-lg px-3.5 py-2.5 text-xs">
      <p className="text-[13px] font-semibold tabular-nums text-[var(--tx-text)]">
        {formatINR(point.price)}
      </p>
      <p className="mt-0.5 text-[11px] tabular-nums text-[var(--tx-text-muted)]">
        {formatFullTimestamp(point.timestamp)}
      </p>
    </div>
  );
}

export function StockPriceChart({
  symbol,
  history,
  loading,
  isPositive,
  error,
}: StockPriceChartProps) {
  const chartData: ChartPoint[] = history.map((point) => ({
    ...point,
    timeLabel: formatShortTime(point.timestamp),
  }));

  const strokeColor = isPositive ? "#34d399" : "#f87171";
  const gradientId = `stockPriceGrad-${symbol}-${isPositive ? "up" : "down"}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-4 border-b border-[var(--tx-border)] pb-4">
        <div>
          <CardTitle className="tx-heading-section">
            Simulated Intraday Chart
          </CardTitle>
          <CardDescription>
            {history.length > 0
              ? `Recorded simulator tick history for ${symbol}`
              : `Session price history for ${symbol}`}
          </CardDescription>
        </div>
        {history.length > 0 && (
          <Badge variant="glass" size="sm">
            {history.length} {history.length === 1 ? "pt" : "pts"}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="pt-5">
        {loading && history.length === 0 ? (
          <div className="h-80 w-full animate-pulse rounded-lg bg-[var(--tx-surface-elevated)]" />
        ) : error && history.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--tx-border-strong)] bg-[var(--tx-bg)]/50 px-6 text-center">
            <Activity className="h-5 w-5 text-[var(--tx-text-muted)]" />
            <p className="text-[13px] text-[var(--tx-text-secondary)]">
              Historical price data is currently unavailable ({error}).
            </p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--tx-border-strong)] bg-[var(--tx-bg)]/50 px-6 text-center">
            <Activity className="h-5 w-5 text-[var(--tx-text-muted)]" />
            <p className="max-w-sm text-[13px] leading-relaxed text-[var(--tx-text-secondary)]">
              Historical price data is unavailable right now. Live quote metrics
              remain active above.
            </p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 12, left: 2, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={strokeColor}
                      stopOpacity={0.22}
                    />
                    <stop
                      offset="100%"
                      stopColor={strokeColor}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--tx-text)"
                  strokeOpacity={0.07}
                />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 11, fill: "var(--tx-text-muted)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: "var(--tx-text-muted)" }}
                  tickLine={false}
                  axisLine={false}
                  width={74}
                  tickFormatter={(val: number) => `₹${val.toFixed(0)}`}
                />
                <Tooltip
                  cursor={{ stroke: "var(--tx-border-hover)", strokeWidth: 1 }}
                  content={<ChartTooltip />}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={strokeColor}
                  strokeWidth={2}
                  activeDot={{
                    r: 4,
                    fill: strokeColor,
                    stroke: "var(--tx-bg)",
                    strokeWidth: 2,
                  }}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
