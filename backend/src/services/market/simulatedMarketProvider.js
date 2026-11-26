import prisma from "../../config/prisma.js";
import {
  DEFAULT_STOCK_PROFILE,
  MARKET_CONFIG,
  SIMULATED_STOCK_PROFILES,
} from "../../config/marketConfig.js";

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Triangular sample in [-1, 1] peaking at 0 so small moves occur more often than large ones.
 */
function sampleTriangular() {
  return Math.random() + Math.random() - 1;
}

export class SimulatedMarketDataProvider {
  constructor(options = {}) {
    this.simulationIntervalMs =
      options.simulationIntervalMs || MARKET_CONFIG.simulationIntervalMs;
    this.persistIntervalMs =
      options.persistIntervalMs || MARKET_CONFIG.persistIntervalMs;
    this.historyLimit = options.historyLimit || MARKET_CONFIG.historyLimit;
    this.maxMovePercentPerTick =
      options.maxMovePercentPerTick || MARKET_CONFIG.maxMovePercentPerTick;
    this.maxDeviationPercent =
      options.maxDeviationPercent || MARKET_CONFIG.maxDeviationPercent;
    this.meanReversionStrength =
      options.meanReversionStrength || MARKET_CONFIG.meanReversionStrength;

    this.cache = new Map();
    this.history = new Map();
    this.profiles = new Map();
    this.running = false;
    this.initialized = false;
    this.startingPromise = null;
    this.simulationTimer = null;
    this.persistTimer = null;
    this.isPersisting = false;
    this.onUpdate = null;
  }

  async start(onUpdate) {
    if (onUpdate) {
      this.onUpdate = onUpdate;
    }

    if (this.running) {
      return;
    }

    if (this.startingPromise) {
      return this.startingPromise;
    }

    this.startingPromise = (async () => {
      try {
        await this.initializeCache();
        this.running = true;

        this.simulationTimer = setInterval(() => {
          this.tick();
        }, this.simulationIntervalMs);

        this.persistTimer = setInterval(() => {
          this.persistSnapshot();
        }, this.persistIntervalMs);

        console.log(
          `[MarketSimulator] Started for ${this.cache.size} stocks (tick=${this.simulationIntervalMs}ms, persist=${this.persistIntervalMs}ms)`
        );
      } finally {
        this.startingPromise = null;
      }
    })();

    return this.startingPromise;
  }

  async initializeCache() {
    const stocks = await prisma.stocks.findMany({
      orderBy: { symbol: "asc" },
    });

    if (stocks.length === 0) {
      throw new Error("No stock records found in database to initialize market simulator");
    }

    const nowIso = new Date().toISOString();
    let needsInitialPersist = false;

    this.cache.clear();
    this.history.clear();
    this.profiles.clear();

    for (const stock of stocks) {
      const symbol = stock.symbol.toUpperCase();
      const profile = SIMULATED_STOCK_PROFILES[symbol] || DEFAULT_STOCK_PROFILE;

      const dbPrice = stock.current_price !== null ? Number(stock.current_price) : null;
      const hasValidDbPrice = Number.isFinite(dbPrice) && dbPrice > 0;
      const startPrice = round2(hasValidDbPrice ? dbPrice : profile.referencePrice);

      if (!hasValidDbPrice) {
        needsInitialPersist = true;
      }

      this.profiles.set(symbol, {
        ...profile,
        referencePrice: startPrice,
      });

      const entry = {
        id: stock.id,
        symbol,
        companyName: stock.company_name,
        exchange: stock.exchange,
        currency: stock.currency,
        currentPrice: startPrice,
        previousClose: startPrice,
        change: 0,
        changePercent: 0,
        dayHigh: startPrice,
        dayLow: startPrice,
        volume: profile.initialVolume,
        lastUpdated: nowIso,
        simulated: true,
      };

      this.cache.set(symbol, entry);
      this.history.set(symbol, [{ price: startPrice, timestamp: nowIso }]);
    }

    this.initialized = true;

    if (needsInitialPersist) {
      await this.persistSnapshot();
    }
  }

  tick() {
    if (!this.initialized) {
      return [];
    }

    const nowIso = new Date().toISOString();
    const updatedList = [];

    for (const [symbol, state] of this.cache.entries()) {
      try {
        const profile = this.profiles.get(symbol) || DEFAULT_STOCK_PROFILE;
        const refPrice = profile.referencePrice;

        const deviationRatio = (state.currentPrice - refPrice) / refPrice;
        const reversion = -deviationRatio * this.meanReversionStrength;
        const shock = sampleTriangular() * profile.volatility;

        let pctMove = reversion + shock;
        pctMove = Math.max(
          -this.maxMovePercentPerTick,
          Math.min(this.maxMovePercentPerTick, pctMove)
        );

        const minBound = Math.max(0.01, round2(refPrice * (1 - this.maxDeviationPercent)));
        const maxBound = round2(refPrice * (1 + this.maxDeviationPercent));

        let nextPrice = round2(state.currentPrice * (1 + pctMove));
        nextPrice = Math.max(minBound, Math.min(maxBound, nextPrice));

        if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
          continue;
        }

        const change = round2(nextPrice - state.previousClose);
        const changePercent = round2((change / state.previousClose) * 100);
        const dayHigh = Math.max(state.dayHigh, nextPrice);
        const dayLow = Math.min(state.dayLow, nextPrice);
        const volumeIncrement = randomInt(profile.volumeMin, profile.volumeMax);
        const volume = state.volume + volumeIncrement;

        const nextState = {
          ...state,
          currentPrice: nextPrice,
          change,
          changePercent,
          dayHigh,
          dayLow,
          volume,
          lastUpdated: nowIso,
        };

        this.cache.set(symbol, nextState);

        const points = this.history.get(symbol) || [];
        points.push({ price: nextPrice, timestamp: nowIso });
        if (points.length > this.historyLimit) {
          points.splice(0, points.length - this.historyLimit);
        }
        this.history.set(symbol, points);

        updatedList.push(nextState);
      } catch (error) {
        console.error(`[MarketSimulator] Failed to update ${symbol}:`, error.message);
      }
    }

    if (updatedList.length > 0 && this.onUpdate) {
      try {
        this.onUpdate(updatedList, nowIso);
      } catch (error) {
        console.error("[MarketSimulator] Update broadcast callback failed:", error.message);
      }
    }

    return updatedList;
  }

  async persistSnapshot() {
    if (!this.initialized || this.isPersisting || this.cache.size === 0) {
      return;
    }

    this.isPersisting = true;
    const now = new Date();

    try {
      const updates = Array.from(this.cache.values()).map((stock) =>
        prisma.stocks.update({
          where: { id: stock.id },
          data: {
            current_price: stock.currentPrice,
            price_updated_at: now,
            updated_at: now,
          },
        })
      );

      await prisma.$transaction(updates);
    } catch (error) {
      console.error("[MarketSimulator] Failed to persist prices to PostgreSQL:", error.message);
    } finally {
      this.isPersisting = false;
    }
  }

  async stop() {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }

    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }

    this.running = false;

    if (this.initialized) {
      await this.persistSnapshot();
    }
  }

  getLatestPrices() {
    return Array.from(this.cache.values()).map((item) => ({ ...item }));
  }

  getLatestPrice(symbol) {
    if (typeof symbol !== "string") return null;
    const item = this.cache.get(symbol.trim().toUpperCase());
    return item ? { ...item } : null;
  }

  getPriceHistory(symbol) {
    if (typeof symbol !== "string") return null;
    const key = symbol.trim().toUpperCase();
    const stock = this.cache.get(key);
    if (!stock) return null;

    const points = this.history.get(key) || [];
    return {
      stock: { ...stock },
      history: points.map((p) => ({ ...p })),
    };
  }
}
