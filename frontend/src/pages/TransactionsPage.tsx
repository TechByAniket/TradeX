import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeftRight, RefreshCw } from "lucide-react";
import { AuthRequiredCard } from "@/components/common/AuthRequiredCard";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card, CardContent, CardHeader } from "@/components/common/Card";
import { useAuth } from "@/context/AuthContext";
import { cn, formatINR, formatNumber } from "@/lib/utils";
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

  const filteredTransactions = useMemo(() => {
    if (typeFilter === "ALL") return transactions;
    return transactions.filter((tx) => tx.type === typeFilter);
  }, [transactions, typeFilter]);

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
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--tx-border)] pb-6 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
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
          onClick={() => {
            void loadTransactions();
          }}
          disabled={loading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
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
        <CardHeader className="border-b border-[var(--tx-border)] pb-4">
          <div className="inline-flex w-fit flex-wrap items-center gap-1 rounded-lg border border-[var(--tx-border)] bg-[var(--tx-bg)] p-1">
            {(["ALL", "BUY_DEBIT", "SELL_CREDIT"] as TxFilter[]).map((type) => {
              const count =
                type === "ALL"
                  ? transactions.length
                  : transactions.filter((t) => t.type === type).length;

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
                    "cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium tabular-nums transition-all duration-150",
                    isActive
                      ? "border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] text-[var(--tx-text)] shadow-2xs"
                      : "border-transparent text-[var(--tx-text-muted)] hover:text-[var(--tx-text-secondary)]"
                  )}
                >
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
                </button>
              );
            })}
          </div>
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
            <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-14 text-center">
              <ArrowLeftRight className="h-5 w-5 text-[var(--tx-text-muted)]" />
              <p className="text-[13px] text-[var(--tx-text-secondary)]">
                No transactions recorded yet.
              </p>
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
