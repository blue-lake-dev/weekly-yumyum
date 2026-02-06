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
  name: string;
  image: string;
  price: number;
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
  price7d: { change: number | null; sparkline: number[]; high: number | null; low: number | null };
  supply: { circulating: number | null; maxSupply: number | null; percentMined: number | null };
  mayerMultiple: { current: number | null; ma200: number | null; interpretation: "oversold" | "fair" | "overbought" | null };
  mempool: { pendingTxCount: number | null; pendingVsize: number | null; fees: { fastest: number | null; halfHour: number | null; hour: number | null; economy: number | null }; congestionLevel: "low" | "moderate" | "high" | "extreme" | null };
  hashrate: { current: number | null; change30d: number | null; sparkline: number[] };
  miningCost: { productionCost: number | null; date: string | null };
  companyHoldings: { totalBtc: number | null; totalUsd: number | null; companies: Array<{ name: string; symbol: string; holdings: number; value: number }> | null };
  etfFlows: EtfFlow;
  etfHoldings: { totalBtc: number | null; totalUsd: number | null; holdings: Array<{ ticker: string; issuer: string; btc: number; usd: number }> | null };
}

export interface EthData {
  chain: "eth";
  price7d: { change: number | null; sparkline: number[]; high: number | null; low: number | null };
  supply: { circulating: number | null; totalBurnt: number | null };
  staking: { totalStaked: number | null; validatorCount: number | null; stakingRatio: number | null; apy: number | null };
  inflation: { issuance7d: number | null; burn7d: number | null; netSupplyChange7d: number | null; supplyGrowthPct: number | null; isDeflationary: boolean | null };
  burn: { last24h: number | null; last7d: number | null; sinceMerge: number | null; supplyGrowthPct: number | null; isDeflationary: boolean | null };
  l2Tvl: { dates: string[]; chains: Array<{ name: string; values: number[]; current: number }>; totals: { current: number; previous: number; change7d: number | null } };
  l2Stablecoins: { dates: string[]; chains: Array<{ name: string; values: number[]; current: number }>; totals: { current: number; previous: number; change7d: number | null } };
  etfFlows: EtfFlow;
  etfHoldings: { totalEth: number | null; totalUsd: number | null; holdings: Array<{ ticker: string; issuer: string; eth: number; usd: number; percentage: number }> | null };
  datHoldings: { totalEth: number | null; totalUsd: number | null; supplyPct: number | null; companies: Array<{ name: string; holdings: number; holdingsUsd: number; supplyPct: number }> | null; date: string | null };
}

export interface SolData {
  chain: "sol";
  price7d: { change: number | null; sparkline: number[]; high: number | null; low: number | null };
  supply: { total: number | null; circulating: number | null };
  staking: { staked: number | null; stakingPct: number | null; apy: number | null };
  inflation: { annualRatePct: number | null; epoch: number | null };
  fees: { daily: number | null; history: Array<{ date: string; feesSol: number }> };
  tvl: { total: number | null; change7d: number | null; sparkline: number[] };
  stablecoins: { total: number | null; change7d: number | null; sparkline: number[] };
  etfFlows: EtfFlow;
  etfHoldings: { totalSol: number | null; totalUsd: number | null; holdings: Array<{ ticker: string; issuer: string; usd: number }> | null };
  datHoldings: { totalSol: number | null; totalUsd: number | null; supplyPct: number | null; companies: Array<{ name: string; holdings: number; holdingsUsd: number; supplyPct: number }> | null };
}

export type ChainData = BtcData | EthData | SolData;
export type Chain = "btc" | "eth" | "sol";

// ============ BTC Split Endpoint Types ============

export interface BtcPriceData {
  price: number | null;
  change1h: number | null;
  change24h: number | null;
  change7d: number | null;
  volume24h: number | null;
  high24h: number | null;
  low24h: number | null;
  sparkline7d: number[];
}

export interface BtcNetworkData {
  mempool: {
    pendingTxCount: number | null;
    pendingVsize: number | null;
    fees: {
      fastest: number | null;
      halfHour: number | null;
      hour: number | null;
      economy: number | null;
    };
    congestionLevel: "low" | "moderate" | "high" | "extreme" | null;
  };
  hashrate: {
    current: number | null;
    change30d: number | null;
    sparkline: number[];
  };
}

export interface BtcIndicatorsData {
  mayerMultiple: {
    current: number | null;
    ma200: number | null;
    interpretation: "oversold" | "fair" | "overbought" | null;
  };
  miningCost: {
    productionCost: number | null;
    date: string | null;
  };
  supply: {
    circulating: number | null;
    maxSupply: number | null;
    percentMined: number | null;
  };
}

export interface BtcHoldingsData {
  etfFlows: {
    today: number | null;
    history: Array<{ date: string; value: number | null }>;
  };
  etfHoldings: {
    totalBtc: number | null;
    totalUsd: number | null;
    holdings: Array<{ ticker: string; issuer: string; btc: number; usd: number }> | null;
  };
  companyHoldings: {
    totalBtc: number | null;
    totalUsd: number | null;
    companies: Array<{ name: string; symbol: string; holdings: number; value: number }> | null;
  };
}

// ============ ETH Split Endpoint Types ============

export interface EthPriceData {
  price7d: {
    change: number | null;
    sparkline: number[];
    high: number | null;
    low: number | null;
  };
}

export interface EthStatsData {
  supply: { circulating: number | null; totalBurnt: number | null };
  staking: { totalStaked: number | null; validatorCount: number | null; stakingRatio: number | null; apy: number | null };
  inflation: { issuance7d: number | null; burn7d: number | null; netSupplyChange7d: number | null; supplyGrowthPct: number | null; isDeflationary: boolean | null };
}

export interface EthChartsData {
  l2Tvl: { dates: string[]; chains: Array<{ name: string; values: number[]; current: number }>; totals: { current: number; previous: number; change7d: number | null } };
  l2Stablecoins: { dates: string[]; chains: Array<{ name: string; values: number[]; current: number }>; totals: { current: number; previous: number; change7d: number | null } };
}

export interface EthHoldingsData {
  etfFlows: EtfFlow;
  etfHoldings: { totalEth: number | null; totalUsd: number | null; holdings: Array<{ ticker: string; issuer: string; eth: number; usd: number; percentage: number }> | null };
  datHoldings: { totalEth: number | null; totalUsd: number | null; supplyPct: number | null; companies: Array<{ name: string; holdings: number; holdingsUsd: number; supplyPct: number }> | null; date: string | null };
}

// ============ SOL Split Endpoint Types ============

export interface SolPriceData {
  price7d: {
    change: number | null;
    sparkline: number[];
    high: number | null;
    low: number | null;
  };
}

export interface SolStatsData {
  supply: { total: number | null; circulating: number | null };
  staking: { staked: number | null; stakingPct: number | null; apy: number | null };
  inflation: { annualRatePct: number | null; epoch: number | null };
}

export interface SolChartsData {
  tvl: { total: number | null; change7d: number | null; sparkline: number[] };
  stablecoins: { total: number | null; change7d: number | null; sparkline: number[] };
}

export interface SolHoldingsData {
  etfFlows: EtfFlow;
  etfHoldings: { totalSol: number | null; totalUsd: number | null; holdings: Array<{ ticker: string; issuer: string; usd: number }> | null; date: string | null };
  datHoldings: { totalSol: number | null; totalUsd: number | null; supplyPct: number | null; companies: Array<{ name: string; holdings: number; holdingsUsd: number; supplyPct: number }> | null; date: string | null };
}

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

// ============ BTC Split Endpoint Fetchers ============

export async function fetchBtcPrice(): Promise<BtcPriceData> {
  const res = await fetch(getUrl("/api/v1/chain/btc/price"));
  if (!res.ok) throw new Error("Failed to fetch BTC price");
  return res.json();
}

export async function fetchBtcNetwork(): Promise<BtcNetworkData> {
  const res = await fetch(getUrl("/api/v1/chain/btc/network"));
  if (!res.ok) throw new Error("Failed to fetch BTC network");
  return res.json();
}

export async function fetchBtcIndicators(): Promise<BtcIndicatorsData> {
  const res = await fetch(getUrl("/api/v1/chain/btc/indicators"));
  if (!res.ok) throw new Error("Failed to fetch BTC indicators");
  return res.json();
}

export async function fetchBtcHoldings(): Promise<BtcHoldingsData> {
  const res = await fetch(getUrl("/api/v1/chain/btc/holdings"));
  if (!res.ok) throw new Error("Failed to fetch BTC holdings");
  return res.json();
}

// ============ ETH Split Endpoint Fetchers ============

export async function fetchEthPrice(): Promise<EthPriceData> {
  const res = await fetch(getUrl("/api/v1/chain/eth/price"));
  if (!res.ok) throw new Error("Failed to fetch ETH price");
  return res.json();
}

export async function fetchEthStats(): Promise<EthStatsData> {
  const res = await fetch(getUrl("/api/v1/chain/eth/stats"));
  if (!res.ok) throw new Error("Failed to fetch ETH stats");
  return res.json();
}

export async function fetchEthCharts(): Promise<EthChartsData> {
  const res = await fetch(getUrl("/api/v1/chain/eth/charts"));
  if (!res.ok) throw new Error("Failed to fetch ETH charts");
  return res.json();
}

export async function fetchEthHoldings(): Promise<EthHoldingsData> {
  const res = await fetch(getUrl("/api/v1/chain/eth/holdings"));
  if (!res.ok) throw new Error("Failed to fetch ETH holdings");
  return res.json();
}

// ============ SOL Split Endpoint Fetchers ============

export async function fetchSolPrice(): Promise<SolPriceData> {
  const res = await fetch(getUrl("/api/v1/chain/sol/price"));
  if (!res.ok) throw new Error("Failed to fetch SOL price");
  return res.json();
}

export async function fetchSolStats(): Promise<SolStatsData> {
  const res = await fetch(getUrl("/api/v1/chain/sol/stats"));
  if (!res.ok) throw new Error("Failed to fetch SOL stats");
  return res.json();
}

export async function fetchSolCharts(): Promise<SolChartsData> {
  const res = await fetch(getUrl("/api/v1/chain/sol/charts"));
  if (!res.ok) throw new Error("Failed to fetch SOL charts");
  return res.json();
}

export async function fetchSolHoldings(): Promise<SolHoldingsData> {
  const res = await fetch(getUrl("/api/v1/chain/sol/holdings"));
  if (!res.ok) throw new Error("Failed to fetch SOL holdings");
  return res.json();
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
  // BTC split endpoints
  btcPrice: ["btc", "price"] as const,
  btcNetwork: ["btc", "network"] as const,
  btcIndicators: ["btc", "indicators"] as const,
  btcHoldings: ["btc", "holdings"] as const,
  // ETH split endpoints
  ethPrice: ["eth", "price"] as const,
  ethStats: ["eth", "stats"] as const,
  ethCharts: ["eth", "charts"] as const,
  ethHoldings: ["eth", "holdings"] as const,
  // SOL split endpoints
  solPrice: ["sol", "price"] as const,
  solStats: ["sol", "stats"] as const,
  solCharts: ["sol", "charts"] as const,
  solHoldings: ["sol", "holdings"] as const,
};
