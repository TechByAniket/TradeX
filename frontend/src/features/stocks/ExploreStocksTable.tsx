import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
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
    return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
  }
  return direction === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
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
      <div className="space-y-3 p-6">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="h-11 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70"
          />
        ))}
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {hasActiveSearch
            ? "No simulated stocks match your search query."
            : "No simulated stocks are currently available."}
        </p>
        {hasActiveSearch && (
          <Button variant="outline" size="sm" onClick={onClearSearch}>
            Clear search
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="max-h-[480px] overflow-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            <th className="px-6 py-3.5">Company</th>
            <th className="px-4 py-3.5">
              <button
                type="button"
                onClick={() => onSortChange("symbol")}
                className="inline-flex items-center gap-1.5 uppercase hover:text-slate-900 dark:hover:text-slate-100"
              >
                Symbol
                <SortIcon
                  field="symbol"
                  activeField={sortField}
                  direction={sortDirection}
                />
              </button>
            </th>
            <th className="px-4 py-3.5 text-right">
              <button
                type="button"
                onClick={() => onSortChange("currentPrice")}
                className="inline-flex items-center justify-end gap-1.5 uppercase hover:text-slate-900 dark:hover:text-slate-100"
              >
                Price
                <SortIcon
                  field="currentPrice"
                  activeField={sortField}
                  direction={sortDirection}
                />
              </button>
            </th>
            <th className="px-4 py-3.5 text-right">Change</th>
            <th className="px-4 py-3.5 text-right">
              <button
                type="button"
                onClick={() => onSortChange("changePercent")}
                className="inline-flex items-center justify-end gap-1.5 uppercase hover:text-slate-900 dark:hover:text-slate-100"
              >
                Change %
                <SortIcon
                  field="changePercent"
                  activeField={sortField}
                  direction={sortDirection}
                />
              </button>
            </th>
            <th className="px-4 py-3.5 text-right">Volume</th>
            <th className="px-6 py-3.5 text-right">Actions</th>
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
                <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums dark:text-slate-300">
                  {formatNumber(stock.volume)}
                </td>
                <td className="px-6 py-3.5 text-right">
                  <div className="inline-flex items-center justify-end gap-2">
                    <Link to={`/stocks/${stock.symbol}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </Link>
                    <Link to={`/stocks/${stock.symbol}?action=buy`}>
                      <Button variant="primary" size="sm">
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
