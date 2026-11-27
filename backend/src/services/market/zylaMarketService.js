import prisma from "../../config/prisma.js";
import { MARKET_CONFIG, ZYLA_STOCK_QUERIES } from "../../config/marketConfig.js";
import { createHttpError } from "../../utils/httpError.js";
import marketDataService from "./marketDataService.js";

// Single-server in-memory lock & timestamp to prevent duplicate calls / credit burn
let isRefreshing = false;
let lastRefreshAtMs = 0;

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function toNum(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replaceAll(",", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickText(...values) {
  return values.find((v) => typeof v === "string" && v.trim())?.trim() || null;
}

function findVolume(priceAndVolume) {
  if (!Array.isArray(priceAndVolume)) return null;
  const item = priceAndVolume.find((entry) => {
    const label = String(entry?.key || entry?.displayName || "").toLowerCase();
    return label.includes("volume") || label.includes("vol");
  });
  return toNum(item?.value);
}

/**
 * Extracts and validates only the allowed NSE snapshot fields from a Zyla response.
 */
export function mapAndValidateZylaResponse(payload, targetEntry) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Empty or invalid response payload");
  }

  const root = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
    ? payload.data
    : payload;
  const priceInfo = root.currentPrice && typeof root.currentPrice === "object" ? root.currentPrice : {};
  const reusable = root.stockDetailsReusableData && typeof root.stockDetailsReusableData === "object" ? root.stockDetailsReusableData : {};
  const companyInfo = root.companyProfile && typeof root.companyProfile === "object" ? root.companyProfile : {};

  // Match NSE symbol against our configured symbol/aliases
  const returnedSymbol = pickText(companyInfo.exchangeCodeNse, root.symbol, root.tickerId);
  if (returnedSymbol) {
    const allowed = new Set([targetEntry.symbol, ...(targetEntry.aliases || [])].map((s) => s.toUpperCase()));
    if (!allowed.has(returnedSymbol.toUpperCase())) {
      throw new Error(`Returned NSE symbol "${returnedSymbol.toUpperCase()}" does not match ${targetEntry.symbol}`);
    }
  }

  const nsePrice = toNum(
    priceInfo.NSE ?? reusable.price ?? (typeof root.currentPrice === "object" ? null : root.currentPrice)
  );
  if (nsePrice === null || nsePrice <= 0) {
    throw new Error(`Invalid or missing NSE price for ${targetEntry.symbol}`);
  }

  const rawPrevClose = toNum(reusable.close ?? root.previousClose);
  const previousClose = rawPrevClose !== null && rawPrevClose > 0 ? round2(rawPrevClose) : null;

  let change = toNum(root.change ?? root.priceChange);
  let percentChange = toNum(root.percentChange ?? reusable.percentChange);
  if (previousClose !== null) {
    const expectedChange = round2(nsePrice - previousClose);
    if (change === null || Math.abs(change - expectedChange) > 0.05) {
      change = expectedChange;
    }
    percentChange = round2((expectedChange / previousClose) * 100);
  }

  const symbol = targetEntry.symbol.toUpperCase();
  return {
    symbol,
    nseSymbol: returnedSymbol ? returnedSymbol.toUpperCase() : symbol,
    companyName: pickText(root.companyName, companyInfo.companyName, root.name),
    industry: pickText(root.industry, companyInfo.industry),
    nsePrice: round2(nsePrice),
    previousClose,
    change,
    percentChange,
    dayHigh: toNum(reusable.high ?? root.dayHigh),
    dayLow: toNum(reusable.low ?? root.dayLow),
    yearHigh52W: toNum(root.yearHigh ?? reusable.yhigh),
    yearLow52W: toNum(root.yearLow ?? reusable.ylow),
    volume: toNum(root.volume) ?? findVolume(root.keyMetrics?.priceandVolume),
    marketCapCr: toNum(reusable.marketCap ?? root.marketCap),
    quoteDate: pickText(reusable.date),
    quoteTime: pickText(reusable.time),
  };
}

async function fetchOneZylaStock(entry, apiKey, fetchImpl, timeoutMs) {
  const url = `${MARKET_CONFIG.zylaApiUrl}?name=${encodeURIComponent(entry.query)}`;
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from Zyla API`);
  return mapAndValidateZylaResponse(await response.json(), entry);
}

async function getPersistedLastFetchMs() {
  const agg = await prisma.stocks.aggregate({ _max: { nse_quote_fetched_at: true } });
  const dbMs = agg?._max?.nse_quote_fetched_at ? new Date(agg._max.nse_quote_fetched_at).getTime() : 0;
  return Math.max(lastRefreshAtMs, Number.isFinite(dbMs) ? dbMs : 0);
}

async function validateRefreshPreconditions(cooldownMs, apiKey) {
  const lastMs = cooldownMs > 0 ? await getPersistedLastFetchMs() : 0;
  if (lastMs > 0 && Date.now() - lastMs < cooldownMs) {
    const retryAfterSeconds = Math.ceil((cooldownMs - (Date.now() - lastMs)) / 1000);
    throw createHttpError(`NSE prices were recently updated. Please wait ${retryAfterSeconds}s before refreshing again.`, 429, { retryAfterSeconds });
  }
  if (!apiKey) {
    throw createHttpError("ZYLA_API_KEY is not configured in backend environment variables.", 503);
  }
}

function buildSnapshotPair(dbStock, mapped, fetchedAt) {
  const companyName = mapped.companyName || dbStock.company_name;
  const summary = {
    id: dbStock.id, symbol: mapped.symbol, companyName, industry: mapped.industry,
    nseReferencePrice: mapped.nsePrice, nsePreviousClose: mapped.previousClose,
    nseChange: mapped.change, nsePercentChange: mapped.percentChange,
    nseDayHigh: mapped.dayHigh, nseDayLow: mapped.dayLow,
    nseYearHigh52W: mapped.yearHigh52W, nseYearLow52W: mapped.yearLow52W,
    nseVolume: mapped.volume, marketCapCr: mapped.marketCapCr,
    quoteDate: mapped.quoteDate, quoteTime: mapped.quoteTime,
    nseQuoteFetchedAt: fetchedAt.toISOString(),
  };
  const dbWrite = prisma.stocks.update({
    where: { id: dbStock.id },
    data: {
      company_name: companyName, current_price: mapped.nsePrice, price_updated_at: fetchedAt,
      industry: mapped.industry, nse_reference_price: mapped.nsePrice, nse_previous_close: mapped.previousClose,
      nse_change: mapped.change, nse_percent_change: mapped.percentChange, nse_day_high: mapped.dayHigh,
      nse_day_low: mapped.dayLow, nse_year_high_52w: mapped.yearHigh52W, nse_year_low_52w: mapped.yearLow52W,
      nse_volume: mapped.volume, market_cap_cr: mapped.marketCapCr, quote_date: mapped.quoteDate,
      quote_time: mapped.quoteTime, nse_quote_fetched_at: fetchedAt, updated_at: fetchedAt,
    },
  });
  return { summary, dbWrite };
}

export async function getNseSnapshotStatus() {
  const lastMs = await getPersistedLastFetchMs();
  const cooldownMs = MARKET_CONFIG.zylaRefreshCooldownMs;
  const elapsed = lastMs > 0 ? Date.now() - lastMs : cooldownMs;
  return {
    isRefreshing,
    lastFetchedAt: lastMs > 0 ? new Date(lastMs).toISOString() : null,
    cooldownSeconds: Math.round(cooldownMs / 1000),
    remainingCooldownSeconds: lastMs > 0 && elapsed < cooldownMs ? Math.ceil((cooldownMs - elapsed) / 1000) : 0,
  };
}

/**
 * Manually refreshes NSE snapshots for all configured stocks in parallel.
 */
export async function refreshNseSnapshots({
  fetchImpl = fetch,
  apiKey = process.env.ZYLA_API_KEY?.trim(),
  cooldownMs = MARKET_CONFIG.zylaRefreshCooldownMs,
  timeoutMs = MARKET_CONFIG.zylaRequestTimeoutMs,
} = {}) {
  if (isRefreshing) throw createHttpError("An NSE price refresh is already in progress. Please wait.", 409);
  isRefreshing = true;

  try {
    await validateRefreshPreconditions(cooldownMs, apiKey);

    const dbStocks = await prisma.stocks.findMany({ where: { exchange: "NSE" } });
    const stockBySymbol = new Map(dbStocks.map((s) => [s.symbol.toUpperCase(), s]));
    const settled = await Promise.allSettled(
      ZYLA_STOCK_QUERIES.map((entry) => fetchOneZylaStock(entry, apiKey, fetchImpl, timeoutMs))
    );

    const fetchedAt = new Date();
    const updated = [];
    const failed = [];
    const dbWrites = [];

    for (let i = 0; i < settled.length; i += 1) {
      const entry = ZYLA_STOCK_QUERIES[i];
      const outcome = settled[i];
      if (outcome.status === "rejected") {
        failed.push({ symbol: entry.symbol, error: outcome.reason?.message || "Failed to fetch stock data" });
        continue;
      }

      const dbStock = stockBySymbol.get(outcome.value.symbol);
      if (!dbStock) {
        failed.push({ symbol: outcome.value.symbol, error: `Stock record not found in database for ${outcome.value.symbol}` });
        continue;
      }

      const { summary, dbWrite } = buildSnapshotPair(dbStock, outcome.value, fetchedAt);
      updated.push(summary);
      dbWrites.push(dbWrite);
    }

    if (dbWrites.length > 0) {
      await prisma.$transaction(dbWrites);
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
