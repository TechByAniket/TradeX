import { apiClient } from "./apiClient";
import type {
  OrdersListResponse,
  PortfolioResponse,
  TradeExecutionResponse,
  TransactionsListResponse,
} from "@/types/trading";

export interface PlaceOrderPayload {
  symbol: string;
  quantity: number;
}

export async function placeBuyOrder(
  payload: PlaceOrderPayload
): Promise<TradeExecutionResponse> {
  const { data } = await apiClient.post<TradeExecutionResponse>("/orders/buy", {
    symbol: payload.symbol.trim().toUpperCase(),
    quantity: payload.quantity,
  });
  return data;
}

export async function placeSellOrder(
  payload: PlaceOrderPayload
): Promise<TradeExecutionResponse> {
  const { data } = await apiClient.post<TradeExecutionResponse>(
    "/orders/sell",
    {
      symbol: payload.symbol.trim().toUpperCase(),
      quantity: payload.quantity,
    }
  );
  return data;
}

export async function fetchPortfolio(): Promise<PortfolioResponse> {
  const { data } = await apiClient.get<PortfolioResponse>("/portfolio");
  return data;
}

export async function fetchOrders(): Promise<OrdersListResponse> {
  const { data } = await apiClient.get<OrdersListResponse>("/orders");
  return data;
}

export async function fetchTransactions(): Promise<TransactionsListResponse> {
  const { data } = await apiClient.get<TransactionsListResponse>(
    "/portfolio/transactions"
  );
  return data;
}
