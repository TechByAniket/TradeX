import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/common/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
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

  useEffect(() => {
    setSide(initialSide);
    setConfirming(false);
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
      setConfirming(false);
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

  return (
    <Card>
      <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Place Order</CardTitle>
            <CardDescription>{stock.symbol} · MARKET order</CardDescription>
          </div>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            MARKET
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => handleSideChange("BUY")}
            className={cn(
              "rounded-md py-1.5 text-xs font-semibold transition-colors",
              side === "BUY"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            BUY
          </button>
          <button
            type="button"
            onClick={() => handleSideChange("SELL")}
            className={cn(
              "rounded-md py-1.5 text-xs font-semibold transition-colors",
              side === "SELL"
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            SELL
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        {!user ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <span>
                Sign in with your TradeX account to place simulated BUY or SELL
                orders.
              </span>
            </div>

            <form onSubmit={handleQuickLogin} className="space-y-3">
              <div>
                <label
                  htmlFor="trade-login-email"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Email
                </label>
                <input
                  id="trade-login-email"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="trade-login-password"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Password
                </label>
                <input
                  id="trade-login-password"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {loginError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
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
              <div className="flex items-center justify-between">
                <label
                  htmlFor="order-quantity"
                  className="text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Quantity (Shares)
                </label>
                {side === "SELL" && availableShares > 0 && (
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(String(availableShares))}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    Max: {formatNumber(availableShares)}
                  </button>
                )}
              </div>
              <input
                id="order-quantity"
                type="number"
                min={1}
                step={1}
                value={quantityInput}
                onChange={(e) => handleQuantityChange(e.target.value)}
                disabled={submitting}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium tabular-nums text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            {/* Order breakdown */}
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Reference Price
                </span>
                <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">
                  {formatINR(stock.currentPrice)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Estimated Value
                </span>
                <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                  {isValidQty ? formatINR(estimatedValue) : "—"}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
                {side === "BUY" ? (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      Available Cash
                    </span>
                    <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">
                      {portfolioLoading && !portfolioData
                        ? "Loading..."
                        : formatINR(availableCash)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      Available Holdings
                    </span>
                    <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">
                      {portfolioLoading && !portfolioData
                        ? "Loading..."
                        : `${formatNumber(availableShares)} shares`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {validationError && (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {validationError}
              </p>
            )}

            {orderError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            {!confirming ? (
              <Button
                type="submit"
                variant="primary"
                disabled={Boolean(validationError) || submitting}
                className={cn(
                  "w-full",
                  side === "SELL" &&
                    "bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
                )}
              >
                Review {side} Order
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/30">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Confirm {side} {formatNumber(parsedQty)} {stock.symbol}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Estimated {formatINR(estimatedValue)}. Final execution price is
                  determined by the backend at submission.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={submitting}
                    onClick={() => setConfirming(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={submitting}
                    onClick={() => {
                      void handleConfirmOrder();
                    }}
                    className={cn(
                      side === "SELL" &&
                        "bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
                    )}
                  >
                    {submitting ? "Submitting..." : `Confirm ${side}`}
                  </Button>
                </div>
              </div>
            )}

            {orderResult && (
              <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                <div className="flex items-center justify-between gap-2 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Order {orderResult.order.status}
                  </span>
                  <span>
                    {orderResult.order.orderType} · {orderResult.order.symbol}
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-emerald-800 dark:text-emerald-200">
                  <div className="flex justify-between">
                    <span>Quantity</span>
                    <span className="tabular-nums">
                      {formatNumber(orderResult.order.quantity)} shares
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Execution Price</span>
                    <span className="tabular-nums">
                      {formatINR(orderResult.order.executionPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total Amount</span>
                    <span className="tabular-nums">
                      {formatINR(orderResult.order.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-200/70 pt-1 dark:border-emerald-800">
                    <span>Updated Cash</span>
                    <span className="tabular-nums">
                      {formatINR(orderResult.cashBalance)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
