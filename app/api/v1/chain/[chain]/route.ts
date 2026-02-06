import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// Import fetchers
import {
  fetchCoinSupply,
  fetchPriceSparkline,
  fetchMayerMultiple,
  fetchBtcCompanyHoldings,
} from "@/lib/fetchers/coingecko";
import { fetchMempoolStats } from "@/lib/fetchers/mempool";
import { fetchBtcHashrate } from "@/lib/fetchers/blockchain-com";
import { fetchEthBurnIssuance } from "@/lib/fetchers/ultrasound";
import { fetchEthStaking, fetchEthStakingRewards } from "@/lib/fetchers/beaconchain";
import {
  fetchChainTvlWithSparkline,
  fetchStablecoinWithSparkline,
  fetchL2TvlStacked,
  fetchL2StablecoinStacked,
} from "@/lib/fetchers/defillama";
import { fetchSolanaSupply, fetchSolanaInflation, fetchSolanaDailyFees } from "@/lib/fetchers/solana";
import { fetchEthEtfHoldings, fetchBtcEtfHoldings } from "@/lib/fetchers/dune";

type ChainParam = "btc" | "eth" | "sol";

/**
 * Convert APR to APY with compounding
 * @param apr - Annual Percentage Rate as decimal (e.g., 0.059 for 5.9%)
 * @param periodsPerYear - Number of compounding periods per year
 * @returns APY as decimal
 */
function aprToApy(apr: number, periodsPerYear: number): number {
  return Math.pow(1 + apr / periodsPerYear, periodsPerYear) - 1;
}

/**
 * GET /api/v3/chain/[chain]
 * Returns chain-specific data for BTC, ETH, or SOL
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chain: string }> }
) {
  const { chain } = await params;
  const chainLower = chain.toLowerCase() as ChainParam;

  if (!["btc", "eth", "sol"].includes(chainLower)) {
    return NextResponse.json(
      { error: `Invalid chain: ${chain}. Use btc, eth, or sol.` },
      { status: 400 }
    );
  }

  try {
    switch (chainLower) {
      case "btc":
        return NextResponse.json(await getBtcData());
      case "eth":
        return NextResponse.json(await getEthData());
      case "sol":
        return NextResponse.json(await getSolData());
    }
  } catch (error) {
    console.error(`[chain/${chain}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch chain data" },
      { status: 500 }
    );
  }
}

/**
 * BTC Chain Data
 * - 7d price sparkline + change + high/low
 * - Mayer Multiple (price / 200d MA)
 * - Mempool stats (pending tx, fees, congestion)
 * - Hashrate with 30d sparkline
 * - Mining cost (from Supabase, scraped weekly)
 * - Company holdings (public treasuries)
 * - ETF flows (7d history for chart)
 * - ETF holdings (from Dune)
 */
async function getBtcData() {
  console.log("[chain/btc] Fetching BTC data...");

  const [
    sparklineData,
    supplyData,
    mayerMultipleData,
    mempoolData,
    hashrateData,
    miningCost,
    companyHoldings,
    etfFlows,
    etfHoldings,
  ] = await Promise.all([
    fetchPriceSparkline("bitcoin"),
    fetchCoinSupply("bitcoin"),
    fetchMayerMultiple(),
    fetchMempoolStats(),
    fetchBtcHashrate(),
    getMiningCostFromSupabase(),
    fetchBtcCompanyHoldings(),
    getEtfFlowHistory("etf_flow_btc", 7),
    fetchBtcEtfHoldings(),
  ]);

  console.log("[chain/btc] Sparkline points:", sparklineData.sparkline.length);
  console.log("[chain/btc] Supply:", supplyData.circulatingSupply?.toLocaleString());
  console.log("[chain/btc] Mayer Multiple:", mayerMultipleData.current?.toFixed(2), `(${mayerMultipleData.interpretation})`);
  console.log("[chain/btc] Mempool:", mempoolData.pendingTxCount?.toLocaleString(), "txs,", mempoolData.congestionLevel);
  console.log("[chain/btc] Hashrate:", hashrateData.current?.toFixed(2), "EH/s");
  console.log("[chain/btc] Mining cost:", miningCost.productionCost ? `$${miningCost.productionCost.toLocaleString()}` : "N/A");
  console.log("[chain/btc] Company holdings:", companyHoldings.totalBtc?.toLocaleString(), "BTC");
  console.log("[chain/btc] ETF flows:", etfFlows.length, "days");
  console.log("[chain/btc] ETF holdings:", etfHoldings.totalBtc?.toLocaleString(), "BTC");

  // Calculate percent mined
  const percentMined = supplyData.circulatingSupply && supplyData.maxSupply
    ? (supplyData.circulatingSupply / supplyData.maxSupply) * 100
    : null;

  // Calculate 7d high/low from sparkline
  const high7d = sparklineData.sparkline.length > 0
    ? Math.max(...sparklineData.sparkline)
    : null;
  const low7d = sparklineData.sparkline.length > 0
    ? Math.min(...sparklineData.sparkline)
    : null;

  return {
    chain: "btc",
    price7d: {
      change: sparklineData.change7d,
      sparkline: sparklineData.sparkline,
      high: high7d,
      low: low7d,
    },
    supply: {
      circulating: supplyData.circulatingSupply,
      maxSupply: supplyData.maxSupply,
      percentMined,
    },
    mayerMultiple: {
      current: mayerMultipleData.current,
      ma200: mayerMultipleData.ma200,
      interpretation: mayerMultipleData.interpretation,
    },
    mempool: {
      pendingTxCount: mempoolData.pendingTxCount,
      pendingVsize: mempoolData.pendingVsize,
      fees: mempoolData.fees,
      congestionLevel: mempoolData.congestionLevel,
    },
    hashrate: {
      current: hashrateData.current,
      change30d: hashrateData.change30d,
      sparkline: hashrateData.sparkline,
    },
    miningCost: {
      productionCost: miningCost.productionCost,
      date: miningCost.date,
    },
    companyHoldings: {
      totalBtc: companyHoldings.totalBtc,
      totalUsd: companyHoldings.totalUsd,
      companies: companyHoldings.companies?.slice(0, 10).map(c => ({
        name: c.name,
        symbol: c.symbol,
        holdings: c.holdings,
        value: c.value,
      })) ?? null,
    },
    etfFlows: {
      today: etfFlows[0]?.value ?? null,
      history: etfFlows,
    },
    etfHoldings: {
      totalBtc: etfHoldings.totalBtc,
      totalUsd: etfHoldings.totalUsd,
      holdings: etfHoldings.holdings,
    },
    timestamp: new Date().toISOString(),
  };
}

// Helper to measure fetch time
async function timed<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const ms = (performance.now() - start).toFixed(0);
  console.log(`[chain/eth] ⏱ ${name}: ${ms}ms`);
  return result;
}

/**
 * ETH Chain Data
 * - 7d price sparkline + change + high/low
 * - Supply + Staking (from Etherscan + beaconcha.in)
 * - Burn/Issuance (deflationary check)
 * - L2 TVL + Stablecoins (stacked for charts, incl. L2s)
 * - ETF flows (7d history) + holdings (AUM)
 * - DAT holdings (corporate/institutional)
 */
async function getEthData() {
  const totalStart = performance.now();

  const [
    sparklineData,
    supplyData,
    stakingData,
    stakingRewardsData,
    burnIssuanceData,
    l2TvlData,
    l2StablecoinData,
    etfFlows,
    etfHoldings,
    datHoldings,
  ] = await Promise.all([
    timed("CoinGecko (sparkline)", () => fetchPriceSparkline("ethereum")),
    timed("CoinGecko (supply)", () => fetchCoinSupply("ethereum")),
    timed("Beaconchain (staking)", () => fetchEthStaking()),
    timed("Beaconchain (rewards)", () => fetchEthStakingRewards()),
    timed("Ultrasound (burn)", () => fetchEthBurnIssuance()),
    timed("DeFiLlama (L2 TVL)", () => fetchL2TvlStacked()),
    timed("DeFiLlama (L2 stables)", () => fetchL2StablecoinStacked()),
    timed("Supabase (ETF flows)", () => getEtfFlowHistory("etf_flow_eth", 7)),
    timed("Dune (ETF holdings)", () => fetchEthEtfHoldings()),
    timed("Supabase (DAT)", () => getDatHoldings("dat_holdings_eth")),
  ]);

  // Calculate staking ratio using CoinGecko supply (faster than Etherscan)
  const stakingRatio = stakingData.totalStaked && supplyData.circulatingSupply
    ? (stakingData.totalStaked / supplyData.circulatingSupply) * 100
    : null;

  const totalMs = (performance.now() - totalStart).toFixed(0);
  console.log(`[chain/eth] ✅ All fetches complete in ${totalMs}ms`);
  console.log("[chain/eth] Sparkline:", sparklineData.sparkline.length, "pts, change:", sparklineData.change7d?.toFixed(2) + "%");
  console.log("[chain/eth] Supply:", supplyData.circulatingSupply?.toLocaleString(), "ETH");
  console.log("[chain/eth] Staking:", stakingData.totalStaked?.toLocaleString(), "ETH,", stakingRatio?.toFixed(2) + "%");
  console.log("[chain/eth] Staking APR:", stakingRewardsData.apr ? (stakingRewardsData.apr * 100).toFixed(2) + "%" : "N/A");
  console.log("[chain/eth] Issuance 7d:", stakingRewardsData.issuance7d?.toFixed(0), "ETH");
  console.log("[chain/eth] Burn 7d:", burnIssuanceData.burn7d?.toFixed(2), "ETH");
  console.log("[chain/eth] L2 TVL chains:", l2TvlData.chains.length, ", total:", (l2TvlData.totals.current / 1e9).toFixed(2) + "B");
  console.log("[chain/eth] L2 Stablecoins chains:", l2StablecoinData.chains.length, ", total:", (l2StablecoinData.totals.current / 1e9).toFixed(2) + "B");
  console.log("[chain/eth] ETF flows:", etfFlows.length, "days");
  console.log("[chain/eth] ETF holdings:", etfHoldings.totalEth?.toLocaleString(), "ETH");
  console.log("[chain/eth] DAT holdings:", datHoldings.totalEth?.toLocaleString(), "ETH,", datHoldings.companies?.length ?? 0, "companies");

  // Calculate 7d high/low from sparkline
  const high7d = sparklineData.sparkline.length > 0
    ? Math.max(...sparklineData.sparkline)
    : null;
  const low7d = sparklineData.sparkline.length > 0
    ? Math.min(...sparklineData.sparkline)
    : null;

  // Calculate net supply change (issuance - burn)
  const issuance7d = stakingRewardsData.issuance7d;
  const burn7d = burnIssuanceData.burn7d;
  const netSupplyChange7d = issuance7d && burn7d ? issuance7d - burn7d : null;
  const isDeflationary = netSupplyChange7d !== null ? netSupplyChange7d < 0 : null;

  return {
    chain: "eth",
    price7d: {
      change: sparklineData.change7d,
      sparkline: sparklineData.sparkline,
      high: high7d,
      low: low7d,
    },
    supply: {
      circulating: supplyData.circulatingSupply,
      totalBurnt: burnIssuanceData.burnTotal, // Total since EIP-1559 (from ultrasound)
    },
    staking: {
      totalStaked: stakingData.totalStaked,
      validatorCount: stakingData.validatorCount,
      stakingRatio, // Calculated using CoinGecko supply
      apy: stakingRewardsData.apr ? aprToApy(stakingRewardsData.apr, 365) : null, // Convert APR to APY (daily compounding)
    },
    inflation: {
      issuance7d: stakingRewardsData.issuance7d,
      burn7d: burnIssuanceData.burn7d,
      netSupplyChange7d,
      supplyGrowthPct: burnIssuanceData.supplyGrowthRateYearly
        ? burnIssuanceData.supplyGrowthRateYearly * 100
        : null,
      isDeflationary,
    },
    // Legacy burn field for backwards compatibility
    burn: {
      last24h: burnIssuanceData.burn24h,
      last7d: burnIssuanceData.burn7d,
      sinceMerge: burnIssuanceData.burnSinceMerge,
      supplyGrowthPct: burnIssuanceData.supplyGrowthRateYearly
        ? burnIssuanceData.supplyGrowthRateYearly * 100
        : null,
      isDeflationary: burnIssuanceData.isDeflationary,
    },
    l2Tvl: {
      dates: l2TvlData.dates,
      chains: l2TvlData.chains,
      totals: l2TvlData.totals,
    },
    l2Stablecoins: {
      dates: l2StablecoinData.dates,
      chains: l2StablecoinData.chains,
      totals: l2StablecoinData.totals,
    },
    etfFlows: {
      today: etfFlows[0]?.value ?? null,
      history: etfFlows,
    },
    etfHoldings: {
      totalEth: etfHoldings.totalEth,
      totalUsd: etfHoldings.totalUsd,
      holdings: etfHoldings.holdings,
    },
    datHoldings: datHoldings,
    timestamp: new Date().toISOString(),
  };
}

/**
 * SOL Chain Data
 * - 7d price sparkline + change (current price from ticker API)
 * - Supply + staking (from Solana RPC)
 * - 24h fees (from Dune) + inflation rate (from RPC)
 * - TVL + Stablecoins on chain (with sparklines)
 * - ETF flows (7d history for chart)
 */
async function getSolData() {
  console.log("[chain/sol] Fetching SOL data...");

  const [
    sparklineData,
    supplyData,
    inflationData,
    feesData,
    tvlData,
    stablecoinsData,
    etfFlows,
    etfHoldings,
    datHoldings,
  ] = await Promise.all([
    fetchPriceSparkline("solana"),
    fetchSolanaSupply(),
    fetchSolanaInflation(),
    fetchSolanaDailyFees(7), // Get 7d for chart
    fetchChainTvlWithSparkline("Solana"),
    fetchStablecoinWithSparkline("Solana"),
    getEtfFlowHistory("etf_flow_sol", 7),
    getSolEtfHoldings(),
    getSolDatHoldings(),
  ]);

  // Calculate 7d high/low from sparkline
  const high7d = sparklineData.sparkline.length > 0
    ? Math.max(...sparklineData.sparkline)
    : null;
  const low7d = sparklineData.sparkline.length > 0
    ? Math.min(...sparklineData.sparkline)
    : null;

  // Calculate staking APR from inflation: APR = inflation_rate × (total_supply / staked_amount)
  // Then convert to APY with ~150 epochs/year compounding
  const stakingApr = inflationData.annualRatePct && supplyData.totalSupply && supplyData.stakedAmount
    ? (inflationData.annualRatePct / 100) * (supplyData.totalSupply / supplyData.stakedAmount)
    : null;
  const stakingApy = stakingApr ? aprToApy(stakingApr, 150) : null;

  console.log("[chain/sol] Sparkline:", sparklineData.sparkline.length, "pts, change:", sparklineData.change7d?.toFixed(2) + "%");
  console.log("[chain/sol] Supply:", supplyData.circulatingSupply?.toLocaleString(), "SOL, staking:", supplyData.stakingPct?.toFixed(1) + "%");
  console.log("[chain/sol] Staking APR:", stakingApr ? (stakingApr * 100).toFixed(2) + "%" : "N/A", "→ APY:", stakingApy ? (stakingApy * 100).toFixed(2) + "%" : "N/A");
  console.log("[chain/sol] Inflation:", inflationData.annualRatePct?.toFixed(2) + "%");
  console.log("[chain/sol] TVL:", tvlData.current ? (tvlData.current / 1e9).toFixed(2) + "B" : "null");
  console.log("[chain/sol] ETF flows:", etfFlows.length, "days");
  console.log("[chain/sol] ETF holdings:", etfHoldings.holdings?.length ?? 0, "funds, AUM:", etfHoldings.totalUsd ? (etfHoldings.totalUsd / 1e6).toFixed(2) + "M" : "null");
  console.log("[chain/sol] DAT holdings:", datHoldings.totalSol?.toLocaleString(), "SOL,", datHoldings.companies?.length ?? 0, "companies");

  return {
    chain: "sol",
    price7d: {
      change: sparklineData.change7d,
      sparkline: sparklineData.sparkline,
      high: high7d,
      low: low7d,
    },
    supply: {
      total: supplyData.totalSupply,
      circulating: supplyData.circulatingSupply,
    },
    staking: {
      staked: supplyData.stakedAmount,
      stakingPct: supplyData.stakingPct,
      apy: stakingApy, // Calculated from inflation, converted to APY
    },
    inflation: {
      annualRatePct: inflationData.annualRatePct,
      epoch: inflationData.epoch,
    },
    fees: {
      daily: feesData.totalFeesSol,
      history: feesData.fees7d, // 7d fees for chart
    },
    tvl: {
      total: tvlData.current,
      change7d: tvlData.change7d,
      sparkline: tvlData.sparkline,
    },
    stablecoins: {
      total: stablecoinsData.current,
      change7d: stablecoinsData.change7d,
      sparkline: stablecoinsData.sparkline,
    },
    etfFlows: {
      today: etfFlows[0]?.value ?? null,
      history: etfFlows,
    },
    etfHoldings: etfHoldings,
    datHoldings: datHoldings,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get ETF flow history from Supabase
 * Returns last N available trading days (excludes weekends automatically)
 */
async function getEtfFlowHistory(key: string, days: number) {
  const supabase = createServerClient();

  // Fetch last N rows by date (not calendar days) to handle weekends
  const { data, error } = await supabase
    .from("metrics")
    .select("date, value")
    .eq("key", key)
    .order("date", { ascending: false })
    .limit(days);

  if (error) {
    console.error("[chain] getEtfFlowHistory error:", error);
    return [];
  }

  console.log(`[chain] getEtfFlowHistory ${key}: ${data?.length ?? 0} rows`);

  return (data || []).map((row: { date: string; value: number | null }) => ({
    date: row.date,
    value: row.value !== null ? row.value * 1e6 : null, // Convert millions to raw USD
  }));
}

// Type for DAT metadata stored in Supabase
interface DatMetadata {
  totalUsd?: number;
  supplyPct?: number;
  companies?: Array<{
    name: string;
    holdings: number;
    holdingsUsd: number;
    supplyPct: number;
  }>;
}

// Type for metrics row with metadata
interface MetricsRowWithMetadata {
  date: string;
  value: number | null;
  metadata: Record<string, unknown>;
}

/**
 * Get DAT holdings from Supabase (stored by daily cron)
 */
async function getDatHoldings(key: string) {
  const supabase = createServerClient();

  // Get the most recent DAT holdings entry
  const { data, error } = await supabase
    .from("metrics")
    .select("date, value, metadata")
    .eq("key", key)
    .order("date", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.error("[chain] getDatHoldings error:", error);
    return {
      totalEth: null,
      totalUsd: null,
      supplyPct: null,
      companies: null,
      date: null,
    };
  }

  const row = data[0] as MetricsRowWithMetadata;
  const metadata = row.metadata as DatMetadata | null;

  return {
    totalEth: row.value,
    totalUsd: metadata?.totalUsd ?? null,
    supplyPct: metadata?.supplyPct ?? null,
    companies: metadata?.companies ?? null,
    date: row.date,
  };
}

// Type for SOL ETF holdings metadata stored in Supabase
interface SolEtfMetadata {
  holdings?: Array<{
    ticker: string;
    issuer: string;
    coin: string;
    flows: number | null;
    aum: number | null;
  }>;
}

/**
 * Get SOL ETF holdings from Supabase (stored by daily cron)
 */
async function getSolEtfHoldings() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("metrics")
    .select("date, value, metadata")
    .eq("key", "etf_holdings_sol")
    .order("date", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.error("[chain] getSolEtfHoldings error:", error);
    return {
      totalSol: null,
      totalUsd: null,
      holdings: null,
      date: null,
    };
  }

  const row = data[0] as MetricsRowWithMetadata;
  const metadata = row.metadata as SolEtfMetadata | null;

  return {
    totalSol: null, // Not tracked directly, would need price to calculate
    totalUsd: row.value,
    holdings: metadata?.holdings?.map(h => ({
      ticker: h.ticker,
      issuer: h.issuer,
      usd: h.aum ?? 0,
    })) ?? null,
    date: row.date,
  };
}

// Type for SOL DAT holdings metadata stored in Supabase
interface SolDatMetadata {
  totalUsd?: number;
  supplyPct?: number;
  companies?: Array<{
    name: string;
    holdings: number;
    holdingsUsd: number;
    supplyPct: number;
  }>;
}

/**
 * Get SOL DAT holdings from Supabase (stored by daily cron)
 */
async function getSolDatHoldings() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("metrics")
    .select("date, value, metadata")
    .eq("key", "dat_holdings_sol")
    .order("date", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.error("[chain] getSolDatHoldings error:", error);
    return {
      totalSol: null,
      totalUsd: null,
      supplyPct: null,
      companies: null,
      date: null,
    };
  }

  const row = data[0] as MetricsRowWithMetadata;
  const metadata = row.metadata as SolDatMetadata | null;

  return {
    totalSol: row.value,
    totalUsd: metadata?.totalUsd ?? null,
    supplyPct: metadata?.supplyPct ?? null,
    companies: metadata?.companies ?? null,
    date: row.date,
  };
}

// Type for mining cost stored in Supabase
interface MiningCostRow {
  date: string;
  value: number | null;
}

/**
 * Get BTC mining cost from Supabase (stored weekly by cron)
 */
async function getMiningCostFromSupabase() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("metrics")
    .select("date, value")
    .eq("key", "btc_mining_cost")
    .order("date", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.log("[chain/btc] No mining cost data in Supabase");
    return {
      productionCost: null,
      date: null,
    };
  }

  const row = data[0] as MiningCostRow;

  return {
    productionCost: row.value,
    date: row.date,
  };
}
