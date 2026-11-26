import { apiClient } from "./apiClient";
import type {
  MarketStocksResponse,
  StockDetailResponse,
  StockHistoryResponse,
} from "@/types/market";

export async function fetchMarketStocks(): Promise<MarketStocksResponse> {
  const { data } = await apiClient.get<MarketStocksResponse>("/market/stocks");
  return data;
}

export async function fetchStockBySymbol(
  symbol: string
): Promise<StockDetailResponse> {
  const { data } = await apiClient.get<StockDetailResponse>(
    `/market/stocks/${encodeURIComponent(symbol.trim().toUpperCase())}`
  );
  return data;
}

export async function fetchStockHistory(
  symbol: string
): Promise<StockHistoryResponse> {
  const { data } = await apiClient.get<StockHistoryResponse>(
    `/market/stocks/${encodeURIComponent(symbol.trim().toUpperCase())}/history`
  );
  return data;
}
