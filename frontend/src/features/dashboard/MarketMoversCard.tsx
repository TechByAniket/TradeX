import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { cn, formatINR, formatPercent } from "@/lib/utils";
import type { MarketStock } from "@/types/market";

interface MarketMoversCardProps {
  stocks: MarketStock[];
  loading: boolean;
}

type MoverTab = "gainers" | "losers";

export function MarketMoversCard({ stocks, loading }: MarketMoversCardProps) {
  const [activeTab, setActiveTab] = useState<MoverTab>("gainers");

  const { gainers, losers } = useMemo(() => {
    const positive = stocks
      .filter((s) => s.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);

    const negative = stocks
      .filter((s) => s.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5);

    return { gainers: positive, losers: negative };
  }, [stocks]);

  const items = activeTab === "gainers" ? gainers : losers;

  return (
    <Card className="flex flex-col">
      <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Market Movers</CardTitle>
            <CardDescription>Ranked by session % change</CardDescription>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => setActiveTab("gainers")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
              activeTab === "gainers"
                ? "bg-white text-emerald-700 shadow-2xs dark:bg-slate-900 dark:text-emerald-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Top Gainers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("losers")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
              activeTab === "losers"
                ? "bg-white text-rose-700 shadow-2xs dark:bg-slate-900 dark:text-rose-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            Top Losers
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-4">
        {loading && stocks.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="h-12 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {activeTab === "gainers"
              ? "No stocks are currently trading higher than previous close."
              : "No stocks are currently trading lower than previous close."}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {items.map((stock) => {
              const isPositive = stock.changePercent > 0;
              return (
                <li key={stock.id}>
                  <Link
                    to={`/stocks/${stock.symbol}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:opacity-80"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {stock.symbol}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {stock.companyName}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                        {formatINR(stock.currentPrice)}
                      </p>
                      <p
                        className={cn(
                          "text-xs font-medium tabular-nums",
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {formatPercent(stock.changePercent)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
