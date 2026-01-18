import type { MetricValue } from "../types";
import { formatTimestamp } from "../utils";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

interface GlobalData {
  data: {
    market_cap_percentage: {
      btc: number;
      eth: number;
    };
  };
}

interface MarketChartResponse {
  prices: [number, number][]; // [timestamp_ms, price]
}

async function fetchWithTimeout<T>(url: string, timeout = 10000): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(id);
  }
}

// Delay helper to avoid rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to calculate change percentage
function calcChangePct(current: number | null, previous: number | null): number | undefined {
  if (current === null || previous === null || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

// Extract current (latest) and previous (7 days ago) from market chart data
function extractPricesWithTimestamps(data: MarketChartResponse): {
  current: number | null;
  current_at: string | undefined;
  previous: number | null;
  previous_at: string | undefined;
} {
  const prices = data.prices;
  if (!prices || prices.length === 0) {
    return { current: null, current_at: undefined, previous: null, previous_at: undefined };
  }

  // Latest price is the last entry
  const latestEntry = prices[prices.length - 1];
  const current = latestEntry[1];
  const current_at = formatTimestamp(latestEntry[0], "UTC");

  // Find price from ~7 days ago (first entry in 8-day range)
  const previousEntry = prices.length > 1 ? prices[0] : null;
  const previous = previousEntry ? previousEntry[1] : null;
  const previous_at = previousEntry ? formatTimestamp(previousEntry[0], "UTC") : undefined;

  return { current, current_at, previous, previous_at };
}

// Fetch all CoinGecko data in minimal API calls to avoid rate limiting
export interface CoinGeckoData {
  btcPrice: MetricValue;
  ethPrice: MetricValue;
  btcDominance: MetricValue;
}

export async function fetchAllCoinGeckoData(): Promise<CoinGeckoData> {
  let btcPrice: MetricValue = { current: null, error: "Failed to fetch BTC price", source: "coingecko" };
  let ethPrice: MetricValue = { current: null, error: "Failed to fetch ETH price", source: "coingecko" };
  let btcDominance: MetricValue = { current: null, error: "Failed to fetch BTC dominance", source: "coingecko" };

  // Fetch BTC price history (8 days to get 7-day-ago data)
  try {
    const btcData = await fetchWithTimeout<MarketChartResponse>(
      `${COINGECKO_API}/coins/bitcoin/market_chart?vs_currency=usd&days=8&interval=daily`
    );
    const { current, current_at, previous, previous_at } = extractPricesWithTimestamps(btcData);
    btcPrice = {
      current,
      current_at,
      previous,
      previous_at,
      change_pct: calcChangePct(current, previous),
      source: "coingecko",
    };
  } catch (error) {
    console.error("fetchBtcPrice error:", error);
  }

  await delay(500);

  // Fetch ETH price history
  try {
    const ethData = await fetchWithTimeout<MarketChartResponse>(
      `${COINGECKO_API}/coins/ethereum/market_chart?vs_currency=usd&days=8&interval=daily`
    );
    const { current, current_at, previous, previous_at } = extractPricesWithTimestamps(ethData);
    ethPrice = {
      current,
      current_at,
      previous,
      previous_at,
      change_pct: calcChangePct(current, previous),
      source: "coingecko",
    };
  } catch (error) {
    console.error("fetchEthPrice error:", error);
  }

  await delay(500);

  // Fetch dominance data (current only - no free historical API)
  try {
    const globalData = await fetchWithTimeout<GlobalData>(`${COINGECKO_API}/global`);
    const now = Date.now();
    btcDominance = {
      current: globalData.data.market_cap_percentage.btc,
      current_at: formatTimestamp(now, "UTC"),
      previous: null, // Will be manually input
      previous_at: undefined,
      source: "coingecko",
    };
  } catch (error) {
    console.error("fetchBtcDominance error:", error);
  }

  return { btcPrice, ethPrice, btcDominance };
}

// Legacy exports for backwards compatibility (if needed elsewhere)
export async function fetchBtcDominance(): Promise<MetricValue> {
  const data = await fetchAllCoinGeckoData();
  return data.btcDominance;
}

export async function fetchBtcPrice(): Promise<MetricValue> {
  const data = await fetchAllCoinGeckoData();
  return data.btcPrice;
}

export async function fetchEthPrice(): Promise<MetricValue> {
  const data = await fetchAllCoinGeckoData();
  return data.ethPrice;
}
