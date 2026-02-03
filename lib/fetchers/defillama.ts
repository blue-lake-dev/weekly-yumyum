import type { MetricValue } from "../types";
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
  current: number | null; // raw USD value
  change7d: number | null; // percentage
  sparkline: number[]; // 7 daily raw USD values
  error?: string;
}

/**
 * Fetch stablecoin by chain with 7d sparkline
 * @param chain - Chain name (e.g., "Ethereum", "Solana", "all")
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

    // Current value (latest) - raw USD
    const current = recentData[recentData.length - 1].totalCirculating.peggedUSD;

    // 7 days ago value (first of 8) - raw USD
    const previous = recentData[0].totalCirculating.peggedUSD;

    // Calculate 7d change
    const change7d = previous > 0 ? ((current - previous) / previous) * 100 : null;

    // Sparkline: last 7 days - raw USD values
    const sparkline = recentData.slice(-7).map(d => d.totalCirculating.peggedUSD);

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

// ============================================================================
// RWA (Real World Assets) by Chain
// ============================================================================

// ETH + L2 chains to track for RWA
const ETH_CHAINS = [
  "Ethereum",
  "Arbitrum",
  "Optimism",
  "Base",
  "Polygon",
  "zkSync Era",
  "Linea",
  "Scroll",
  "Mantle",
  "Blast",
];

interface DefiLlamaProtocol {
  name: string;
  category: string;
  chains: string[];
  chainTvls: Record<string, number>;
  tvl: number;
}

export interface RwaByChainData {
  total: number | null; // Total RWA TVL on ETH + L2s
  byChain: Record<string, number> | null; // { Ethereum: 5000000000, Arbitrum: 100000000, ... }
  topProtocols: Array<{ name: string; tvl: number; chains: string[] }> | null;
  error?: string;
}

export async function fetchRwaByChain(): Promise<RwaByChainData> {
  try {
    const protocols = await fetchWithTimeout<DefiLlamaProtocol[]>(
      `${DEFILLAMA_API}/protocols`
    );

    // Filter RWA category
    const rwaProtocols = protocols.filter((p) => p.category === "RWA");

    // Aggregate by chain
    const byChain: Record<string, number> = {};
    let total = 0;
    const protocolsOnEth: Array<{ name: string; tvl: number; chains: string[] }> = [];

    for (const protocol of rwaProtocols) {
      const chainTvls = protocol.chainTvls || {};
      let protocolEthTvl = 0;
      const protocolChains: string[] = [];

      for (const chain of ETH_CHAINS) {
        if (chainTvls[chain]) {
          const tvl = chainTvls[chain];
          byChain[chain] = (byChain[chain] || 0) + tvl;
          protocolEthTvl += tvl;
          protocolChains.push(chain);
        }
      }

      if (protocolEthTvl > 0) {
        total += protocolEthTvl;
        protocolsOnEth.push({
          name: protocol.name,
          tvl: protocolEthTvl,
          chains: protocolChains,
        });
      }
    }

    // Sort protocols by TVL and get top 10
    protocolsOnEth.sort((a, b) => b.tvl - a.tvl);
    const topProtocols = protocolsOnEth.slice(0, 10);

    // Sort byChain by TVL
    const sortedByChain = Object.fromEntries(
      Object.entries(byChain).sort((a, b) => b[1] - a[1])
    );

    return {
      total,
      byChain: sortedByChain,
      topProtocols,
    };
  } catch (error) {
    console.error("fetchRwaByChain error:", error);
    return {
      total: null,
      byChain: null,
      topProtocols: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
