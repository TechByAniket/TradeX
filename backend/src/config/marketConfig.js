function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const MARKET_CONFIG = {
  provider: (process.env.MARKET_DATA_PROVIDER || "simulated").trim().toLowerCase(),
  simulationIntervalMs: parsePositiveInt(process.env.SIMULATION_INTERVAL_MS, 2500),
  persistIntervalMs: parsePositiveInt(process.env.SIMULATION_PERSIST_INTERVAL_MS, 30000),
  historyLimit: parsePositiveInt(process.env.SIMULATION_HISTORY_LIMIT, 500),
  // Bounded mean-reverting random walk parameters
  maxMovePercentPerTick: 0.0045, // max ±0.45% per tick
  maxDeviationPercent: 0.08, // ±8% bounds around reference price
  meanReversionStrength: 0.08, // pull back toward reference price
  // Manual Zyla NSE snapshot configuration (never called automatically)
  zylaApiUrl:
    process.env.ZYLA_API_URL ||
    "https://zylalabs.com/api/4521/indian+stock+exchange+api/5551/get+company+data+by+name",
  zylaRefreshCooldownMs: parsePositiveInt(
    process.env.ZYLA_REFRESH_COOLDOWN_MS,
    60000
  ),
  zylaRequestTimeoutMs: parsePositiveInt(
    process.env.ZYLA_REQUEST_TIMEOUT_MS,
    25000
  ),
};

export const ZYLA_STOCK_QUERIES = [
  { symbol: "RELIANCE", query: "Reliance Industries", aliases: ["RELIANCE"] },
  { symbol: "TCS", query: "TCS", aliases: ["TCS"] },
  { symbol: "INFY", query: "Infosys", aliases: ["INFY"] },
  { symbol: "HDFCBANK", query: "HDFC Bank", aliases: ["HDFCBANK"] },
  { symbol: "ICICIBANK", query: "ICICI Bank", aliases: ["ICICIBANK"] },
  { symbol: "SBIN", query: "State Bank of India", aliases: ["SBIN"] },
  { symbol: "ITC", query: "ITC", aliases: ["ITC"] },
  { symbol: "LT", query: "Larsen & Toubro", aliases: ["LT"] },
  { symbol: "BHARTIARTL", query: "Bharti Airtel", aliases: ["BHARTIARTL"] },
  { symbol: "TATAMOTORS", query: "Tata Motors", aliases: ["TATAMOTORS", "TMCV"] },
];

/**
 * Centralized simulation reference prices and per-stock characteristics.
 * Used only when a stock row in PostgreSQL does not yet have a current_price.
 * These are simulation reference values, not claims about real NSE market prices.
 */
export const SIMULATED_STOCK_PROFILES = {
  RELIANCE: {
    referencePrice: 1285.5,
    volatility: 0.0024,
    volumeMin: 1200,
    volumeMax: 6500,
    initialVolume: 485000,
  },
  TCS: {
    referencePrice: 4120.0,
    volatility: 0.002,
    volumeMin: 600,
    volumeMax: 3200,
    initialVolume: 215000,
  },
  INFY: {
    referencePrice: 1845.25,
    volatility: 0.0023,
    volumeMin: 900,
    volumeMax: 4800,
    initialVolume: 360000,
  },
  HDFCBANK: {
    referencePrice: 1732.8,
    volatility: 0.0019,
    volumeMin: 1400,
    volumeMax: 7200,
    initialVolume: 540000,
  },
  ICICIBANK: {
    referencePrice: 1298.4,
    volatility: 0.0022,
    volumeMin: 1300,
    volumeMax: 6800,
    initialVolume: 510000,
  },
  SBIN: {
    referencePrice: 824.6,
    volatility: 0.0027,
    volumeMin: 2000,
    volumeMax: 9500,
    initialVolume: 890000,
  },
  ITC: {
    referencePrice: 476.3,
    volatility: 0.0016,
    volumeMin: 2200,
    volumeMax: 10500,
    initialVolume: 960000,
  },
  LT: {
    referencePrice: 3580.0,
    volatility: 0.0024,
    volumeMin: 500,
    volumeMax: 2600,
    initialVolume: 185000,
  },
  BHARTIARTL: {
    referencePrice: 1615.75,
    volatility: 0.0025,
    volumeMin: 950,
    volumeMax: 4500,
    initialVolume: 310000,
  },
  TATAMOTORS: {
    referencePrice: 792.4,
    volatility: 0.0032,
    volumeMin: 2400,
    volumeMax: 11500,
    initialVolume: 1050000,
  },
};

export const DEFAULT_STOCK_PROFILE = {
  referencePrice: 1000.0,
  volatility: 0.0022,
  volumeMin: 800,
  volumeMax: 4000,
  initialVolume: 250000,
};
