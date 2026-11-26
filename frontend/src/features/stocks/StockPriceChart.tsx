import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold tabular-nums text-slate-900 dark:text-slate-50">
        {formatINR(point.price)}
      </p>
      <p className="mt-0.5 text-slate-500 tabular-nums dark:text-slate-400">
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

  const strokeColor = isPositive ? "#059669" : "#dc2626";
  const gradientId = `stockPriceGrad-${symbol}-${isPositive ? "up" : "down"}`;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800/80">
        <div>
          <CardTitle>Simulated Intraday Price Chart</CardTitle>
          <CardDescription>
            {history.length > 0
              ? `Showing ${history.length} recorded price ${history.length === 1 ? "point" : "points"} for ${symbol}`
              : `Session price history for ${symbol}`}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        {loading && history.length === 0 ? (
          <div className="h-72 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70" />
        ) : error && history.length === 0 ? (
          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Historical price data is currently unavailable ({error}).
          </div>
        ) : history.length === 0 ? (
          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-200 px-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Historical price data is unavailable right now. Live quote metrics
            remain active above.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={strokeColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#94a3b8"
                  strokeOpacity={0.2}
                />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  tickFormatter={(val: number) => `₹${val.toFixed(0)}`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={strokeColor}
                  strokeWidth={2}
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
