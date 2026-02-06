import type { MetricValue } from "../types";
import { formatTimestamp } from "../utils";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Stablecoins to filter out from ticker and gainers/losers
const STABLECOIN_SYMBOLS = new Set([
  "USDT", "USDC", "DAI", "BUSD", "TUSD", "USDP", "USDD", "GUSD", "FRAX", "LUSD",
  "PYUSD", "RLUSD", "USDS", "USD1", "USYC", "USDT0", "FDUSD", "EURC", "UST",
  "USDJ", "CUSD", "SUSD", "MIM", "CRVUSD", "GHO", "DOLA", "ALUSD", "BEAN",
  "USDC.E", "USDT.E", "USDG", "BFUSD", "SUSDE", "USDE", "SYRUPUSDC", "BUIDL",
  "USDM", "USDB", "USD0", "HUSD", "USDX", "USDK", "USDQ", "FLEXUSD", "USDN",
]);

// Also filter by price range - coins priced $0.98-$1.02 with "USD" in name are likely stablecoins
function isLikelyStablecoin(symbol: string, price: number): boolean {
  const upperSymbol = symbol.toUpperCase();
  if (STABLECOIN_SYMBOLS.has(upperSymbol)) return true;
  // Check if symbol contains USD and price is ~$1
  if (upperSymbol.includes("USD") && price >= 0.98 && price <= 1.02) return true;
  return false;
}

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

async function fetchWithTimeout<T>(
  url: string,
  timeout = 5000,
  revalidate = 300 // 5 min default cache
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate },
    });
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

export interface TickerData {
  symbol: string;
  name: string;
  image: string;
  price: number | null;
  change24h: number | null;
}

/**
 * Fetch ticker prices for BTC, ETH, SOL with 24h change
 * Uses /simple/price endpoint - single call, rate-limit friendly
 */
/**
 * Fetch 7-day price sparkline for a coin
 * Returns array of daily prices + 7d change percentage
 */
export interface SparklineData {
  change7d: number | null;
  sparkline: number[]; // 7 daily price points
  error?: string;
}

export async function fetchPriceSparkline(coinId: string): Promise<SparklineData> {
  try {
    const data = await fetchWithTimeout<MarketChartResponse>(
      `${COINGECKO_API}/coins/${coinId}/market_chart?vs_currency=usd&days=7&interval=daily`
    );

    if (!data.prices || data.prices.length < 2) {
      throw new Error("Not enough price data");
    }

    // Extract prices (index 1 of each [timestamp, price] tuple)
    const prices = data.prices.map(p => p[1]);

    // Calculate 7d change
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change7d = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : null;

    console.log(`[coingecko] ${coinId} sparkline: ${prices.length} points, 7d change: ${change7d?.toFixed(2)}%`);

    return {
      change7d,
      sparkline: prices,
    };
  } catch (error) {
    console.error(`[coingecko] fetchPriceSparkline(${coinId}) error:`, error);
    return {
      change7d: null,
      sparkline: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

interface MarketCoinWithImage {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number | null;
}

/**
 * Fetch top 10 coins by market cap with images for ticker marquee
 * Uses /coins/markets endpoint
 */
export async function fetchTickerPrices(): Promise<TickerData[]> {
  try {
    // Fetch more than 10 to account for filtered stablecoins
    const data = await fetchWithTimeout<MarketCoinWithImage[]>(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h`,
      5000,
      60 // 1 min cache (matches use-ticker)
    );

    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid response from CoinGecko");
    }

    // Filter out stablecoins and take top 10
    const tickers: TickerData[] = data
      .filter((coin) => !isLikelyStablecoin(coin.symbol, coin.current_price ?? 0))
      .slice(0, 10)
      .map((coin) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        image: coin.image,
        price: coin.current_price ?? null,
        change24h: coin.price_change_percentage_24h ?? null,
      }));

    console.log("[coingecko] Ticker fetched:", tickers.length, "coins (stablecoins filtered)");

    return tickers;
  } catch (error) {
    console.error("[coingecko] fetchTickerPrices error:", error);
    return [];
  }
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
  gainers: Array<{ symbol: string; name: string; image: string; price: number; change: number }>;
  losers: Array<{ symbol: string; name: string; image: string; price: number; change: number }>;
  error?: string;
}

interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number | null;
}

/**
 * Fetch top gainers and losers from CoinGecko
 * Filters top 100 by market cap, returns top 10 gainers and top 10 losers
 */
export async function fetchGainersLosers(limit: number = 10): Promise<GainersLosersData> {
  try {
    const data = await fetchWithTimeout<MarketCoin[]>(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`,
      5000,
      900 // 15 min cache (matches use-gainers-losers)
    );

    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid response from CoinGecko");
    }

    // Filter out coins with null change and stablecoins
    const validCoins = data.filter(
      (coin) =>
        coin.price_change_percentage_24h !== null &&
        !isLikelyStablecoin(coin.symbol, coin.current_price)
    );

    // Sort by 24h change descending for gainers
    const sortedByChange = [...validCoins].sort(
      (a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0)
    );

    // Gainers: only positive changes
    const gainers = sortedByChange
      .filter((coin) => (coin.price_change_percentage_24h ?? 0) > 0)
      .slice(0, limit)
      .map((coin) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        image: coin.image,
        price: coin.current_price,
        change: coin.price_change_percentage_24h ?? 0,
      }));

    // Losers: only negative changes
    const losers = sortedByChange
      .filter((coin) => (coin.price_change_percentage_24h ?? 0) < 0)
      .slice(-limit)
      .reverse()
      .map((coin) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        image: coin.image,
        price: coin.current_price,
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

/**
 * Coin supply data from CoinGecko
 */
export interface CoinSupplyData {
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  error?: string;
}

interface CoinDetailResponse {
  market_data: {
    circulating_supply: number;
    total_supply: number;
    max_supply: number | null;
  };
}

/**
 * Fetch supply data for a specific coin
 * @param coinId - CoinGecko coin ID (e.g., "bitcoin", "ethereum", "solana")
 */
export async function fetchCoinSupply(coinId: string): Promise<CoinSupplyData> {
  try {
    const data = await fetchWithTimeout<CoinDetailResponse>(
      `${COINGECKO_API}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
      5000,
      900 // 15 min cache
    );

    const marketData = data.market_data;

    console.log(`[coingecko] ${coinId} circulating:`, marketData.circulating_supply?.toLocaleString());
    console.log(`[coingecko] ${coinId} max supply:`, marketData.max_supply?.toLocaleString() || "unlimited");

    return {
      circulatingSupply: marketData.circulating_supply,
      totalSupply: marketData.total_supply,
      maxSupply: marketData.max_supply,
    };
  } catch (error) {
    console.error(`[coingecko] fetchCoinSupply(${coinId}) error:`, error);
    return {
      circulatingSupply: null,
      totalSupply: null,
      maxSupply: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Global Market Metrics (Total Market Cap)
// ============================================================================

interface GlobalMetricsResponse {
  data: {
    total_market_cap: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
  };
}

export interface GlobalMetricsData {
  totalMarketCap: number | null;       // USD value
  totalMarketCapTrillion: number | null; // in trillions for display
  marketCapChange24h: number | null;   // percentage
  error?: string;
}

/**
 * Fetch global market metrics from CoinGecko /global endpoint
 * Returns total market cap and 24h change percentage
 */
export async function fetchGlobalMetrics(): Promise<GlobalMetricsData> {
  try {
    const data = await fetchWithTimeout<GlobalMetricsResponse>(
      `${COINGECKO_API}/global`,
      5000,
      900 // 15 min cache (matches use-quick-stats)
    );

    const totalMarketCap = data.data.total_market_cap?.usd ?? null;
    const totalMarketCapTrillion = totalMarketCap !== null ? totalMarketCap / 1e12 : null;
    const marketCapChange24h = data.data.market_cap_change_percentage_24h_usd ?? null;

    console.log("[coingecko] Total Market Cap:", totalMarketCapTrillion?.toFixed(2) + "T");
    console.log("[coingecko] 24h Change:", marketCapChange24h?.toFixed(2) + "%");

    return {
      totalMarketCap,
      totalMarketCapTrillion,
      marketCapChange24h,
    };
  } catch (error) {
    console.error("[coingecko] fetchGlobalMetrics error:", error);
    return {
      totalMarketCap: null,
      totalMarketCapTrillion: null,
      marketCapChange24h: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Mayer Multiple (BTC specific)
// ============================================================================

export interface MayerMultipleData {
  current: number | null;        // Mayer Multiple value
  btcPrice: number | null;       // Current BTC price
  ma200: number | null;          // 200-day moving average
  interpretation: "oversold" | "fair" | "overbought" | null;
  error?: string;
}

/**
 * Fetch Mayer Multiple for BTC
 * Mayer Multiple = Current Price / 200-day Simple Moving Average
 *
 * Interpretation:
 * - < 1.0: Oversold (price below 200-day average)
 * - 1.0 - 2.4: Fair value range
 * - > 2.4: Overbought (historically high, potential bubble)
 */
export async function fetchMayerMultiple(): Promise<MayerMultipleData> {
  try {
    // Fetch 200 days of price data
    const data = await fetchWithTimeout<MarketChartResponse>(
      `${COINGECKO_API}/coins/bitcoin/market_chart?vs_currency=usd&days=200&interval=daily`,
      5000,
      86400 // 1 day cache - 200d MA barely changes
    );

    if (!data.prices || data.prices.length < 100) {
      throw new Error("Not enough price data for 200-day average");
    }

    // Extract prices
    const prices = data.prices.map(p => p[1]);

    // Current price is the last entry
    const btcPrice = prices[prices.length - 1];

    // Calculate 200-day Simple Moving Average
    const ma200 = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    // Calculate Mayer Multiple
    const current = ma200 > 0 ? btcPrice / ma200 : null;

    // Determine interpretation
    let interpretation: "oversold" | "fair" | "overbought" | null = null;
    if (current !== null) {
      if (current < 1.0) {
        interpretation = "oversold";
      } else if (current <= 2.4) {
        interpretation = "fair";
      } else {
        interpretation = "overbought";
      }
    }

    console.log(`[coingecko] Mayer Multiple: ${current?.toFixed(2)} (${interpretation})`);
    console.log(`[coingecko] BTC Price: $${btcPrice?.toLocaleString()}, 200d MA: $${ma200?.toLocaleString()}`);

    return {
      current,
      btcPrice,
      ma200,
      interpretation,
    };
  } catch (error) {
    console.error("[coingecko] fetchMayerMultiple error:", error);
    return {
      current: null,
      btcPrice: null,
      ma200: null,
      interpretation: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// BTC Company Holdings (Public Treasuries)
// ============================================================================

interface CompanyTreasuryResponse {
  total_holdings: number;
  total_value_usd: number;
  market_cap_dominance: number;
  companies: Array<{
    name: string;
    symbol: string;
    country: string;
    total_holdings: number;
    total_entry_value_usd: number;
    total_current_value_usd: number;
    percentage_of_total_supply: number;
  }>;
}

export interface BtcCompanyHolding {
  name: string;
  symbol: string;
  country: string;
  holdings: number;          // BTC amount
  value: number;             // Current USD value
  percentOfSupply: number;   // % of total BTC supply
}

export interface BtcCompanyHoldingsData {
  totalBtc: number | null;
  totalUsd: number | null;
  marketCapDominance: number | null;
  companies: BtcCompanyHolding[] | null;
  error?: string;
}

/**
 * Fetch public company BTC holdings from CoinGecko
 * Returns aggregate stats and top companies holding BTC
 */
export async function fetchBtcCompanyHoldings(): Promise<BtcCompanyHoldingsData> {
  try {
    const data = await fetchWithTimeout<CompanyTreasuryResponse>(
      `${COINGECKO_API}/companies/public_treasury/bitcoin`,
      5000,
      3600 // 1 hour cache - corporate holdings don't change frequently
    );

    const companies: BtcCompanyHolding[] = data.companies.map(c => ({
      name: c.name,
      symbol: c.symbol,
      country: c.country,
      holdings: c.total_holdings,
      value: c.total_current_value_usd,
      percentOfSupply: c.percentage_of_total_supply,
    }));

    console.log(`[coingecko] BTC Company Holdings: ${data.total_holdings.toLocaleString()} BTC`);
    console.log(`[coingecko] Top holder: ${companies[0]?.name} (${companies[0]?.holdings.toLocaleString()} BTC)`);

    return {
      totalBtc: data.total_holdings,
      totalUsd: data.total_value_usd,
      marketCapDominance: data.market_cap_dominance,
      companies,
    };
  } catch (error) {
    console.error("[coingecko] fetchBtcCompanyHoldings error:", error);
    return {
      totalBtc: null,
      totalUsd: null,
      marketCapDominance: null,
      companies: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
