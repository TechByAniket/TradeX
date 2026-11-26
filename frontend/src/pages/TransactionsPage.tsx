import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";
import { AuthRequiredCard } from "@/components/common/AuthRequiredCard";
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
        <div className="h-8 w-44 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
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
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cash movements recorded for your executed BUY and SELL orders.
          </p>
        </div>

        <Button
          variant="outline"
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
          className="flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
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
        <CardHeader className="border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
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

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(type)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    typeFilter === type
                      ? "bg-indigo-600 text-white dark:bg-indigo-500"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  )}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && transactions.length === 0 ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-10 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70"
                />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-3.5">Date &amp; Time</th>
                    <th className="px-4 py-3.5">Stock</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5 text-right">Quantity</th>
                    <th className="px-4 py-3.5 text-right">Amount</th>
                    <th className="px-6 py-3.5 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredTransactions.map((tx) => {
                    const isCredit = tx.type === "SELL_CREDIT";

                    return (
                      <tr
                        key={tx.id}
                        className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-6 py-3.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                          {formatDateTime(tx.createdAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            to={`/stocks/${tx.symbol}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
                          >
                            {tx.symbol}
                          </Link>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {tx.companyName}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold",
                              isCredit
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            )}
                          >
                            {isCredit ? "SELL CREDIT" : "BUY DEBIT"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium tabular-nums text-slate-900 dark:text-slate-100">
                          {formatNumber(tx.quantity)}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3.5 text-right font-semibold tabular-nums",
                            isCredit
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {isCredit ? "+" : "-"}
                          {formatINR(tx.amount)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-50">
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
