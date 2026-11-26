import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { AlertCircle, ArrowLeftRight, RefreshCw } from "lucide-react";
import { AuthRequiredCard } from "@/components/common/AuthRequiredCard";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card, CardContent, CardHeader } from "@/components/common/Card";
import { DateFilterInput } from "@/components/common/DateFilterInput";
import { useAuth } from "@/context/AuthContext";
import {
  cn,
  formatINR,
  formatNumber,
  formatShortDate,
  toLocalDateKey,
} from "@/lib/utils";
import { getApiErrorMessage } from "@/services/apiClient";
import { fetchTransactions } from "@/services/tradingService";
import type { TransactionRecord, TransactionType } from "@/types/trading";

type TxFilter = "ALL" | TransactionType;

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function TransactionsPage() {
  const { user, authLoading } = useAuth();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TxFilter>("ALL");
  const [selectedDate, setSelectedDate] = useState("");

  const loadTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchTransactions();
      setTransactions(res.transactions);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load transaction history."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const dateFilteredTransactions = useMemo(() => {
    if (!selectedDate) return transactions;
    return transactions.filter(
      (tx) => toLocalDateKey(tx.createdAt) === selectedDate
    );
  }, [transactions, selectedDate]);

  const filteredTransactions = useMemo(() => {
    if (typeFilter === "ALL") return dateFilteredTransactions;
    return dateFilteredTransactions.filter((tx) => tx.type === typeFilter);
  }, [dateFilteredTransactions, typeFilter]);

  if (authLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-[var(--tx-surface-elevated)]" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-[var(--tx-surface-elevated)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <AuthRequiredCard
        title="Sign in to view Transactions"
        description="Sign in with your TradeX account to inspect your executed cash debit and credit ledger."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--tx-border)] pb-6 sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs font-medium tracking-[0.02em] text-[var(--tx-text-muted)]">
            Cash Settlement Ledger · Virtual INR
          </p>
          <h1 className="tx-heading-page text-2xl sm:text-[26px]">
            Transactions
          </h1>
          <p className="text-[13px] text-[var(--tx-text-secondary)]">
            Cash movements recorded for your executed BUY and SELL orders.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          aria-label="Refresh transactions"
          title="Refresh"
          onClick={() => {
            void loadTransactions();
          }}
          disabled={loading}
          className="w-8 shrink-0 px-0 sm:w-auto sm:px-3"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
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
            onClick={() => void loadTransactions()}
          >
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-start justify-between gap-2.5 border-b border-[var(--tx-border)] pb-4 sm:items-center">
          <div className="inline-flex w-fit flex-wrap items-center gap-1 rounded-lg border border-[var(--tx-border)] bg-[var(--tx-bg)] p-1">
            {(["ALL", "BUY_DEBIT", "SELL_CREDIT"] as TxFilter[]).map((type) => {
              const count =
                type === "ALL"
                  ? dateFilteredTransactions.length
                  : dateFilteredTransactions.filter((t) => t.type === type)
                      .length;

              const label =
                type === "ALL"
                  ? "ALL"
                  : type === "BUY_DEBIT"
                    ? "BUY DEBIT"
                    : "SELL CREDIT";

              const isActive = typeFilter === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(type)}
                  className={cn(
                    "relative cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium tabular-nums transition-colors duration-150",
                    isActive
                      ? "text-[var(--tx-text)]"
                      : "text-[var(--tx-text-muted)] hover:text-[var(--tx-text-secondary)]"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="transactions-type-pill"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 38,
                      }}
                      className="absolute inset-0 rounded-md border border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] shadow-2xs"
                    />
                  )}
                  <span className="relative z-10">
                    {label}{" "}
                    <span
                      className={cn(
                        "ml-0.5 text-[11px]",
                        isActive
                          ? "text-[var(--tx-text-secondary)]"
                          : "text-[var(--tx-text-muted)]"
                      )}
                    >
                      {count}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <DateFilterInput
            id="transactions-date-filter"
            value={selectedDate}
            onChange={setSelectedDate}
            ariaLabel="Filter transactions by date"
          />
        </CardHeader>

        <CardContent className="p-0 sm:px-0">
          {loading && transactions.length === 0 ? (
            <div className="space-y-2.5 p-5 sm:p-6">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-10 w-full animate-pulse rounded-lg bg-[var(--tx-surface-elevated)]"
                />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
              <ArrowLeftRight className="h-5 w-5 text-[var(--tx-text-muted)]" />
              <p className="text-[13px] text-[var(--tx-text-secondary)]">
                {transactions.length === 0
                  ? "No transactions recorded yet."
                  : selectedDate
                    ? `No transactions found on ${formatShortDate(selectedDate)}.`
                    : "No matching transactions found."}
              </p>
              {selectedDate && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedDate("")}
                >
                  Clear date filter
                </Button>
              )}
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto tx-scrollbar">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="sticky top-0 z-10 border-b border-[var(--tx-border)] bg-[var(--tx-surface-muted)]/95 backdrop-blur-xs">
                  <tr>
                    <th className="tx-label px-5 py-3.5 sm:px-6">
                      Date &amp; Time
                    </th>
                    <th className="tx-label px-4 py-3.5">Stock</th>
                    <th className="tx-label px-4 py-3.5">Type</th>
                    <th className="tx-label px-4 py-3.5 text-right">
                      Quantity
                    </th>
                    <th className="tx-label px-4 py-3.5 text-right">Amount</th>
                    <th className="tx-label px-5 py-3.5 text-right sm:px-6">
                      Balance After
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--tx-border)]">
                  {filteredTransactions.map((tx) => {
                    const isCredit = tx.type === "SELL_CREDIT";

                    return (
                      <tr
                        key={tx.id}
                        className="group transition-colors duration-150 hover:bg-[var(--tx-surface-hover)]"
                      >
                        <td className="px-5 py-3.5 text-xs tabular-nums text-[var(--tx-text-muted)] sm:px-6">
                          {formatDateTime(tx.createdAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            to={`/stocks/${tx.symbol}`}
                            className="text-[13px] font-semibold tracking-[0.02em] text-[var(--tx-text)] transition-opacity group-hover:opacity-90"
                          >
                            {tx.symbol}
                          </Link>
                          <p className="text-xs text-[var(--tx-text-muted)]">
                            {tx.companyName}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            variant={isCredit ? "gain" : "loss"}
                            size="sm"
                          >
                            {isCredit ? "SELL CREDIT" : "BUY DEBIT"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right text-[13px] font-medium tabular-nums text-[var(--tx-text)]">
                          {formatNumber(tx.quantity)}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3.5 text-right text-[13px] font-semibold tabular-nums",
                            isCredit
                              ? "text-[var(--tx-gain)]"
                              : "text-[var(--tx-loss)]"
                          )}
                        >
                          {isCredit ? "+" : "-"}
                          {formatINR(tx.amount)}
                        </td>
                        <td className="px-5 py-3.5 text-right text-[13px] font-semibold tabular-nums text-[var(--tx-text)] sm:px-6">
                          {formatINR(tx.balanceAfter)}
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
    </div>
  );
}
