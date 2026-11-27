import prisma from "../../config/prisma.js";
import { MARKET_CONFIG, ZYLA_STOCK_QUERIES } from "../../config/marketConfig.js";
import marketDataService from "./marketDataService.js";

// Simple in-memory lock to prevent concurrent Zyla refresh calls on this server
let isRefreshing = false;
let lastRefreshAtMs = 0;

function createHttpError(message, statusCode, details = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, details);
  return error;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const cleaned = value.replaceAll(",", "").trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickFirstText(...values) {
  for (const val of values) {
    if (typeof val === "string" && val.trim()) {
      return val.trim();
    }
  }
  return null;
}

function findMetricByKey(list, candidateKeys) {
  if (!Array.isArray(list)) return null;
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const key = String(item.key || item.displayName || "").toLowerCase();
    if (candidateKeys.some((candidate) => key.includes(candidate))) {
      return item.value ?? null;
    }
  }
  return null;
}

function verifyMatchingSymbol(returnedSymbol, targetEntry) {
  if (!returnedSymbol) return;

  const normalizedReturned = returnedSymbol.toUpperCase();
  const allowedSymbols = new Set([
    targetEntry.symbol.toUpperCase(),
    ...(targetEntry.aliases || []).map((alias) => alias.toUpperCase()),
  ]);

  if (!allowedSymbols.has(normalizedReturned)) {
    throw new Error(
      `Returned NSE symbol "${normalizedReturned}" does not match ${targetEntry.symbol}`
    );
  }
}

function computeConsistentChanges(nsePrice, previousClose, rawChange, rawPercentChange) {
  if (previousClose === null) {
    return {
      change: rawChange,
      percentChange: rawPercentChange,
    };
  }

  // Always verify change & percentChange against nsePrice and previousClose
  const computedChange = round2(nsePrice - previousClose);
  const finalChange =
    rawChange === null || Math.abs(rawChange - computedChange) > 0.05
      ? computedChange
      : rawChange;
  const finalPercentChange = round2((computedChange / previousClose) * 100);

  return {
    change: finalChange,
    percentChange: finalPercentChange,
  };
}

/**
 * Extracts and validates only the allowed NSE snapshot fields from a Zyla response.
 * Throws an error if required NSE price data is missing or invalid, or if symbol mismatches.
 */
export function mapAndValidateZylaResponse(payload, targetEntry) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Empty or invalid response payload");
  }

  const root =
    payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? payload.data
      : payload;

  const currentPriceObj = root.currentPrice && typeof root.currentPrice === "object" ? root.currentPrice : {};
  const reusable = root.stockDetailsReusableData && typeof root.stockDetailsReusableData === "object" ? root.stockDetailsReusableData : {};
  const profile = root.companyProfile && typeof root.companyProfile === "object" ? root.companyProfile : {};
  const priceAndVolume = Array.isArray(root.keyMetrics?.priceandVolume)
    ? root.keyMetrics.priceandVolume
    : [];

  const returnedSymbol = pickFirstText(profile.exchangeCodeNse, root.symbol, root.tickerId);
  verifyMatchingSymbol(returnedSymbol, targetEntry);

  const nsePrice = toNullableNumber(
    currentPriceObj.NSE ??
      reusable.price ??
      (typeof root.currentPrice === "number" || typeof root.currentPrice === "string"
        ? root.currentPrice
        : null)
  );

  if (nsePrice === null || nsePrice <= 0) {
    throw new Error(`Invalid or missing NSE price for ${targetEntry.symbol}`);
  }

  const rawPrevClose = toNullableNumber(reusable.close ?? root.previousClose);
  const previousClose = rawPrevClose !== null && rawPrevClose > 0 ? round2(rawPrevClose) : null;

  const { change, percentChange } = computeConsistentChanges(
    nsePrice,
    previousClose,
    toNullableNumber(root.change ?? root.priceChange),
    toNullableNumber(root.percentChange ?? reusable.percentChange)
  );

  const symbol = targetEntry.symbol.toUpperCase();

  return {
    symbol,
    nseSymbol: returnedSymbol ? returnedSymbol.toUpperCase() : symbol,
    companyName: pickFirstText(root.companyName, profile.companyName, root.name),
    industry: pickFirstText(root.industry, profile.industry),
    nsePrice: round2(nsePrice),
    previousClose,
    change,
    percentChange,
    dayHigh: toNullableNumber(reusable.high ?? root.dayHigh),
    dayLow: toNullableNumber(reusable.low ?? root.dayLow),
    yearHigh52W: toNullableNumber(root.yearHigh ?? reusable.yhigh),
    yearLow52W: toNullableNumber(root.yearLow ?? reusable.ylow),
    volume: toNullableNumber(
      root.volume ?? findMetricByKey(priceAndVolume, ["volume", "vol"])
    ),
    marketCapCr: toNullableNumber(reusable.marketCap ?? root.marketCap),
    quoteDate: pickFirstText(reusable.date),
    quoteTime: pickFirstText(reusable.time),
  };
}

async function fetchOneZylaStock(entry, apiKey, fetchImpl, timeoutMs) {
  const url = `${MARKET_CONFIG.zylaApiUrl}?name=${encodeURIComponent(entry.query)}`;
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from Zyla API`);
  }

  const payload = await response.json();
  return mapAndValidateZylaResponse(payload, entry);
}

async function getPersistedLastFetchMs() {
  const agg = await prisma.stocks.aggregate({
    _max: { nse_quote_fetched_at: true },
  });
  const dbDate = agg?._max?.nse_quote_fetched_at;
  const dbMs = dbDate ? new Date(dbDate).getTime() : 0;
  return Math.max(lastRefreshAtMs, Number.isFinite(dbMs) ? dbMs : 0);
}

export async function getNseSnapshotStatus() {
  const lastMs = await getPersistedLastFetchMs();
  const cooldownMs = MARKET_CONFIG.zylaRefreshCooldownMs;
  const elapsed = lastMs > 0 ? Date.now() - lastMs : cooldownMs;
  const remainingCooldownSeconds =
    lastMs > 0 && elapsed < cooldownMs
      ? Math.ceil((cooldownMs - elapsed) / 1000)
      : 0;

  return {
    isRefreshing,
    lastFetchedAt: lastMs > 0 ? new Date(lastMs).toISOString() : null,
    cooldownSeconds: Math.round(cooldownMs / 1000),
    remainingCooldownSeconds,
  };
}

async function enforceCooldownNotActive(cooldownMs) {
  if (cooldownMs <= 0) return;

  const latestFetchMs = await getPersistedLastFetchMs();
  if (latestFetchMs <= 0) return;

  const elapsedMs = Date.now() - latestFetchMs;
  if (elapsedMs < cooldownMs) {
    const retryAfterSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
    throw createHttpError(
      `NSE prices were recently updated. Please wait ${retryAfterSeconds}s before refreshing again.`,
      429,
      { retryAfterSeconds }
    );
  }
}

function buildStockDbUpdate(dbStock, mapped, fetchedAt) {
  return prisma.stocks.update({
    where: { id: dbStock.id },
    data: {
      company_name: mapped.companyName || dbStock.company_name,
      current_price: mapped.nsePrice,
      price_updated_at: fetchedAt,
      industry: mapped.industry,
      nse_reference_price: mapped.nsePrice,
      nse_previous_close: mapped.previousClose,
      nse_change: mapped.change,
      nse_percent_change: mapped.percentChange,
      nse_day_high: mapped.dayHigh,
      nse_day_low: mapped.dayLow,
      nse_year_high_52w: mapped.yearHigh52W,
      nse_year_low_52w: mapped.yearLow52W,
      nse_volume: mapped.volume,
      market_cap_cr: mapped.marketCapCr,
      quote_date: mapped.quoteDate,
      quote_time: mapped.quoteTime,
      nse_quote_fetched_at: fetchedAt,
      updated_at: fetchedAt,
    },
  });
}

function buildUpdatedStockSummary(dbStock, mapped, fetchedAt) {
  return {
    id: dbStock.id,
    symbol: mapped.symbol,
    companyName: mapped.companyName || dbStock.company_name,
    industry: mapped.industry,
    nseReferencePrice: mapped.nsePrice,
    nsePreviousClose: mapped.previousClose,
    nseChange: mapped.change,
    nsePercentChange: mapped.percentChange,
    nseDayHigh: mapped.dayHigh,
    nseDayLow: mapped.dayLow,
    nseYearHigh52W: mapped.yearHigh52W,
    nseYearLow52W: mapped.yearLow52W,
    nseVolume: mapped.volume,
    marketCapCr: mapped.marketCapCr,
    quoteDate: mapped.quoteDate,
    quoteTime: mapped.quoteTime,
    nseQuoteFetchedAt: fetchedAt.toISOString(),
  };
}

/**
 * Manually refreshes NSE reference snapshots for all configured stocks in parallel.
 * Never called automatically on startup or in background intervals.
 */
export async function refreshNseSnapshots({
  fetchImpl = fetch,
  apiKey = process.env.ZYLA_API_KEY?.trim(),
  cooldownMs = MARKET_CONFIG.zylaRefreshCooldownMs,
  timeoutMs = MARKET_CONFIG.zylaRequestTimeoutMs,
} = {}) {
  if (isRefreshing) {
    throw createHttpError(
      "An NSE price refresh is already in progress. Please wait.",
      409
    );
  }

  // Acquire the lock synchronously before any async DB/network checks
  isRefreshing = true;

  try {
    await enforceCooldownNotActive(cooldownMs);

    if (!apiKey) {
      throw createHttpError(
        "ZYLA_API_KEY is not configured in backend environment variables.",
        503
      );
    }

    const dbStocks = await prisma.stocks.findMany({
      where: { exchange: "NSE" },
    });
    const dbStockBySymbol = new Map(
      dbStocks.map((stock) => [stock.symbol.toUpperCase(), stock])
    );

    const settled = await Promise.allSettled(
      ZYLA_STOCK_QUERIES.map((entry) =>
        fetchOneZylaStock(entry, apiKey, fetchImpl, timeoutMs)
      )
    );

    const fetchedAt = new Date();
    const updated = [];
    const failed = [];
    const dbUpdates = [];

    for (let i = 0; i < settled.length; i += 1) {
      const entry = ZYLA_STOCK_QUERIES[i];
      const outcome = settled[i];

      if (outcome.status === "rejected") {
        failed.push({
          symbol: entry.symbol,
          error: outcome.reason?.message || "Failed to fetch stock data",
        });
        continue;
      }

      const mapped = outcome.value;
      const dbStock = dbStockBySymbol.get(mapped.symbol);

      if (!dbStock) {
        failed.push({
          symbol: mapped.symbol,
          error: `Stock record not found in database for ${mapped.symbol}`,
        });
        continue;
      }

      dbUpdates.push(buildStockDbUpdate(dbStock, mapped, fetchedAt));
      updated.push(buildUpdatedStockSummary(dbStock, mapped, fetchedAt));
    }

    if (dbUpdates.length > 0) {
      await prisma.$transaction(dbUpdates);
      lastRefreshAtMs = fetchedAt.getTime();
      marketDataService.rebaseStocks(updated);
    }

    return {
      fetchedAt: updated.length > 0 ? fetchedAt.toISOString() : null,
      cooldownSeconds: Math.round(cooldownMs / 1000),
      updatedCount: updated.length,
      failedCount: failed.length,
      updated,
      failed,
    };
  } finally {
    isRefreshing = false;
  }
}

export function resetZylaRefreshStateForTests() {
  isRefreshing = false;
  lastRefreshAtMs = 0;
}
