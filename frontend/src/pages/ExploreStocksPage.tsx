import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, CardContent, CardHeader } from "@/components/common/Card";
import { MarketBadge } from "@/components/common/MarketBadge";
import { useMarket } from "@/context/MarketContext";
import {
  ExploreStocksTable,
  type SortDirection,
  type StockSortField,
} from "@/features/stocks/ExploreStocksTable";

export function ExploreStocksPage() {
  const { stocks, loading, error, connectionStatus, refreshStocks } =
    useMarket();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";

  const [sortField, setSortField] = useState<StockSortField>("symbol");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSearchChange = (value: string) => {
    if (value.trim()) {
      setSearchParams({ q: value }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleSortChange = (field: StockSortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "symbol" ? "asc" : "desc");
    }
  };

  const handleSelectSortPreset = (value: string) => {
    const [field, dir] = value.split(":") as [StockSortField, SortDirection];
    setSortField(field);
    setSortDirection(dir);
  };

  const filteredAndSortedStocks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? stocks.filter(
          (stock) =>
            stock.symbol.toLowerCase().includes(query) ||
            stock.companyName.toLowerCase().includes(query)
        )
      : stocks;

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "symbol") {
        cmp = a.symbol.localeCompare(b.symbol);
      } else if (sortField === "currentPrice") {
        cmp = a.currentPrice - b.currentPrice;
      } else {
        cmp = a.changePercent - b.changePercent;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [stocks, searchQuery, sortField, sortDirection]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end dark:border-slate-800">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
              Explore Stocks
            </h1>
            <MarketBadge connectionStatus={connectionStatus} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Search and sort supported stocks with real-time simulated quotes.
          </p>
        </div>

        <p className="text-xs font-medium text-slate-500 tabular-nums dark:text-slate-400">
          Showing {filteredAndSortedStocks.length} of {stocks.length} stocks
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refreshStocks();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Filter by company name or symbol..."
              aria-label="Filter stocks by company name or symbol"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-8 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                aria-label="Clear stock search"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="stock-sort"
              className="text-xs font-medium text-slate-500 dark:text-slate-400"
            >
              Sort by
            </label>
            <select
              id="stock-sort"
              value={`${sortField}:${sortDirection}`}
              onChange={(e) => handleSelectSortPreset(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="symbol:asc">Symbol (A–Z)</option>
              <option value="changePercent:desc">Change % (High to Low)</option>
              <option value="changePercent:asc">Change % (Low to High)</option>
              <option value="currentPrice:desc">Price (High to Low)</option>
              <option value="currentPrice:asc">Price (Low to High)</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ExploreStocksTable
            stocks={filteredAndSortedStocks}
            loading={loading}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            hasActiveSearch={Boolean(searchQuery.trim())}
            onClearSearch={() => handleSearchChange("")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
