import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Lock } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { OrderConfirmationModal } from "./OrderConfirmationModal";
import { Button } from "@/components/common/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { useAuth } from "@/context/AuthContext";
import { cn, formatINR, formatNumber } from "@/lib/utils";
import { getApiErrorMessage, setStoredToken } from "@/services/apiClient";
import { loginUser } from "@/services/authService";
import {
  fetchPortfolio,
  placeBuyOrder,
  placeSellOrder,
} from "@/services/tradingService";
import type { MarketStock } from "@/types/market";
import type {
  OrderType,
  PortfolioResponse,
  TradeExecutionResponse,
} from "@/types/trading";

interface OrderTicketProps {
  stock: MarketStock;
  initialSide?: OrderType;
}

export function OrderTicket({
  stock,
  initialSide = "BUY",
}: OrderTicketProps) {
  const { user, refreshAuth } = useAuth();

  const [side, setSide] = useState<OrderType>(initialSide);
  const [quantityInput, setQuantityInput] = useState("1");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<TradeExecutionResponse | null>(
    null
  );

  const [portfolioData, setPortfolioData] = useState<PortfolioResponse | null>(
    null
  );
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  // Quick sign-in state when user is not yet authenticated
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const closeOrderModal = useCallback(() => {
    if (submitting) return;
    setConfirming(false);
    setOrderResult(null);
  }, [submitting]);

  useEffect(() => {
    setSide(initialSide);
    setConfirming(false);
    setOrderResult(null);
  }, [initialSide, stock.symbol]);

  const loadPortfolio = useCallback(async () => {
    if (!user) {
      setPortfolioData(null);
      return;
    }

    setPortfolioLoading(true);
    try {
      const data = await fetchPortfolio();
      setPortfolioData(data);
    } catch {
      // Errors on individual trade attempts are surfaced directly
    } finally {
      setPortfolioLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  const parsedQty = Number(quantityInput);
  const isValidQty = Number.isSafeInteger(parsedQty) && parsedQty > 0;

  const availableCash = portfolioData?.portfolio.cashBalance ?? 0;
  const currentHolding = portfolioData?.holdings.find(
    (h) => h.symbol === stock.symbol
  );
  const availableShares = currentHolding?.quantity ?? 0;

  const estimatedValue = isValidQty ? stock.currentPrice * parsedQty : 0;

  const validationError = (() => {
    if (!quantityInput.trim()) return "Enter a quantity";
    if (!isValidQty) return "Quantity must be a positive whole number";
    if (side === "BUY" && portfolioData && estimatedValue > availableCash) {
      return "Insufficient cash balance for estimated order value";
    }
    if (side === "SELL" && portfolioData && parsedQty > availableShares) {
      return `Insufficient holdings (you own ${availableShares} shares)`;
    }
    return null;
  })();

  const handleSideChange = (nextSide: OrderType) => {
    setSide(nextSide);
    setConfirming(false);
    setOrderError(null);
    setOrderResult(null);
  };

  const handleQuantityChange = (value: string) => {
    setQuantityInput(value);
    setConfirming(false);
    setOrderError(null);
    setOrderResult(null);
  };

  const handleReviewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (validationError || !isValidQty) return;
    setOrderError(null);
    setOrderResult(null);
    setConfirming(true);
  };

  const handleConfirmOrder = async () => {
    if (submitting || validationError || !isValidQty) return;

    setSubmitting(true);
    setOrderError(null);

    try {
      const result =
        side === "BUY"
          ? await placeBuyOrder({ symbol: stock.symbol, quantity: parsedQty })
          : await placeSellOrder({ symbol: stock.symbol, quantity: parsedQty });

      setOrderResult(result);
      await Promise.all([loadPortfolio(), refreshAuth()]);
    } catch (err) {
      setOrderError(
        getApiErrorMessage(err, `Unable to execute ${side} order.`)
      );
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginLoading) return;

    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await loginUser({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      setStoredToken(res.token);
      setLoginPassword("");
      await refreshAuth();
    } catch (err) {
      setLoginError(getApiErrorMessage(err, "Invalid email or password."));
    } finally {
      setLoginLoading(false);
    }
  };

  const sideActionClasses =
    side === "BUY"
      ? "bg-emerald-600 text-white hover:bg-emerald-500 dark:border dark:border-[var(--tx-gain-border)] dark:bg-emerald-500/18 dark:text-[var(--tx-gain)] dark:hover:bg-emerald-500/26"
      : "bg-red-600 text-white hover:bg-red-500 dark:border dark:border-[var(--tx-loss-border)] dark:bg-red-500/18 dark:text-[var(--tx-loss)] dark:hover:bg-red-500/26";

  return (
    <Card variant="elevated">
      <CardHeader className="border-b border-[var(--tx-border)] pb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="tx-heading-section">Order Ticket</CardTitle>
            <CardDescription>{stock.symbol} · Execution desk</CardDescription>
          </div>
          <Badge variant="neutral" size="sm">
            MARKET
          </Badge>
        </div>

        <div
          role="tablist"
          aria-label="Order side"
          className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-[var(--tx-border)] bg-[var(--tx-bg)] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={side === "BUY"}
            onClick={() => handleSideChange("BUY")}
            className={cn(
              "cursor-pointer rounded-md border py-1.5 text-xs font-semibold tracking-[0.04em] transition-all duration-150",
              side === "BUY"
                ? "border-[var(--tx-gain-border)] bg-[var(--tx-gain-bg)] text-[var(--tx-gain)]"
                : "border-transparent text-[var(--tx-text-muted)] hover:text-[var(--tx-text-secondary)]"
            )}
          >
            BUY
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={side === "SELL"}
            onClick={() => handleSideChange("SELL")}
            className={cn(
              "cursor-pointer rounded-md border py-1.5 text-xs font-semibold tracking-[0.04em] transition-all duration-150",
              side === "SELL"
                ? "border-[var(--tx-loss-border)] bg-[var(--tx-loss-bg)] text-[var(--tx-loss)]"
                : "border-transparent text-[var(--tx-text-muted)] hover:text-[var(--tx-text-secondary)]"
            )}
          >
            SELL
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        {!user ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-lg border border-[var(--tx-border)] bg-[var(--tx-bg)]/70 p-3 text-xs leading-relaxed text-[var(--tx-text-secondary)]">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tx-text-muted)]" />
              <span>
                Sign in with your TradeX account to place simulated BUY or SELL
                orders.
              </span>
            </div>

            <form onSubmit={handleQuickLogin} className="space-y-3">
              <Input
                id="trade-login-email"
                label="Email"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="you@example.com"
              />

              <Input
                id="trade-login-password"
                label="Password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
              />

              {loginError && (
                <p className="text-xs font-medium text-[var(--tx-loss)]">
                  {loginError}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={loginLoading}
              >
                {loginLoading ? "Signing in..." : "Sign in to Trade"}
              </Button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            {/* Quantity input */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="order-quantity"
                  className="text-xs font-medium text-[var(--tx-text-secondary)]"
                >
                  Quantity (Shares)
                </label>
                {side === "SELL" && availableShares > 0 && (
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(String(availableShares))}
                    className="cursor-pointer text-xs font-medium text-[var(--tx-text)] underline decoration-[var(--tx-border-hover)] underline-offset-4 transition-opacity hover:opacity-80"
                  >
                    Max: {formatNumber(availableShares)}
                  </button>
                )}
              </div>
              <Input
                id="order-quantity"
                type="number"
                min={1}
                step={1}
                value={quantityInput}
                onChange={(e) => handleQuantityChange(e.target.value)}
                disabled={submitting}
                className="h-10 text-sm font-semibold tabular-nums"
              />
            </div>

            {/* Order breakdown */}
            <div className="space-y-2.5 rounded-xl border border-[var(--tx-border)] bg-[var(--tx-bg)]/60 p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--tx-text-muted)]">
                  Reference Price
                </span>
                <span className="font-medium tabular-nums text-[var(--tx-text)]">
                  {formatINR(stock.currentPrice)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--tx-text-muted)]">
                  Estimated Value
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-[var(--tx-text)]">
                  {isValidQty ? formatINR(estimatedValue) : "—"}
                </span>
              </div>

              <div className="border-t border-[var(--tx-border)] pt-2.5">
                {side === "BUY" ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--tx-text-muted)]">
                      Available Cash
                    </span>
                    <span className="font-medium tabular-nums text-[var(--tx-text)]">
                      {portfolioLoading && !portfolioData
                        ? "Loading..."
                        : formatINR(availableCash)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--tx-text-muted)]">
                      Available Holdings
                    </span>
                    <span className="font-medium tabular-nums text-[var(--tx-text)]">
                      {portfolioLoading && !portfolioData
                        ? "Loading..."
                        : `${formatNumber(availableShares)} shares`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {validationError && (
              <p className="text-xs font-medium text-[var(--tx-loss)]">
                {validationError}
              </p>
            )}

            {orderError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-[var(--tx-loss-border)] bg-[var(--tx-loss-bg)] p-3 text-xs text-[var(--tx-loss)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="secondary"
              size="lg"
              disabled={Boolean(validationError) || submitting}
              className={cn("w-full border-0", sideActionClasses)}
            >
              {side} {stock.symbol}
            </Button>
          </form>
        )}
      </CardContent>

      <OrderConfirmationModal
        isOpen={confirming}
        side={side}
        stock={stock}
        quantity={parsedQty}
        estimatedValue={estimatedValue}
        availableCash={availableCash}
        availableShares={availableShares}
        submitting={submitting}
        orderResult={orderResult}
        sideActionClasses={sideActionClasses}
        onClose={closeOrderModal}
        onConfirm={() => {
          void handleConfirmOrder();
        }}
      />
    </Card>
  );
}
