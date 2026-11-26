import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";
import { AuthRequiredCard } from "@/components/common/AuthRequiredCard";
import { Button } from "@/components/common/Button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/common/Card";
import { useAuth } from "@/context/AuthContext";
import { cn, formatINR, formatNumber } from "@/lib/utils";
import { getApiErrorMessage } from "@/services/apiClient";
import { fetchOrders } from "@/services/tradingService";
import type { OrderRecord, OrderStatus } from "@/types/trading";

type StatusFilter = "ALL" | OrderStatus;

const STATUS_TABS: StatusFilter[] = [
  "ALL",
  "EXECUTED",
  "PENDING",
  "REJECTED",
  "CANCELLED",
];

const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  EXECUTED:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  PENDING:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  REJECTED:
    "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  CANCELLED:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

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

export function OrdersPage() {
  const { user, authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const loadOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrders();
      setOrders(res.orders);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load order history."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "ALL") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  if (authLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (!user) {
    return (
      <AuthRequiredCard
        title="Sign in to view Orders"
        description="Sign in with your TradeX account to inspect your BUY and SELL order history."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
            Orders
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Complete history of your simulated BUY and SELL orders.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void loadOrders();
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
          <Button variant="outline" size="sm" onClick={() => void loadOrders()}>
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((status) => {
              const count =
                status === "ALL"
                  ? orders.length
                  : orders.filter((o) => o.status === status).length;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    statusFilter === status
                      ? "bg-indigo-600 text-white dark:bg-indigo-500"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  )}
                >
                  {status} ({count})
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && orders.length === 0 ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-10 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70"
                />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              {orders.length === 0
                ? "No orders have been placed yet."
                : `No ${statusFilter.toLowerCase()} orders found.`}
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
                    <th className="px-4 py-3.5 text-right">Execution Price</th>
                    <th className="px-4 py-3.5 text-right">Total Amount</th>
                    <th className="px-6 py-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-3.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/stocks/${order.symbol}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
                        >
                          {order.symbol}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {order.companyName}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold",
                            order.orderType === "BUY"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          )}
                        >
                          {order.orderType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium tabular-nums text-slate-900 dark:text-slate-100">
                        {formatNumber(order.quantity)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {formatINR(order.executionPrice)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                        {formatINR(order.totalAmount)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                            STATUS_BADGE_CLASSES[order.status]
                          )}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
