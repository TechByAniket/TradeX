import { MARKET_CONFIG } from "../../config/marketConfig.js";
import { SimulatedMarketDataProvider } from "./simulatedMarketProvider.js";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function createProvider(providerName) {
  switch (providerName) {
    case "simulated":
      return new SimulatedMarketDataProvider();
    default:
      throw new Error(`Unsupported MARKET_DATA_PROVIDER: "${providerName}"`);
  }
}

const provider = createProvider(MARKET_CONFIG.provider);

export const marketDataService = {
  getProviderName() {
    return MARKET_CONFIG.provider;
  },

  isSimulated() {
    return MARKET_CONFIG.provider === "simulated";
  },

  async start(onUpdate) {
    return provider.start(onUpdate);
  },

  async stop() {
    return provider.stop();
  },

  tick() {
    if (typeof provider.tick === "function") {
      return provider.tick();
    }
    return [];
  },

  async persistSnapshot() {
    if (typeof provider.persistSnapshot === "function") {
      return provider.persistSnapshot();
    }
  },

  getLatestPrices() {
    return provider.getLatestPrices();
  },

  getLatestPrice(symbol) {
    if (typeof symbol !== "string" || !symbol.trim()) {
      throw createHttpError("Stock symbol is required", 400);
    }

    const stock = provider.getLatestPrice(symbol);
    if (!stock) {
      throw createHttpError(`Stock not found: ${symbol.trim().toUpperCase()}`, 404);
    }

    if (!Number.isFinite(stock.currentPrice) || stock.currentPrice <= 0) {
      throw createHttpError(`Market price unavailable for ${stock.symbol}`, 503);
    }

    return stock;
  },

  getPriceHistory(symbol) {
    if (typeof symbol !== "string" || !symbol.trim()) {
      throw createHttpError("Stock symbol is required", 400);
    }

    const result = provider.getPriceHistory(symbol);
    if (!result) {
      throw createHttpError(`Stock not found: ${symbol.trim().toUpperCase()}`, 404);
    }

    return result;
  },
};

export default marketDataService;
