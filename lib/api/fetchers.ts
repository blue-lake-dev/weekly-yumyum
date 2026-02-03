/**
 * API Fetchers - Used by both Server Components and TanStack Query hooks
 * These functions can run on server or client
 */

// Helper to build full URL for server-side fetching
function getUrl(path: string): string {
  // On server, we need full URL; on client, relative path works
  if (typeof window === "undefined") {
    return `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}${path}`;
  }
  return path;
}

// ============ Types ============

export interface TickerItem {
  symbol: string;
  name: string;
  image: string;
  price: number | null;
  change24h: number | null;
}

export interface QuickStatsData {
  totalMarketCap: {
    value: number | null;
    change24h: number | null;
  };
  fearGreed: {
    value: number | null;
    label: string;
    change1d: number | null;
    change7d: number | null;
    change30d: number | null;
  };
  dominance: {
    btc: number | null;
    eth: number | null;
    others: number | null;
  };
  stablecoins: {
    value: number | null;
    change7d: number | null;
    sparkline: number[];
  };
  etfFlows: {
    btc: number | null;
    eth: number | null;
    sol: number | null;
    date: string | null;
  };
}

export interface CoinChange {
  symbol: string;
  change: number;
}

export interface GainersLosersData {
  gainers: CoinChange[];
  losers: CoinChange[];
}

export interface SummaryData {
  summary: string | null;
  date: string;
}

export interface DerivativeItem {
  longPct: number;
  shortPct: number;
  fundingRate: number;
  fundingRatePct: string;
}

export interface DerivativesData {
  btc: DerivativeItem | null;
  eth: DerivativeItem | null;
  sol: DerivativeItem | null;
}

export interface RwaData {
  total: number | null;
  byChain: Record<string, number>;
}

// Chain data types
interface EtfFlow {
  today: number | null;
  history: Array<{ date: string; value: number | null }>;
}

export interface BtcData {
  chain: "btc";
  price7d: { change: number | null; sparkline: number[] };
  supply: { circulating: number | null; maxSupply: number | null; percentMined: number | null };
  etfFlows: EtfFlow;
}

export interface EthData {
  chain: "eth";
  price7d: { change: number | null; sparkline: number[] };
  supply: { circulating: number | null; totalBurnt: number | null; stakingRewards: number | null };
  burn: { last24h: number | null; last7d: number | null; supplyGrowthPct: number | null; isDeflationary: boolean | null };
  tvl: { total: number | null; change7d: number | null; sparkline: number[] };
  stablecoins: { total: number | null; change7d: number | null };
  etfFlows: EtfFlow;
}

export interface SolData {
  chain: "sol";
  price7d: { change: number | null; sparkline: number[] };
  supply: { total: number | null; circulating: number | null; staked: number | null; stakingPct: number | null };
  inflation: { annualRatePct: number | null; epoch: number | null };
  tvl: { total: number | null; change7d: number | null; sparkline: number[] };
  stablecoins: { total: number | null; change7d: number | null };
  etfFlows: EtfFlow;
}

export type ChainData = BtcData | EthData | SolData;
export type Chain = "btc" | "eth" | "sol";

// ============ Fetchers ============

export async function fetchTicker(): Promise<TickerItem[]> {
  const res = await fetch(getUrl("/api/v1/ticker"));
  if (!res.ok) throw new Error("Failed to fetch ticker");
  const json = await res.json();
  return json.tickers || [];
}

export async function fetchQuickStats(): Promise<QuickStatsData> {
  const res = await fetch(getUrl("/api/v1/quick-stats"));
  if (!res.ok) throw new Error("Failed to fetch quick stats");
  return res.json();
}

export async function fetchGainersLosers(): Promise<GainersLosersData> {
  try {
    const res = await fetch(getUrl("/api/v1/gainers-losers"));
    const json = await res.json();
    // Return data even if API returned error status (with empty arrays)
    return {
      gainers: json.gainers || [],
      losers: json.losers || [],
    };
  } catch {
    // Network error - return empty data
    return { gainers: [], losers: [] };
  }
}

export async function fetchSummary(): Promise<SummaryData> {
  const res = await fetch(getUrl("/api/v1/summary"));
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}

export async function fetchChainData(chain: Chain): Promise<ChainData> {
  const res = await fetch(getUrl(`/api/v1/chain/${chain}`));
  if (!res.ok) throw new Error(`Failed to fetch ${chain} data`);
  return res.json();
}

export async function fetchDerivatives(): Promise<DerivativesData> {
  const res = await fetch(getUrl("/api/v1/derivatives"));
  if (!res.ok) throw new Error("Failed to fetch derivatives");
  return res.json();
}

export async function fetchRwa(): Promise<RwaData> {
  // TODO: Add dedicated RWA endpoint
  return { total: null, byChain: {} };
}

// ============ Query Keys ============

export const queryKeys = {
  ticker: ["ticker"] as const,
  quickStats: ["quick-stats"] as const,
  gainersLosers: ["gainers-losers"] as const,
  summary: ["summary"] as const,
  chain: (chain: Chain) => ["chain", chain] as const,
  derivatives: ["derivatives"] as const,
  rwa: ["rwa"] as const,
};
