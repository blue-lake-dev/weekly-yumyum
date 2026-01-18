import type { MetricValue } from "../types";
import { formatTimestamp } from "../utils";

// Using Yahoo Finance v8 API (unofficial but commonly used)
const YAHOO_API = "https://query1.finance.yahoo.com/v8/finance/chart";

// 7 days in seconds
const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
        previousClose: number;
      };
      timestamp: number[]; // Unix timestamps in seconds
      indicators: {
        quote: Array<{
          close: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
        }>;
      };
    }>;
    error: null | { code: string; description: string };
  };
}

async function fetchWithTimeout<T>(url: string, timeout = 10000): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(id);
  }
}

// Helper to calculate change percentage
function calcChangePct(current: number | null, previous: number | null): number | undefined {
  if (current === null || previous === null || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

// Find entry closest to target timestamp
function findClosestEntry(
  timestamps: number[],
  closes: (number | null)[],
  targetTimestamp: number
): { value: number | null; timestamp: number | null } {
  if (!timestamps || timestamps.length === 0) {
    return { value: null, timestamp: null };
  }

  let closestIdx = 0;
  let minDiff = Math.abs(timestamps[0] - targetTimestamp);

  for (let i = 1; i < timestamps.length; i++) {
    const diff = Math.abs(timestamps[i] - targetTimestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }

  return {
    value: closes[closestIdx],
    timestamp: timestamps[closestIdx],
  };
}

// Fetch price with history - uses 7 CALENDAR days (not trading days)
async function fetchYahooPrice(symbol: string, timezone: "UTC" | "EST" = "EST"): Promise<MetricValue> {
  try {
    // Fetch 14 days to ensure we have enough data for 7 calendar days ago
    const data = await fetchWithTimeout<YahooChartResponse>(
      `${YAHOO_API}/${symbol}?interval=1d&range=14d`
    );

    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;

    if (!timestamps || timestamps.length === 0) {
      throw new Error("No price data available");
    }

    // Current: latest entry with valid close
    let currentIdx = timestamps.length - 1;
    while (currentIdx >= 0 && closes[currentIdx] === null) {
      currentIdx--;
    }

    if (currentIdx < 0) {
      throw new Error("No valid price data");
    }

    const current = closes[currentIdx];
    const currentTimestamp = timestamps[currentIdx];
    const current_at = formatTimestamp(currentTimestamp, timezone);

    // Previous: find entry closest to 7 calendar days ago
    const sevenDaysAgoTimestamp = currentTimestamp - SEVEN_DAYS_SEC;
    const { value: previous, timestamp: previousTimestamp } = findClosestEntry(
      timestamps.slice(0, currentIdx), // Only look at entries before current
      closes.slice(0, currentIdx),
      sevenDaysAgoTimestamp
    );
    const previous_at = previousTimestamp ? formatTimestamp(previousTimestamp, timezone) : undefined;

    return {
      current,
      current_at,
      previous,
      previous_at,
      change_pct: calcChangePct(current, previous),
      source: "yahoo",
    };
  } catch (error) {
    console.error(`fetchYahooPrice(${symbol}) error:`, error);
    return { current: null, error: `Failed to fetch ${symbol}`, source: "yahoo" };
  }
}

// Calculate realized volatility from price history
function calculateVolatility(closes: number[], days: number): number | null {
  if (closes.length < days + 1) return null;

  // Calculate daily log returns for the last N+1 prices (gives N returns)
  const returns: number[] = [];
  const startIdx = closes.length - days - 1;
  for (let i = startIdx + 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }

  if (returns.length < days) return null;

  // Calculate standard deviation
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const dailyVol = Math.sqrt(variance);

  // Annualize and convert to percentage
  return dailyVol * Math.sqrt(365) * 100;
}

// Fetch volatility with history to compare current vs 7 days ago
async function fetchVolatility(symbol: string, days: number): Promise<MetricValue> {
  try {
    // Need extra days: days for current vol + 7 for previous vol + buffer
    const rangeDays = days + 15;
    const data = await fetchWithTimeout<YahooChartResponse>(
      `${YAHOO_API}/${symbol}?interval=1d&range=${rangeDays}d`
    );

    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const rawCloses = result.indicators.quote[0].close;

    // Filter out null values while keeping track of timestamps
    const validData: { timestamp: number; close: number }[] = [];
    for (let i = 0; i < rawCloses.length; i++) {
      if (rawCloses[i] !== null) {
        validData.push({ timestamp: timestamps[i], close: rawCloses[i]! });
      }
    }

    if (validData.length < days + 1) {
      throw new Error("Not enough data for volatility calculation");
    }

    const closes = validData.map(d => d.close);

    // Current volatility: using the most recent N days
    const current = calculateVolatility(closes, days);
    const currentTimestamp = validData[validData.length - 1].timestamp;
    const current_at = formatTimestamp(currentTimestamp, "UTC");

    // Previous volatility: find data ending ~7 calendar days ago
    const sevenDaysAgoTimestamp = currentTimestamp - SEVEN_DAYS_SEC;

    // Find index closest to 7 days ago
    let prevEndIdx = validData.length - 1;
    for (let i = validData.length - 1; i >= 0; i--) {
      if (validData[i].timestamp <= sevenDaysAgoTimestamp) {
        prevEndIdx = i;
        break;
      }
    }

    const closesForPrevious = closes.slice(0, prevEndIdx + 1);
    const previous = calculateVolatility(closesForPrevious, days);
    const previous_at = prevEndIdx >= 0 ? formatTimestamp(validData[prevEndIdx].timestamp, "UTC") : undefined;

    return {
      current,
      current_at,
      previous,
      previous_at,
      change_pct: calcChangePct(current, previous),
      source: "yahoo",
    };
  } catch (error) {
    console.error(`fetchVolatility(${symbol}, ${days}) error:`, error);
    return { current: null, error: `Failed to fetch ${days}D volatility`, source: "yahoo" };
  }
}

// Export individual fetchers
// Stocks use EST (market close time)
export const fetchNasdaq = () => fetchYahooPrice("^IXIC", "EST");
export const fetchMstr = () => fetchYahooPrice("MSTR", "EST");
export const fetchBmnr = () => fetchYahooPrice("BMNR", "EST");
export const fetchDxy = () => fetchYahooPrice("DX-Y.NYB", "EST");
export const fetchUs10y = () => fetchYahooPrice("^TNX", "EST");
export const fetchSp500 = () => fetchYahooPrice("^GSPC", "EST");

// Commodities/Futures - use UTC
export const fetchGold = () => fetchYahooPrice("GC=F", "UTC");
export const fetchBtcFutures = () => fetchYahooPrice("BTC=F", "UTC");

// Volatility calculations
export const fetchVol7d = () => fetchVolatility("BTC-USD", 7);
export const fetchVol30d = () => fetchVolatility("BTC-USD", 30);

// CME Gap - BTC futures price
export async function fetchCmeGap(): Promise<MetricValue> {
  return fetchBtcFutures();
}
