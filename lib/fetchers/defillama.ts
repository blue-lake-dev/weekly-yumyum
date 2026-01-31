import type { MetricValue, LendingProtocol } from "../types";
import { formatTimestamp } from "../utils";

const DEFILLAMA_API = "https://api.llama.fi";
const STABLECOINS_API = "https://stablecoins.llama.fi";

// 7 days in seconds
const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;

interface StablecoinChartEntry {
  date: string; // Unix timestamp in seconds
  totalCirculating: { peggedUSD: number };
}

interface StablecoinChainChartEntry {
  date: string;
  totalCirculating: { peggedUSD: number };
  totalCirculatingUSD: { peggedUSD: number };
}

interface ProtocolData {
  name: string;
  slug: string;
  chainTvls?: Record<string, {
    tvl: Array<{ date: number; totalLiquidityUSD: number }>;
  }>;
  currentChainTvls?: Record<string, number>;
}

async function fetchWithTimeout<T>(url: string, timeout = 15000): Promise<T> {
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

// Helper to calculate change percentage
function calcChangePct(current: number | null, previous: number | null): number | undefined {
  if (current === null || previous === null || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

// Helper to find entry closest to target timestamp
function findEntryAtDate<T extends { date: string | number }>(
  data: T[],
  targetTimestamp: number
): { entry: T | null; timestamp: number | null } {
  if (!data || data.length === 0) return { entry: null, timestamp: null };

  let closest = data[0];
  let closestTimestamp = Number(data[0].date);
  let minDiff = Math.abs(closestTimestamp - targetTimestamp);

  for (const entry of data) {
    const timestamp = Number(entry.date);
    const diff = Math.abs(timestamp - targetTimestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closest = entry;
      closestTimestamp = timestamp;
    }
  }

  return { entry: closest, timestamp: closestTimestamp };
}

// Fetch total stablecoin supply with historical data
export async function fetchStablecoinSupply(): Promise<MetricValue> {
  try {
    const data = await fetchWithTimeout<StablecoinChartEntry[]>(
      `${STABLECOINS_API}/stablecoincharts/all`
    );

    if (!data || data.length === 0) {
      throw new Error("No stablecoin data");
    }

    // Latest entry
    const latest = data[data.length - 1];
    const current = latest.totalCirculating.peggedUSD / 1e9; // Billions
    const currentTimestamp = Number(latest.date);
    const current_at = formatTimestamp(currentTimestamp, "UTC");

    // Find entry from ~7 days ago
    const sevenDaysAgo = currentTimestamp - SEVEN_DAYS_SEC;
    const { entry: previousEntry, timestamp: previousTimestamp } = findEntryAtDate(data, sevenDaysAgo);
    const previous = previousEntry ? previousEntry.totalCirculating.peggedUSD / 1e9 : null;
    const previous_at = previousTimestamp ? formatTimestamp(previousTimestamp, "UTC") : undefined;

    return {
      current,
      current_at,
      previous,
      previous_at,
      change_pct: calcChangePct(current, previous),
      source: "defillama",
    };
  } catch (error) {
    console.error("fetchStablecoinSupply error:", error);
    return { current: null, error: "Failed to fetch stablecoin supply", source: "defillama" };
  }
}

// Fetch stablecoin by specific chain with historical data
export async function fetchStablecoinByChain(chain: string): Promise<MetricValue> {
  try {
    // Use the chain-specific chart endpoint for historical data
    const data = await fetchWithTimeout<StablecoinChainChartEntry[]>(
      `${STABLECOINS_API}/stablecoincharts/${chain}`
    );

    if (!data || data.length === 0) {
      throw new Error(`No stablecoin data for ${chain}`);
    }

    // Latest entry
    const latest = data[data.length - 1];
    const current = latest.totalCirculating.peggedUSD / 1e9; // Billions
    const currentTimestamp = Number(latest.date);
    const current_at = formatTimestamp(currentTimestamp, "UTC");

    // Find entry from ~7 days ago
    const sevenDaysAgo = currentTimestamp - SEVEN_DAYS_SEC;
    const { entry: previousEntry, timestamp: previousTimestamp } = findEntryAtDate(data, sevenDaysAgo);
    const previous = previousEntry ? previousEntry.totalCirculating.peggedUSD / 1e9 : null;
    const previous_at = previousTimestamp ? formatTimestamp(previousTimestamp, "UTC") : undefined;

    return {
      current,
      current_at,
      previous,
      previous_at,
      change_pct: calcChangePct(current, previous),
      source: "defillama",
    };
  } catch (error) {
    console.error(`fetchStablecoinByChain(${chain}) error:`, error);
    return { current: null, error: `Failed to fetch ${chain} stablecoin`, source: "defillama" };
  }
}

export interface StablecoinSparklineData {
  current: number | null; // in billions
  change7d: number | null; // percentage
  sparkline: number[]; // 7 daily values in billions
  error?: string;
}

/**
 * Fetch stablecoin by chain with 7d sparkline
 * @param chain - Chain name (e.g., "Ethereum", "Solana")
 */
export async function fetchStablecoinWithSparkline(chain: string): Promise<StablecoinSparklineData> {
  try {
    const data = await fetchWithTimeout<StablecoinChainChartEntry[]>(
      `${STABLECOINS_API}/stablecoincharts/${chain}`
    );

    if (!data || data.length === 0) {
      throw new Error(`No stablecoin data for ${chain}`);
    }

    // Get last 8 days (need 8 to calculate 7d change)
    const recentData = data.slice(-8);

    // Current value (latest)
    const current = recentData[recentData.length - 1].totalCirculating.peggedUSD / 1e9;

    // 7 days ago value (first of 8)
    const previous = recentData[0].totalCirculating.peggedUSD / 1e9;

    // Calculate 7d change
    const change7d = previous > 0 ? ((current - previous) / previous) * 100 : null;

    // Sparkline: last 7 days
    const sparkline = recentData.slice(-7).map(d => d.totalCirculating.peggedUSD / 1e9);

    return {
      current,
      change7d,
      sparkline,
    };
  } catch (error) {
    console.error(`fetchStablecoinWithSparkline(${chain}) error:`, error);
    return {
      current: null,
      change7d: null,
      sparkline: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Lending protocols to track (sorted by typical borrow volume)
const LENDING_PROTOCOLS = [
  { slug: "aave-v3", name: "Aave" },
  { slug: "morpho-blue", name: "Morpho" },
  { slug: "spark", name: "Spark" },
  { slug: "compound-v3", name: "Compound" },
  { slug: "justlend", name: "JustLend" },
];

// Fetch single protocol borrowed amount with historical data
async function fetchProtocolBorrowed(slug: string): Promise<{
  current: number | null;
  current_at: string | undefined;
  previous: number | null;
  previous_at: string | undefined;
}> {
  try {
    const data = await fetchWithTimeout<ProtocolData>(
      `${DEFILLAMA_API}/protocol/${slug}`
    );

    if (!data.chainTvls) {
      return { current: null, current_at: undefined, previous: null, previous_at: undefined };
    }

    let totalCurrent = 0;
    let totalPrevious = 0;
    let latestTimestamp = 0;
    let previousTimestamp = 0;

    const now = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = now - SEVEN_DAYS_SEC;

    // Sum all borrowed amounts from chainTvls (keys ending with "-borrowed")
    for (const [key, chainData] of Object.entries(data.chainTvls)) {
      if (key.endsWith("-borrowed") && chainData.tvl && chainData.tvl.length > 0) {
        // Current: latest entry
        const latestEntry = chainData.tvl[chainData.tvl.length - 1];
        totalCurrent += latestEntry.totalLiquidityUSD || 0;
        if (latestEntry.date > latestTimestamp) {
          latestTimestamp = latestEntry.date;
        }

        // Previous: find entry closest to 7 days ago
        const { entry: prevEntry, timestamp: prevTs } = findEntryAtDate(chainData.tvl, sevenDaysAgo);
        if (prevEntry) {
          totalPrevious += prevEntry.totalLiquidityUSD || 0;
          if (prevTs && prevTs > previousTimestamp) {
            previousTimestamp = prevTs;
          }
        }
      }
    }

    return {
      current: totalCurrent > 0 ? totalCurrent : null,
      current_at: latestTimestamp > 0 ? formatTimestamp(latestTimestamp, "UTC") : undefined,
      previous: totalPrevious > 0 ? totalPrevious : null,
      previous_at: previousTimestamp > 0 ? formatTimestamp(previousTimestamp, "UTC") : undefined,
    };
  } catch (error) {
    console.error(`fetchProtocolBorrowed(${slug}) error:`, error);
    return { current: null, current_at: undefined, previous: null, previous_at: undefined };
  }
}

// Fetch top 3 lending protocols by borrowed amount with historical data
export async function fetchTopLendingProtocols(): Promise<{
  total: MetricValue;
  protocols: LendingProtocol[];
}> {
  try {
    const results = await Promise.all(
      LENDING_PROTOCOLS.map(async (p) => {
        const { current, current_at, previous, previous_at } = await fetchProtocolBorrowed(p.slug);
        return { name: p.name, current, current_at, previous, previous_at };
      })
    );

    // Filter out nulls and sort by current borrowed amount
    const validResults = results
      .filter((r) => r.current !== null)
      .sort((a, b) => (b.current || 0) - (a.current || 0));

    // Calculate totals
    const totalCurrent = validResults.reduce((sum, r) => sum + (r.current || 0), 0);
    const totalPrevious = validResults.reduce((sum, r) => sum + (r.previous || 0), 0);

    // Use the most recent timestamp from results
    const current_at = validResults[0]?.current_at;
    const previous_at = validResults[0]?.previous_at;

    // Get top 3
    const top3 = validResults.slice(0, 3);

    return {
      total: {
        current: totalCurrent / 1e9, // Billions
        current_at,
        previous: totalPrevious > 0 ? totalPrevious / 1e9 : null,
        previous_at,
        change_pct: calcChangePct(totalCurrent, totalPrevious),
        source: "defillama",
      },
      protocols: top3.map((p) => ({
        name: p.name,
        borrow: {
          current: (p.current || 0) / 1e9,
          current_at: p.current_at,
          previous: p.previous ? p.previous / 1e9 : null,
          previous_at: p.previous_at,
          change_pct: calcChangePct(p.current, p.previous),
          source: "defillama" as const,
        },
      })),
    };
  } catch (error) {
    console.error("fetchTopLendingProtocols error:", error);
    return {
      total: { current: null, error: "Failed to fetch lending data", source: "defillama" },
      protocols: [],
    };
  }
}

// ETF Flow data - manual input
export async function fetchBtcEtfFlow(): Promise<MetricValue> {
  return {
    current: null,
    source: "manual",
    isManual: true,
  };
}

export async function fetchEthEtfFlow(): Promise<MetricValue> {
  return {
    current: null,
    source: "manual",
    isManual: true,
  };
}

// Fetch Ethereum chain TVL from DeFiLlama
interface ChainTvlEntry {
  gecko_id: string;
  tvl: number;
  tokenSymbol: string;
  cmcId: string;
  name: string;
  chainId: number | null;
}

export async function fetchEthTvl(): Promise<MetricValue> {
  try {
    const data = await fetchWithTimeout<ChainTvlEntry[]>(`${DEFILLAMA_API}/v2/chains`);

    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid chains data");
    }

    // Find Ethereum entry
    const ethChain = data.find((c) => c.name === "Ethereum");
    if (!ethChain) {
      throw new Error("Ethereum chain not found");
    }

    const current = ethChain.tvl / 1e9; // Convert to billions
    const now = Date.now();

    return {
      current,
      current_at: formatTimestamp(Math.floor(now / 1000), "UTC"),
      previous: null, // No historical API for chains TVL
      source: "defillama",
    };
  } catch (error) {
    console.error("fetchEthTvl error:", error);
    return { current: null, error: "Failed to fetch ETH TVL", source: "defillama" };
  }
}

// Historical TVL entry from DeFiLlama
interface HistoricalTvlEntry {
  date: number; // Unix timestamp in seconds
  tvl: number;
}

export interface TvlSparklineData {
  current: number | null; // in billions
  change7d: number | null; // percentage
  sparkline: number[]; // 7 daily values in billions
  error?: string;
}

/**
 * Fetch chain TVL with 7d sparkline
 * @param chain - Chain name (e.g., "Ethereum", "Solana")
 */
export async function fetchChainTvlWithSparkline(chain: string): Promise<TvlSparklineData> {
  try {
    const data = await fetchWithTimeout<HistoricalTvlEntry[]>(
      `${DEFILLAMA_API}/v2/historicalChainTvl/${chain}`
    );

    if (!data || data.length === 0) {
      throw new Error(`No TVL data for ${chain}`);
    }

    // Get last 8 days (need 8 to calculate 7d change)
    const recentData = data.slice(-8);

    // Current value (latest)
    const current = recentData[recentData.length - 1].tvl / 1e9;

    // 7 days ago value (first of 8)
    const previous = recentData[0].tvl / 1e9;

    // Calculate 7d change
    const change7d = previous > 0 ? ((current - previous) / previous) * 100 : null;

    // Sparkline: last 7 days (skip first, take last 7)
    const sparkline = recentData.slice(-7).map(d => d.tvl / 1e9);

    return {
      current,
      change7d,
      sparkline,
    };
  } catch (error) {
    console.error(`fetchChainTvlWithSparkline(${chain}) error:`, error);
    return {
      current: null,
      change7d: null,
      sparkline: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
