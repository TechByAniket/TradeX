import { MARKET_CONFIG } from "../../config/marketConfig.js";
import { createHttpError } from "../../utils/httpError.js";
import { SimulatedMarketDataProvider } from "./simulatedMarketProvider.js";

if (MARKET_CONFIG.provider !== "simulated") {
  throw new Error(`Unsupported MARKET_DATA_PROVIDER: "${MARKET_CONFIG.provider}"`);
}

const provider = new SimulatedMarketDataProvider();

export const marketDataService = {
  getProviderName: () => MARKET_CONFIG.provider,
  isSimulated: () => true,
  start: (onUpdate) => provider.start(onUpdate),
  stop: () => provider.stop(),
  tick: () => provider.tick(),
  persistSnapshot: () => provider.persistSnapshot(),
  rebaseStocks: (snapshots) => provider.rebaseStocks(snapshots),
  getLatestPrices: () => provider.getLatestPrices(),

  getLatestPrice(symbol) {
    if (typeof symbol !== "string" || !symbol.trim()) throw createHttpError("Stock symbol is required", 400);
    const stock = provider.getLatestPrice(symbol);
    if (!stock) throw createHttpError(`Stock not found: ${symbol.trim().toUpperCase()}`, 404);
    if (!Number.isFinite(stock.currentPrice) || stock.currentPrice <= 0) {
      throw createHttpError(`Market price unavailable for ${stock.symbol}`, 503);
    }
    return stock;
  },

  getPriceHistory(symbol) {
    if (typeof symbol !== "string" || !symbol.trim()) throw createHttpError("Stock symbol is required", 400);
    const result = provider.getPriceHistory(symbol);
    if (!result) throw createHttpError(`Stock not found: ${symbol.trim().toUpperCase()}`, 404);
    return result;
  },
};

export default marketDataService;
