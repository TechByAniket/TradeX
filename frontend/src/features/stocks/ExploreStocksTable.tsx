import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Minus,
  SearchX,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { cn, formatINR, formatNumber, formatPercent } from "@/lib/utils";
import type { MarketStock } from "@/types/market";

export type StockSortField = "symbol" | "currentPrice" | "changePercent";
export type SortDirection = "asc" | "desc";

interface ExploreStocksTableProps {
  stocks: MarketStock[];
  loading: boolean;
  sortField: StockSortField;
  sortDirection: SortDirection;
  onSortChange: (field: StockSortField) => void;
  hasActiveSearch: boolean;
  onClearSearch: () => void;
}

function SortIcon({
  field,
  activeField,
  direction,
}: {
  field: StockSortField;
  activeField: StockSortField;
  direction: SortDirection;
}) {
  if (field !== activeField) {
    return <ArrowUpDown className="h-3 w-3 text-[var(--tx-text-muted)]" />;
  }
  return direction === "asc" ? (
    <ArrowUp className="h-3 w-3 text-[var(--tx-text)]" />
  ) : (
    <ArrowDown className="h-3 w-3 text-[var(--tx-text)]" />
  );
}

export function ExploreStocksTable({
  stocks,
  loading,
  sortField,
  sortDirection,
  onSortChange,
  hasActiveSearch,
  onClearSearch,
}: ExploreStocksTableProps) {
  if (loading && stocks.length === 0) {
    return (
      <div className="space-y-2.5 p-5 sm:p-6">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="h-11 w-full animate-pulse rounded-lg bg-[var(--tx-surface-elevated)]"
          />
        ))}
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--tx-border)] bg-[var(--tx-surface-elevated)] text-[var(--tx-text-muted)]">
          <SearchX className="h-4 w-4" />
        </span>
        <p className="text-[13px] text-[var(--tx-text-secondary)]">
          {hasActiveSearch
            ? "No simulated stocks match your filter criteria."
            : "No simulated stocks are currently available."}
        </p>
        {hasActiveSearch && (
          <Button variant="secondary" size="sm" onClick={onClearSearch}>
            Clear filter
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="max-h-[520px] overflow-auto tx-scrollbar">
      <table className="w-full min-w-[780px] border-collapse text-left">
        <thead className="sticky top-0 z-10 border-b border-[var(--tx-border)] bg-[var(--tx-surface-muted)]/95 backdrop-blur-xs">
          <tr>
            <th className="tx-label px-5 py-3.5 sm:px-6">Company</th>
            <th className="tx-label px-4 py-3.5">
              <button
                type="button"
                onClick={() => onSortChange("symbol")}
                className="inline-flex cursor-pointer items-center gap-1.5 uppercase transition-colors hover:text-[var(--tx-text)]"
              >
                Symbol
                <SortIcon
                  field="symbol"
                  activeField={sortField}
                  direction={sortDirection}
                />
              </button>
            </th>
            <th className="tx-label px-4 py-3.5 text-right">
              <button
                type="button"
                onClick={() => onSortChange("currentPrice")}
                className="inline-flex cursor-pointer items-center justify-end gap-1.5 uppercase transition-colors hover:text-[var(--tx-text)]"
              >
                Price
                <SortIcon
                  field="currentPrice"
                  activeField={sortField}
                  direction={sortDirection}
                />
              </button>
            </th>
            <th className="tx-label px-4 py-3.5 text-right">Change</th>
            <th className="tx-label px-4 py-3.5 text-right">
              <button
                type="button"
                onClick={() => onSortChange("changePercent")}
                className="inline-flex cursor-pointer items-center justify-end gap-1.5 uppercase transition-colors hover:text-[var(--tx-text)]"
              >
                Change %
                <SortIcon
                  field="changePercent"
                  activeField={sortField}
                  direction={sortDirection}
                />
              </button>
            </th>
            <th className="tx-label px-4 py-3.5 text-right">Volume</th>
            <th className="tx-label px-5 py-3.5 text-right sm:px-6">Actions</th>
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
                <td className="px-5 py-3.5 sm:px-6">
                  <Link
                    to={`/stocks/${stock.symbol}`}
                    className="block truncate text-[13px] font-medium text-[var(--tx-text)] transition-opacity group-hover:opacity-90"
                  >
                    {stock.companyName}
                  </Link>
                </td>
                <td className="px-4 py-3.5">
                  <Link
                    to={`/stocks/${stock.symbol}`}
                    className="text-xs font-semibold tracking-[0.06em] text-[var(--tx-text-secondary)] transition-colors hover:text-[var(--tx-text)]"
                  >
                    {stock.symbol}
                  </Link>
                </td>
                <td className="px-4 py-3.5 text-right text-[13px] font-semibold tabular-nums text-[var(--tx-text)]">
                  {formatINR(stock.currentPrice)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3.5 text-right text-[13px] font-medium tabular-nums",
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
                <td className="px-4 py-3.5 text-right">
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
                <td className="px-4 py-3.5 text-right text-[13px] tabular-nums text-[var(--tx-text-secondary)]">
                  {formatNumber(stock.volume)}
                </td>
                <td className="px-5 py-3.5 text-right sm:px-6">
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <Link to={`/stocks/${stock.symbol}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[11px]">
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </Link>
                    <Link to={`/stocks/${stock.symbol}?action=buy`}>
                      <Button variant="primary" size="sm" className="h-7 px-2.5 text-[11px]">
                        BUY
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
