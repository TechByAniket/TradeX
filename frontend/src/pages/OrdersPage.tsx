import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ClipboardList, RefreshCw } from "lucide-react";
import { AuthRequiredCard } from "@/components/common/AuthRequiredCard";
import { Badge, type BadgeVariant } from "@/components/common/Badge";
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

const STATUS_BADGE_VARIANT: Record<OrderStatus, BadgeVariant> = {
  EXECUTED: "gain",
  PENDING: "warning",
  REJECTED: "loss",
  CANCELLED: "neutral",
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
        <div className="h-8 w-40 animate-pulse rounded-lg bg-[var(--tx-surface-elevated)]" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-[var(--tx-surface-elevated)]" />
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
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--tx-border)] pb-6 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <p className="text-xs font-medium tracking-[0.02em] text-[var(--tx-text-muted)]">
            Execution Blotter · Simulated Orders
          </p>
          <h1 className="tx-heading-page text-2xl sm:text-[26px]">Orders</h1>
          <p className="text-[13px] text-[var(--tx-text-secondary)]">
            Complete ledger of your simulated BUY and SELL executions.
          </p>
        </div>

        <Button
          variant="secondary"
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
          className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[var(--tx-loss-border)] bg-[var(--tx-loss-bg)] px-4 py-3 text-[13px] text-[var(--tx-loss)] sm:flex-row sm:items-center"
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
        <CardHeader className="border-b border-[var(--tx-border)] pb-4">
          <div className="inline-flex w-fit flex-wrap items-center gap-1 rounded-lg border border-[var(--tx-border)] bg-[var(--tx-bg)] p-1">
            {STATUS_TABS.map((status) => {
              const count =
                status === "ALL"
                  ? orders.length
                  : orders.filter((o) => o.status === status).length;
              const isActive = statusFilter === status;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium tabular-nums transition-all duration-150",
                    isActive
                      ? "border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] text-[var(--tx-text)] shadow-2xs"
                      : "border-transparent text-[var(--tx-text-muted)] hover:text-[var(--tx-text-secondary)]"
                  )}
                >
                  {status}{" "}
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
          {loading && orders.length === 0 ? (
            <div className="space-y-2.5 p-5 sm:p-6">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-10 w-full animate-pulse rounded-lg bg-[var(--tx-surface-elevated)]"
                />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-14 text-center">
              <ClipboardList className="h-5 w-5 text-[var(--tx-text-muted)]" />
              <p className="text-[13px] text-[var(--tx-text-secondary)]">
                {orders.length === 0
                  ? "No orders have been placed yet."
                  : `No ${statusFilter.toLowerCase()} orders found.`}
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
                    <th className="tx-label px-4 py-3.5">Side</th>
                    <th className="tx-label px-4 py-3.5 text-right">
                      Quantity
                    </th>
                    <th className="tx-label px-4 py-3.5 text-right">
                      Exec Price
                    </th>
                    <th className="tx-label px-4 py-3.5 text-right">
                      Total Amount
                    </th>
                    <th className="tx-label px-5 py-3.5 text-right sm:px-6">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--tx-border)]">
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="group transition-colors duration-150 hover:bg-[var(--tx-surface-hover)]"
                    >
                      <td className="px-5 py-3.5 text-xs tabular-nums text-[var(--tx-text-muted)] sm:px-6">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/stocks/${order.symbol}`}
                          className="text-[13px] font-semibold tracking-[0.02em] text-[var(--tx-text)] transition-opacity group-hover:opacity-90"
                        >
                          {order.symbol}
                        </Link>
                        <p className="text-xs text-[var(--tx-text-muted)]">
                          {order.companyName}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={order.orderType === "BUY" ? "gain" : "loss"}
                          size="sm"
                        >
                          {order.orderType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right text-[13px] font-medium tabular-nums text-[var(--tx-text)]">
                        {formatNumber(order.quantity)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[13px] tabular-nums text-[var(--tx-text-secondary)]">
                        {formatINR(order.executionPrice)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[13px] font-semibold tabular-nums text-[var(--tx-text)]">
                        {formatINR(order.totalAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-right sm:px-6">
                        <Badge
                          variant={STATUS_BADGE_VARIANT[order.status]}
                          size="sm"
                        >
                          {order.status}
                        </Badge>
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
