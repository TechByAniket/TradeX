import prisma from "../../config/prisma.js";
import { DEFAULT_STOCK_PROFILE, MARKET_CONFIG, SIMULATED_STOCK_PROFILES } from "../../config/marketConfig.js";

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const toOptNum = (value) => (value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sampleTriangular = () => Math.random() + Math.random() - 1;

function extractNseFields(row) {
  return {
    industry: row.industry || null,
    nseReferencePrice: toOptNum(row.nse_reference_price ?? row.nseReferencePrice),
    nsePreviousClose: toOptNum(row.nse_previous_close ?? row.nsePreviousClose),
    nseChange: toOptNum(row.nse_change ?? row.nseChange),
    nsePercentChange: toOptNum(row.nse_percent_change ?? row.nsePercentChange),
    nseDayHigh: toOptNum(row.nse_day_high ?? row.nseDayHigh),
    nseDayLow: toOptNum(row.nse_day_low ?? row.nseDayLow),
    nseYearHigh52W: toOptNum(row.nse_year_high_52w ?? row.nseYearHigh52W),
    nseYearLow52W: toOptNum(row.nse_year_low_52w ?? row.nseYearLow52W),
    nseVolume: toOptNum(row.nse_volume ?? row.nseVolume),
    marketCapCr: toOptNum(row.market_cap_cr ?? row.marketCapCr),
    quoteDate: row.quote_date ?? row.quoteDate ?? null,
    quoteTime: row.quote_time ?? row.quoteTime ?? null,
    nseQuoteFetchedAt: row.nse_quote_fetched_at
      ? new Date(row.nse_quote_fetched_at).toISOString()
      : row.nseQuoteFetchedAt ?? null,
  };
}

function computeNextTick(state, profile, limits, nowIso) {
  const refPrice = profile.referencePrice;
  const reversion = -((state.currentPrice - refPrice) / refPrice) * limits.meanReversionStrength;
  const pctMove = Math.max(-limits.maxMovePercentPerTick, Math.min(limits.maxMovePercentPerTick, reversion + sampleTriangular() * profile.volatility));

  const minBound = Math.max(0.01, round2(refPrice * (1 - limits.maxDeviationPercent)));
  const maxBound = round2(refPrice * (1 + limits.maxDeviationPercent));
  const nextPrice = Math.max(minBound, Math.min(maxBound, round2(state.currentPrice * (1 + pctMove))));
  if (!Number.isFinite(nextPrice) || nextPrice <= 0) return null;

  const change = round2(nextPrice - state.previousClose);
  return {
    ...state,
    currentPrice: nextPrice,
    change,
    changePercent: round2((change / state.previousClose) * 100),
    dayHigh: Math.max(state.dayHigh, nextPrice),
    dayLow: Math.min(state.dayLow, nextPrice),
    volume: state.volume + randomInt(profile.volumeMin, profile.volumeMax),
    lastUpdated: nowIso,
  };
}

function buildRebasedState(existing, snap, nowIso) {
  const rebasedPrice = round2(toOptNum(snap.nseReferencePrice));
  const fetchedPrev = toOptNum(snap.nsePreviousClose);
  const previousClose = fetchedPrev !== null && fetchedPrev > 0 ? round2(fetchedPrev) : rebasedPrice;
  const change = round2(rebasedPrice - previousClose);
  const fetchedHigh = toOptNum(snap.nseDayHigh);
  const fetchedLow = toOptNum(snap.nseDayLow);

  return {
    ...existing,
    ...extractNseFields(snap),
    companyName: snap.companyName || existing.companyName,
    industry: snap.industry ?? existing.industry ?? null,
    currentPrice: rebasedPrice,
    previousClose,
    change,
    changePercent: round2((change / previousClose) * 100),
    dayHigh: fetchedHigh !== null && fetchedHigh > 0 ? Math.max(round2(fetchedHigh), rebasedPrice) : rebasedPrice,
    dayLow: fetchedLow !== null && fetchedLow > 0 ? Math.min(round2(fetchedLow), rebasedPrice) : rebasedPrice,
    nseReferencePrice: rebasedPrice,
    nseQuoteFetchedAt: snap.nseQuoteFetchedAt ?? nowIso,
    lastUpdated: nowIso,
  };
}

export class SimulatedMarketDataProvider {
  constructor(options = {}) {
    this.simulationIntervalMs = options.simulationIntervalMs || MARKET_CONFIG.simulationIntervalMs;
    this.persistIntervalMs = options.persistIntervalMs || MARKET_CONFIG.persistIntervalMs;
    this.historyLimit = options.historyLimit || MARKET_CONFIG.historyLimit;
    this.limits = {
      maxMovePercentPerTick: options.maxMovePercentPerTick || MARKET_CONFIG.maxMovePercentPerTick,
      maxDeviationPercent: options.maxDeviationPercent || MARKET_CONFIG.maxDeviationPercent,
      meanReversionStrength: options.meanReversionStrength || MARKET_CONFIG.meanReversionStrength,
    };

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

  pushHistory(symbol, price, timestamp) {
    const points = this.history.get(symbol) || [];
    points.push({ price, timestamp });
    if (points.length > this.historyLimit) points.splice(0, points.length - this.historyLimit);
    this.history.set(symbol, points);
  }

  async start(onUpdate) {
    if (onUpdate) this.onUpdate = onUpdate;
    if (this.running) return;
    if (this.startingPromise) return this.startingPromise;

    this.startingPromise = (async () => {
      try {
        await this.initializeCache();
        this.running = true;
        this.simulationTimer = setInterval(() => this.tick(), this.simulationIntervalMs);
        this.persistTimer = setInterval(() => this.persistSnapshot(), this.persistIntervalMs);
        console.log(`[MarketSimulator] Started for ${this.cache.size} stocks (tick=${this.simulationIntervalMs}ms, persist=${this.persistIntervalMs}ms)`);
      } finally {
        this.startingPromise = null;
      }
    })();

    return this.startingPromise;
  }

  async initializeCache() {
    const stocks = await prisma.stocks.findMany({ orderBy: { symbol: "asc" } });
    if (stocks.length === 0) throw new Error("No stock records found in database to initialize market simulator");

    const nowIso = new Date().toISOString();
    let needsInitialPersist = false;
    this.cache.clear();
    this.history.clear();
    this.profiles.clear();

    for (const stock of stocks) {
      const symbol = stock.symbol.toUpperCase();
      const profile = SIMULATED_STOCK_PROFILES[symbol] || DEFAULT_STOCK_PROFILE;
      const dbPrice = toOptNum(stock.current_price);
      const startPrice = round2(dbPrice !== null && dbPrice > 0 ? dbPrice : profile.referencePrice);
      if (dbPrice === null || dbPrice <= 0) needsInitialPersist = true;

      this.profiles.set(symbol, { ...profile, referencePrice: startPrice });
      this.cache.set(symbol, {
        id: stock.id, symbol, companyName: stock.company_name, exchange: stock.exchange, currency: stock.currency,
        currentPrice: startPrice, previousClose: startPrice, change: 0, changePercent: 0,
        dayHigh: startPrice, dayLow: startPrice, volume: profile.initialVolume,
        lastUpdated: nowIso, simulated: true, ...extractNseFields(stock),
      });
      this.history.set(symbol, [{ price: startPrice, timestamp: nowIso }]);
    }

    this.initialized = true;
    if (needsInitialPersist) await this.persistSnapshot();
  }

  tick() {
    if (!this.initialized) return [];
    const nowIso = new Date().toISOString();
    const updatedList = [];

    for (const [symbol, state] of this.cache.entries()) {
      const nextState = computeNextTick(state, this.profiles.get(symbol) || DEFAULT_STOCK_PROFILE, this.limits, nowIso);
      if (!nextState) continue;
      this.cache.set(symbol, nextState);
      this.pushHistory(symbol, nextState.currentPrice, nowIso);
      updatedList.push(nextState);
    }

    if (updatedList.length > 0 && this.onUpdate) {
      try { this.onUpdate(updatedList, nowIso); } catch (err) { console.error("[MarketSimulator] Broadcast failed:", err.message); }
    }
    return updatedList;
  }

  async persistSnapshot() {
    if (!this.initialized || this.isPersisting || this.cache.size === 0) return;
    this.isPersisting = true;
    const now = new Date();
    try {
      await prisma.$transaction(
        Array.from(this.cache.values()).map((s) =>
          prisma.stocks.update({ where: { id: s.id }, data: { current_price: s.currentPrice, price_updated_at: now, updated_at: now } })
        )
      );
    } catch (error) {
      console.error("[MarketSimulator] Failed to persist prices to PostgreSQL:", error.message);
    } finally {
      this.isPersisting = false;
    }
  }

  async stop() {
    clearInterval(this.simulationTimer);
    clearInterval(this.persistTimer);
    this.simulationTimer = null;
    this.persistTimer = null;
    this.running = false;
    if (this.initialized) await this.persistSnapshot();
  }

  getLatestPrices() {
    return Array.from(this.cache.values(), (item) => ({ ...item }));
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
    return stock ? { stock: { ...stock }, history: (this.history.get(key) || []).map((p) => ({ ...p })) } : null;
  }

  rebaseStocks(updatedSnapshots = []) {
    if (!this.initialized || !Array.isArray(updatedSnapshots) || updatedSnapshots.length === 0) return [];
    const nowIso = new Date().toISOString();
    const rebased = [];

    for (const snap of updatedSnapshots) {
      const symbol = snap?.symbol?.toUpperCase();
      const existing = symbol ? this.cache.get(symbol) : null;
      const nextPrice = toOptNum(snap?.nseReferencePrice);
      if (!existing || nextPrice === null || nextPrice <= 0) continue;

      const nextState = buildRebasedState(existing, snap, nowIso);
      const profile = this.profiles.get(symbol) || DEFAULT_STOCK_PROFILE;
      this.profiles.set(symbol, { ...profile, referencePrice: nextState.currentPrice });
      this.cache.set(symbol, nextState);
      this.pushHistory(symbol, nextState.currentPrice, nowIso);
      rebased.push(nextState);
    }

    if (rebased.length > 0 && this.onUpdate) {
      try { this.onUpdate(this.getLatestPrices(), nowIso); } catch (err) { console.error("[MarketSimulator] Rebase broadcast failed:", err.message); }
    }
    return rebased;
  }
}
