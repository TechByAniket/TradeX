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
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="border-b border-[var(--tx-border)] pb-4">
        <div>
          <CardTitle className="tx-heading-section">Market Movers</CardTitle>
          <CardDescription>Ranked by session % movement</CardDescription>
        </div>

        <div
          role="tablist"
          aria-label="Market movers direction"
          className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-[var(--tx-border)] bg-[var(--tx-bg)] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "gainers"}
            onClick={() => setActiveTab("gainers")}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs font-medium transition-all duration-150",
              activeTab === "gainers"
                ? "border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] text-[var(--tx-text)] shadow-2xs"
                : "border-transparent text-[var(--tx-text-muted)] hover:text-[var(--tx-text-secondary)]"
            )}
          >
            <TrendingUp
              className={cn(
                "h-3.5 w-3.5",
                activeTab === "gainers"
                  ? "text-[var(--tx-gain)]"
                  : "text-current"
              )}
            />
            Top Gainers
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "losers"}
            onClick={() => setActiveTab("losers")}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs font-medium transition-all duration-150",
              activeTab === "losers"
                ? "border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] text-[var(--tx-text)] shadow-2xs"
                : "border-transparent text-[var(--tx-text-muted)] hover:text-[var(--tx-text-secondary)]"
            )}
          >
            <TrendingDown
              className={cn(
                "h-3.5 w-3.5",
                activeTab === "losers" ? "text-[var(--tx-loss)]" : "text-current"
              )}
            />
            Top Losers
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 sm:px-0">
        {loading && stocks.length === 0 ? (
          <div className="space-y-2.5 p-5 sm:p-6">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="h-12 w-full animate-pulse rounded-lg bg-[var(--tx-surface-elevated)]"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13px] text-[var(--tx-text-muted)]">
            {activeTab === "gainers"
              ? "No stocks are currently trading higher than previous close."
              : "No stocks are currently trading lower than previous close."}
          </div>
        ) : (
          <ul className="max-h-[372px] divide-y divide-[var(--tx-border)] overflow-y-auto tx-scrollbar">
            {items.map((stock, idx) => {
              const isPositive = stock.changePercent > 0;
              return (
                <li key={stock.id}>
                  <Link
                    to={`/stocks/${stock.symbol}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors duration-150 hover:bg-[var(--tx-surface-hover)] sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-4 shrink-0 text-[11px] font-medium tabular-nums text-[var(--tx-text-muted)]">
                        0{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold tracking-[0.02em] text-[var(--tx-text)]">
                          {stock.symbol}
                        </p>
                        <p className="truncate text-xs text-[var(--tx-text-muted)]">
                          {stock.companyName}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-semibold tabular-nums text-[var(--tx-text)]">
                        {formatINR(stock.currentPrice)}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-xs font-medium tabular-nums",
                          isPositive
                            ? "text-[var(--tx-gain)]"
                            : "text-[var(--tx-loss)]"
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
