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
  solPrice: MetricValue;
  btcDominance: MetricValue;
}

export async function fetchAllCoinGeckoData(): Promise<CoinGeckoData> {
  let btcPrice: MetricValue = { current: null, error: "Failed to fetch BTC price", source: "coingecko" };
  let ethPrice: MetricValue = { current: null, error: "Failed to fetch ETH price", source: "coingecko" };
  let solPrice: MetricValue = { current: null, error: "Failed to fetch SOL price", source: "coingecko" };
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

  // Fetch SOL price history
  try {
    const solData = await fetchWithTimeout<MarketChartResponse>(
      `${COINGECKO_API}/coins/solana/market_chart?vs_currency=usd&days=8&interval=daily`
    );
    const { current, current_at, previous, previous_at } = extractPricesWithTimestamps(solData);
    solPrice = {
      current,
      current_at,
      previous,
      previous_at,
      change_pct: calcChangePct(current, previous),
      source: "coingecko",
    };
    console.log("[coingecko] SOL price:", solPrice.current, "change:", solPrice.change_pct?.toFixed(2) + "%");
  } catch (error) {
    console.error("fetchSolPrice error:", error);
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

  return { btcPrice, ethPrice, solPrice, btcDominance };
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

export async function fetchSolPrice(): Promise<MetricValue> {
  const data = await fetchAllCoinGeckoData();
  return data.solPrice;
}

// Gainers/Losers types and fetcher
export interface GainersLosersData {
  gainers: Array<{ symbol: string; name: string; change: number }>;
  losers: Array<{ symbol: string; name: string; change: number }>;
  error?: string;
}

interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  price_change_percentage_24h: number | null;
}

/**
 * Fetch top gainers and losers from CoinGecko
 * Filters top 100 by market cap, returns top 10 gainers and top 10 losers
 */
export async function fetchGainersLosers(limit: number = 10): Promise<GainersLosersData> {
  try {
    const data = await fetchWithTimeout<MarketCoin[]>(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`
    );

    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid response from CoinGecko");
    }

    // Filter out coins with null change and sort
    const validCoins = data.filter((coin) => coin.price_change_percentage_24h !== null);

    // Sort by 24h change descending for gainers
    const sortedByChange = [...validCoins].sort(
      (a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0)
    );

    const gainers = sortedByChange.slice(0, limit).map((coin) => ({
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      change: coin.price_change_percentage_24h ?? 0,
    }));

    const losers = sortedByChange.slice(-limit).reverse().map((coin) => ({
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      change: coin.price_change_percentage_24h ?? 0,
    }));

    console.log("[coingecko] Top gainer:", gainers[0]?.symbol, gainers[0]?.change?.toFixed(2) + "%");
    console.log("[coingecko] Top loser:", losers[0]?.symbol, losers[0]?.change?.toFixed(2) + "%");

    return { gainers, losers };
  } catch (error) {
    console.error("fetchGainersLosers error:", error);
    return {
      gainers: [],
      losers: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
