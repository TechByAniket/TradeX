import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, X } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { cn, formatINR, formatNumber } from "@/lib/utils";
import type { MarketStock } from "@/types/market";
import type { OrderType, TradeExecutionResponse } from "@/types/trading";

interface OrderConfirmationModalProps {
  isOpen: boolean;
  side: OrderType;
  stock: MarketStock;
  quantity: number;
  estimatedValue: number;
  availableCash: number;
  availableShares: number;
  submitting: boolean;
  orderResult: TradeExecutionResponse | null;
  sideActionClasses: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function OrderConfirmationModal({
  isOpen,
  side,
  stock,
  quantity,
  estimatedValue,
  availableCash,
  availableShares,
  submitting,
  orderResult,
  sideActionClasses,
  onClose,
  onConfirm,
}: OrderConfirmationModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="order-confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <motion.div
            key={
              orderResult
                ? `order-executed-${orderResult.order.id}`
                : "order-confirm-dialog"
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md space-y-5 rounded-2xl border border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] p-6 shadow-[var(--tx-shadow-glass)]"
          >
            {!orderResult ? (
              <OrderReviewStep
                side={side}
                stock={stock}
                quantity={quantity}
                estimatedValue={estimatedValue}
                availableCash={availableCash}
                availableShares={availableShares}
                submitting={submitting}
                sideActionClasses={sideActionClasses}
                onClose={onClose}
                onConfirm={onConfirm}
              />
            ) : (
              <OrderExecutedStep
                companyName={stock.companyName}
                submitting={submitting}
                orderResult={orderResult}
                onClose={onClose}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function OrderReviewStep({
  side,
  stock,
  quantity,
  estimatedValue,
  availableCash,
  availableShares,
  submitting,
  sideActionClasses,
  onClose,
  onConfirm,
}: {
  side: OrderType;
  stock: MarketStock;
  quantity: number;
  estimatedValue: number;
  availableCash: number;
  availableShares: number;
  submitting: boolean;
  sideActionClasses: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3
              id="order-modal-title"
              className="text-base font-semibold tracking-tight text-[var(--tx-text)]"
            >
              Confirm {side} Order
            </h3>
            <Badge variant={side === "BUY" ? "gain" : "loss"} size="sm">
              {side}
            </Badge>
          </div>
          <p className="text-xs text-[var(--tx-text-secondary)]">
            {stock.symbol} · {stock.companyName}
          </p>
        </div>

        <button
          type="button"
          aria-label="Close order confirmation"
          disabled={submitting}
          onClick={onClose}
          className="rounded-lg p-1.5 text-[var(--tx-text-muted)] transition-colors hover:bg-[var(--tx-surface)] hover:text-[var(--tx-text)] disabled:pointer-events-none disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2.5 rounded-xl border border-[var(--tx-border)] bg-[var(--tx-surface)] p-4 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--tx-text-secondary)]">Order Type</span>
          <span className="font-semibold text-[var(--tx-text)]">MARKET</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--tx-text-secondary)]">Quantity</span>
          <span className="font-semibold tabular-nums text-[var(--tx-text)]">
            {formatNumber(quantity)} {quantity === 1 ? "share" : "shares"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--tx-text-secondary)]">
            Reference Price
          </span>
          <span className="font-medium tabular-nums text-[var(--tx-text)]">
            {formatINR(stock.currentPrice)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--tx-border)] pt-2.5">
          <span className="font-medium text-[var(--tx-text)]">
            Estimated Order Value
          </span>
          <span className="text-sm font-semibold tabular-nums text-[var(--tx-text)]">
            {formatINR(estimatedValue)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--tx-text-muted)]">
          <span>
            {side === "BUY" ? "Available Cash" : "Available Holdings"}
          </span>
          <span className="tabular-nums text-[var(--tx-text-secondary)]">
            {side === "BUY"
              ? formatINR(availableCash)
              : `${formatNumber(availableShares)} shares`}
          </span>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-[var(--tx-text-secondary)]">
        Execution price is validated and finalized by the backend at submission.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          size="md"
          disabled={submitting}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={submitting}
          onClick={onConfirm}
          className={cn("border-0", sideActionClasses)}
        >
          {submitting ? "Submitting..." : `Confirm ${side}`}
        </Button>
      </div>
    </>
  );
}

function OrderExecutedStep({
  companyName,
  submitting,
  orderResult,
  onClose,
}: {
  companyName: string;
  submitting: boolean;
  orderResult: TradeExecutionResponse;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[var(--tx-gain)]" />
            <h3
              id="order-modal-title"
              className="text-base font-semibold tracking-tight text-[var(--tx-text)]"
            >
              Order {orderResult.order.status}
            </h3>
            <Badge
              variant={orderResult.order.orderType === "BUY" ? "gain" : "loss"}
              size="sm"
            >
              {orderResult.order.orderType}
            </Badge>
          </div>
          <p className="text-xs text-[var(--tx-text-secondary)]">
            {orderResult.order.symbol} · {companyName}
          </p>
        </div>

        <button
          type="button"
          aria-label="Close order receipt"
          disabled={submitting}
          onClick={onClose}
          className="rounded-lg p-1.5 text-[var(--tx-text-muted)] transition-colors hover:bg-[var(--tx-surface)] hover:text-[var(--tx-text)] disabled:pointer-events-none disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2.5 rounded-xl border border-[var(--tx-gain-border)] bg-[var(--tx-gain-bg)] p-4 text-xs text-[var(--tx-text)]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--tx-text-secondary)]">Quantity</span>
          <span className="font-semibold tabular-nums text-[var(--tx-text)]">
            {formatNumber(orderResult.order.quantity)}{" "}
            {orderResult.order.quantity === 1 ? "share" : "shares"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--tx-text-secondary)]">
            Execution Price
          </span>
          <span className="font-medium tabular-nums text-[var(--tx-text)]">
            {formatINR(orderResult.order.executionPrice)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-[var(--tx-text)]">
            Total Amount
          </span>
          <span className="text-sm font-semibold tabular-nums text-[var(--tx-text)]">
            {formatINR(orderResult.order.totalAmount)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--tx-gain-border)] pt-2.5 font-medium">
          <span className="text-[var(--tx-text)]">Updated Cash</span>
          <span className="text-sm font-semibold tabular-nums text-[var(--tx-gain)]">
            {formatINR(orderResult.cashBalance)}
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="primary"
        size="md"
        disabled={submitting}
        onClick={onClose}
        className="w-full"
      >
        Done
      </Button>
    </>
  );
}
