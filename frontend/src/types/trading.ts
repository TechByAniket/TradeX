export type OrderType = "BUY" | "SELL";
export type OrderStatus = "PENDING" | "EXECUTED" | "REJECTED" | "CANCELLED";
export type TransactionType = "BUY_DEBIT" | "SELL_CREDIT";

export interface OrderRecord {
  id: string;
  symbol: string;
  companyName: string;
  orderType: OrderType;
  quantity: number;
  executionPrice: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
}

export interface TransactionRecord {
  id: string;
  orderId: string;
  symbol: string;
  companyName: string;
  quantity: number;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  currency: string;
  createdAt: string;
}

export interface TradeHoldingSummary {
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
}

export interface TradeExecutionResponse {
  success: true;
  order: OrderRecord;
  transaction: {
    id: string;
    type: TransactionType;
    amount: number;
    balanceAfter: number;
    currency: string;
    createdAt: string;
  };
  holding: TradeHoldingSummary | null;
  cashBalance: number;
}

export interface OrdersListResponse {
  success: true;
  count: number;
  orders: OrderRecord[];
}

export interface PortfolioSummary {
  id: string;
  currency: string;
  cashBalance: number;
  totalInvestedValue: number;
  totalCurrentHoldingsValue: number;
  totalPortfolioValue: number;
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPercent: number;
  simulatedMarket: boolean;
}

export interface PortfolioHolding {
  stockId: string;
  symbol: string;
  companyName: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

export interface PortfolioResponse {
  success: true;
  portfolio: PortfolioSummary;
  holdings: PortfolioHolding[];
}

export interface TransactionsListResponse {
  success: true;
  count: number;
  transactions: TransactionRecord[];
}
