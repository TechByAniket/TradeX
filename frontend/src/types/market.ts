export interface MarketStock {
  id: string;
  symbol: string;
  companyName: string;
  exchange: string;
  currency: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  lastUpdated: string;
  simulated: boolean;
  industry?: string | null;
  nseReferencePrice?: number | null;
  nsePreviousClose?: number | null;
  nseChange?: number | null;
  nsePercentChange?: number | null;
  nseDayHigh?: number | null;
  nseDayLow?: number | null;
  nseYearHigh52W?: number | null;
  nseYearLow52W?: number | null;
  nseVolume?: number | null;
  marketCapCr?: number | null;
  quoteDate?: string | null;
  quoteTime?: string | null;
  nseQuoteFetchedAt?: string | null;
}

export interface StockHistoryPoint {
  price: number;
  timestamp: string;
}

export interface MarketStocksResponse {
  success: true;
  provider: string;
  simulated: boolean;
  count: number;
  stocks: MarketStock[];
}

export interface StockDetailResponse {
  success: true;
  provider: string;
  simulated: boolean;
  stock: MarketStock;
}

export interface StockHistoryResponse {
  success: true;
  provider: string;
  simulated: boolean;
  symbol: string;
  currentPrice: number;
  lastUpdated: string;
  count: number;
  history: StockHistoryPoint[];
}

export interface MarketSocketPayload {
  provider: string;
  simulated: boolean;
  stocks: MarketStock[];
  timestamp: string;
}

export interface NseStatusResponse {
  success: true;
  isRefreshing: boolean;
  lastFetchedAt: string | null;
  cooldownSeconds: number;
  remainingCooldownSeconds: number;
}

export interface NseRefreshFailure {
  symbol: string;
  error: string;
}

export interface NseRefreshResponse {
  success: true;
  fetchedAt: string | null;
  cooldownSeconds: number;
  updatedCount: number;
  failedCount: number;
  updated: Array<{
    id: string;
    symbol: string;
    companyName: string;
    industry: string | null;
    nseReferencePrice: number;
    nsePreviousClose: number | null;
    nseChange: number | null;
    nsePercentChange: number | null;
    nseDayHigh: number | null;
    nseDayLow: number | null;
    nseYearHigh52W: number | null;
    nseYearLow52W: number | null;
    nseVolume: number | null;
    marketCapCr: number | null;
    quoteDate: string | null;
    quoteTime: string | null;
    nseQuoteFetchedAt: string;
  }>;
  failed: NseRefreshFailure[];
}
