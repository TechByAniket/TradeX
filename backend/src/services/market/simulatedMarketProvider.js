import prisma from "../../config/prisma.js";
import {
  DEFAULT_STOCK_PROFILE,
  MARKET_CONFIG,
  SIMULATED_STOCK_PROFILES,
} from "../../config/marketConfig.js";

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toOptionalNumber(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractNseSnapshotFromDbRow(stock) {
  return {
    industry: stock.industry || null,
    nseReferencePrice: toOptionalNumber(stock.nse_reference_price),
    nsePreviousClose: toOptionalNumber(stock.nse_previous_close),
    nseChange: toOptionalNumber(stock.nse_change),
    nsePercentChange: toOptionalNumber(stock.nse_percent_change),
    nseDayHigh: toOptionalNumber(stock.nse_day_high),
    nseDayLow: toOptionalNumber(stock.nse_day_low),
    nseYearHigh52W: toOptionalNumber(stock.nse_year_high_52w),
    nseYearLow52W: toOptionalNumber(stock.nse_year_low_52w),
    nseVolume: toOptionalNumber(stock.nse_volume),
    marketCapCr: toOptionalNumber(stock.market_cap_cr),
    quoteDate: stock.quote_date || null,
    quoteTime: stock.quote_time || null,
    nseQuoteFetchedAt: stock.nse_quote_fetched_at
      ? new Date(stock.nse_quote_fetched_at).toISOString()
      : null,
  };
}

function buildRebasedStockEntry(existing, snap, nowIso) {
  const rebasedPrice = round2(toOptionalNumber(snap.nseReferencePrice));
  const fetchedPrevClose = toOptionalNumber(snap.nsePreviousClose);
  const previousClose =
    fetchedPrevClose !== null && fetchedPrevClose > 0
      ? round2(fetchedPrevClose)
      : rebasedPrice;

  const change = round2(rebasedPrice - previousClose);
  const changePercent = round2((change / previousClose) * 100);

  const fetchedHigh = toOptionalNumber(snap.nseDayHigh);
  const fetchedLow = toOptionalNumber(snap.nseDayLow);
  const dayHigh =
    fetchedHigh !== null && fetchedHigh > 0
      ? Math.max(round2(fetchedHigh), rebasedPrice)
      : rebasedPrice;
  const dayLow =
    fetchedLow !== null && fetchedLow > 0
      ? Math.min(round2(fetchedLow), rebasedPrice)
      : rebasedPrice;

  return {
    ...existing,
    companyName: snap.companyName || existing.companyName,
    currentPrice: rebasedPrice,
    previousClose,
    change,
    changePercent,
    dayHigh,
    dayLow,
    lastUpdated: nowIso,
    industry: snap.industry ?? existing.industry ?? null,
    nseReferencePrice: rebasedPrice,
    nsePreviousClose: snap.nsePreviousClose ?? null,
    nseChange: snap.nseChange ?? null,
    nsePercentChange: snap.nsePercentChange ?? null,
    nseDayHigh: snap.nseDayHigh ?? null,
    nseDayLow: snap.nseDayLow ?? null,
    nseYearHigh52W: snap.nseYearHigh52W ?? null,
    nseYearLow52W: snap.nseYearLow52W ?? null,
    nseVolume: snap.nseVolume ?? null,
    marketCapCr: snap.marketCapCr ?? null,
    quoteDate: snap.quoteDate ?? null,
    quoteTime: snap.quoteTime ?? null,
    nseQuoteFetchedAt: snap.nseQuoteFetchedAt ?? nowIso,
  };
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
        ...extractNseSnapshotFromDbRow(stock),
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

  /**
   * Updates in-memory simulated prices and reference fields for stocks that
   * just succeeded in a manual NSE refresh, without restarting intervals.
   */
  rebaseStocks(updatedSnapshots = []) {
    if (!this.initialized || !Array.isArray(updatedSnapshots) || updatedSnapshots.length === 0) {
      return [];
    }

    const nowIso = new Date().toISOString();
    const rebased = [];

    for (const snap of updatedSnapshots) {
      const symbol = snap?.symbol?.toUpperCase();
      if (!symbol) continue;

      const existing = this.cache.get(symbol);
      const nextPrice = toOptionalNumber(snap.nseReferencePrice);
      if (!existing || nextPrice === null || nextPrice <= 0) {
        continue;
      }

      const rebasedPrice = round2(nextPrice);
      const profile = this.profiles.get(symbol) || DEFAULT_STOCK_PROFILE;
      this.profiles.set(symbol, { ...profile, referencePrice: rebasedPrice });

      const nextState = buildRebasedStockEntry(existing, snap, nowIso);
      this.cache.set(symbol, nextState);

      const points = this.history.get(symbol) || [];
      points.push({ price: rebasedPrice, timestamp: nowIso });
      if (points.length > this.historyLimit) {
        points.splice(0, points.length - this.historyLimit);
      }
      this.history.set(symbol, points);

      rebased.push(nextState);
    }

    if (rebased.length > 0 && this.onUpdate) {
      try {
        this.onUpdate(this.getLatestPrices(), nowIso);
      } catch (error) {
        console.error("[MarketSimulator] Rebase broadcast callback failed:", error.message);
      }
    }

    return rebased;
  }
}
