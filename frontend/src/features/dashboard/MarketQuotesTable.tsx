import { Link } from "react-router-dom";
import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { LivePriceText } from "@/components/common/LivePriceText";
import { cn, formatINR, formatPercent } from "@/lib/utils";
import type { MarketStock } from "@/types/market";

interface MarketQuotesTableProps {
  stocks: MarketStock[];
  loading: boolean;
}

export function MarketQuotesTable({
  stocks,
  loading,
}: MarketQuotesTableProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-4 border-b border-[var(--tx-border)] pb-4">
        <div className="min-w-0">
          <CardTitle className="tx-heading-section">Market Quotes</CardTitle>
          <CardDescription>
            Live simulated prices across tracked NSE symbols
          </CardDescription>
        </div>
        <Link to="/stocks" className="shrink-0">
          <Button variant="outline" size="sm">
            Explore all
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-0 sm:px-0">
        {loading && stocks.length === 0 ? (
          <div className="space-y-2.5 p-5 sm:p-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-10 w-full animate-pulse rounded-lg bg-[var(--tx-surface-elevated)]"
              />
            ))}
          </div>
        ) : stocks.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13px] text-[var(--tx-text-muted)]">
            No simulated stocks are currently available.
          </div>
        ) : (
          <div className="max-h-[430px] overflow-auto tx-scrollbar">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead className="sticky top-0 z-10 border-b border-[var(--tx-border)] bg-[var(--tx-surface-muted)]/95 backdrop-blur-xs">
                <tr>
                  <th className="tx-label px-5 py-3 sm:px-6">Company</th>
                  <th className="tx-label px-4 py-3">Symbol</th>
                  <th className="tx-label px-4 py-3 text-right">Price</th>
                  <th className="tx-label px-4 py-3 text-right">Change</th>
                  <th className="tx-label px-4 py-3 text-right">Change %</th>
                  <th className="tx-label px-5 py-3 text-right sm:px-6">
                    Trade
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--tx-border)]">
                {stocks.map((stock) => {
                  const isUp = stock.change > 0;
                  const isDown = stock.change < 0;

                  return (
                    <tr
                      key={stock.id}
                      className="group transition-colors duration-150 hover:bg-[var(--tx-surface-hover)]"
                    >
                      <td className="px-5 py-3 sm:px-6">
                        <Link
                          to={`/stocks/${stock.symbol}`}
                          className="block truncate text-[13px] font-medium text-[var(--tx-text)] transition-opacity group-hover:opacity-90"
                        >
                          {stock.companyName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/stocks/${stock.symbol}`}
                          className="text-xs font-semibold tracking-[0.06em] text-[var(--tx-text-secondary)] transition-colors hover:text-[var(--tx-text)]"
                        >
                          {stock.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-[var(--tx-text)]">
                        <LivePriceText price={stock.currentPrice} />
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right text-[13px] font-medium tabular-nums",
                          isUp
                            ? "text-[var(--tx-gain)]"
                            : isDown
                              ? "text-[var(--tx-loss)]"
                              : "text-[var(--tx-text-muted)]"
                        )}
                      >
                        {isUp ? "+" : ""}
                        {formatINR(stock.change)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          variant={isUp ? "gain" : isDown ? "loss" : "neutral"}
                          size="sm"
                        >
                          {isUp ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : isDown ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          {formatPercent(stock.changePercent)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right sm:px-6">
                        <Link to={`/stocks/${stock.symbol}?action=buy`}>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2.5 text-[11px]"
                          >
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
