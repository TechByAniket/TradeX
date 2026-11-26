import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, ChevronDown, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, CardContent, CardHeader } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
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
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--tx-border)] pb-6 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.02em] text-[var(--tx-text-muted)]">
            NSE Simulated Universe · Real-Time Quotes
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="tx-heading-page text-2xl sm:text-[26px]">
              Explore Stocks
            </h1>
            <MarketBadge connectionStatus={connectionStatus} />
          </div>
          <p className="text-[13px] text-[var(--tx-text-secondary)]">
            Search and rank supported equities driven by the backend market
            simulator.
          </p>
        </div>

        <p className="text-xs font-medium tabular-nums text-[var(--tx-text-muted)]">
          Showing{" "}
          <span className="text-[var(--tx-text)]">
            {filteredAndSortedStocks.length}
          </span>{" "}
          of {stocks.length} stocks
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[var(--tx-loss-border)] bg-[var(--tx-loss-bg)] px-4 py-3 text-[13px] text-[var(--tx-loss)] sm:flex-row sm:items-center"
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
        <CardHeader className="flex-col gap-3 border-b border-[var(--tx-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Filter by company name or symbol..."
              aria-label="Filter stocks by company name or symbol"
              leftIcon={<Search className="h-3.5 w-3.5" />}
              rightElement={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    aria-label="Clear stock search"
                    className="cursor-pointer rounded p-0.5 text-[var(--tx-text-muted)] transition-colors hover:text-[var(--tx-text)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : undefined
              }
            />
          </div>

          <div className="flex items-center gap-2.5">
            <label
              htmlFor="stock-sort"
              className="tx-label shrink-0"
            >
              Sort
            </label>
            <div className="relative">
              <select
                id="stock-sort"
                value={`${sortField}:${sortDirection}`}
                onChange={(e) => handleSelectSortPreset(e.target.value)}
                className="h-9 cursor-pointer appearance-none rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface-muted)] pr-8 pl-3 text-xs font-medium text-[var(--tx-text)] transition-colors hover:border-[var(--tx-border-hover)] focus:border-[var(--tx-border-hover)] focus:bg-[var(--tx-surface-elevated)] focus:outline-none"
              >
                <option value="symbol:asc">Symbol (A–Z)</option>
                <option value="changePercent:desc">
                  Change % (High to Low)
                </option>
                <option value="changePercent:asc">
                  Change % (Low to High)
                </option>
                <option value="currentPrice:desc">Price (High to Low)</option>
                <option value="currentPrice:asc">Price (Low to High)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--tx-text-muted)]" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:px-0">
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
