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
