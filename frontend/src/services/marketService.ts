import { apiClient } from "./apiClient";
import type {
  MarketStocksResponse,
  NseRefreshResponse,
  NseStatusResponse,
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

export async function fetchNseStatus(): Promise<NseStatusResponse> {
  const { data } = await apiClient.get<NseStatusResponse>("/market/nse-status");
  return data;
}

export async function triggerNseRefresh(): Promise<NseRefreshResponse> {
  // 10 parallel Zyla lookups can take ~15-20s, exceeding apiClient's 15s default
  const { data } = await apiClient.post<NseRefreshResponse>(
    "/market/nse-refresh",
    undefined,
    { timeout: 35000 }
  );
  return data;
}
