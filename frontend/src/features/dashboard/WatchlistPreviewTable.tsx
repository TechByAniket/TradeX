import { Link } from "react-router-dom";
import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { cn, formatINR, formatPercent } from "@/lib/utils";
import type { MarketStock } from "@/types/market";

interface WatchlistPreviewTableProps {
  stocks: MarketStock[];
  loading: boolean;
}

export function WatchlistPreviewTable({
  stocks,
  loading,
}: WatchlistPreviewTableProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800/80">
        <div>
          <CardTitle>Market Watchlist</CardTitle>
          <CardDescription>
            Live simulated prices across supported stocks
          </CardDescription>
        </div>
        <Link to="/stocks">
          <Button variant="ghost" size="sm">
            Explore all
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {loading && stocks.length === 0 ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-10 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70"
              />
            ))}
          </div>
        ) : stocks.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            No simulated stocks are currently available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                  <th className="px-6 py-3">Company</th>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3 text-right">Current Price</th>
                  <th className="px-4 py-3 text-right">Change</th>
                  <th className="px-4 py-3 text-right">Change %</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {stocks.map((stock) => {
                  const isUp = stock.change > 0;
                  const isDown = stock.change < 0;

                  return (
                    <tr
                      key={stock.id}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                        <Link
                          to={`/stocks/${stock.symbol}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {stock.companyName}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/stocks/${stock.symbol}`}
                          className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold tracking-wide text-slate-700 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {stock.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                        {formatINR(stock.currentPrice)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3.5 text-right font-medium tabular-nums",
                          isUp
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isDown
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-500 dark:text-slate-400"
                        )}
                      >
                        {isUp ? "+" : ""}
                        {formatINR(stock.change)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span
                          className={cn(
                            "inline-flex items-center justify-end gap-1 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
                            isUp
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : isDown
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          )}
                        >
                          {isUp ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : isDown ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          {formatPercent(stock.changePercent)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link to={`/stocks/${stock.symbol}?action=buy`}>
                          <Button variant="outline" size="sm">
                            BUY
                          </Button>
                        </Link>
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
  );
}
