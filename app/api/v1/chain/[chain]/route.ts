import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// Import fetchers
import { fetchCoinSupply, fetchPriceSparkline } from "@/lib/fetchers/coingecko";
import { fetchEthBurnIssuance } from "@/lib/fetchers/ultrasound";
import { fetchEthSupply, fetchEthStaking } from "@/lib/fetchers/etherscan";
import {
  fetchChainTvlWithSparkline,
  fetchStablecoinWithSparkline,
  fetchL2TvlStacked,
  fetchL2StablecoinStacked,
} from "@/lib/fetchers/defillama";
import { fetchSolanaSupply, fetchSolanaInflation, fetchSolanaDailyFees } from "@/lib/fetchers/solana";
import { fetchEthEtfHoldings } from "@/lib/fetchers/dune";

export const revalidate = 900; // 15 min cache

type ChainParam = "btc" | "eth" | "sol";

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
 * - 7d price sparkline + change (current price from ticker API)
 * - Circulating supply from CoinGecko
 * - ETF flows (7d history for chart)
 */
async function getBtcData() {
  console.log("[chain/btc] Fetching BTC data...");

  const [sparklineData, supplyData, etfFlows] = await Promise.all([
    fetchPriceSparkline("bitcoin"),
    fetchCoinSupply("bitcoin"),
    getEtfFlowHistory("etf_flow_btc", 7),
  ]);

  console.log("[chain/btc] Sparkline points:", sparklineData.sparkline.length);
  console.log("[chain/btc] Supply:", supplyData.circulatingSupply?.toLocaleString());
  console.log("[chain/btc] ETF flows:", etfFlows.length, "days");

  // Calculate percent mined
  const percentMined = supplyData.circulatingSupply && supplyData.maxSupply
    ? (supplyData.circulatingSupply / supplyData.maxSupply) * 100
    : null;

  return {
    chain: "btc",
    price7d: {
      change: sparklineData.change7d,
      sparkline: sparklineData.sparkline,
    },
    supply: {
      circulating: supplyData.circulatingSupply,
      maxSupply: supplyData.maxSupply,
      percentMined,
    },
    etfFlows: {
      today: etfFlows[0]?.value ?? null,
      history: etfFlows,
    },
    timestamp: new Date().toISOString(),
  };
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
  console.log("[chain/eth] Fetching ETH data...");

  const [
    sparklineData,
    supplyData,
    stakingData,
    burnIssuanceData,
    l2TvlData,
    l2StablecoinData,
    etfFlows,
    etfHoldings,
    datHoldings,
  ] = await Promise.all([
    fetchPriceSparkline("ethereum"),
    fetchEthSupply(),
    fetchEthStaking(),
    fetchEthBurnIssuance(),
    fetchL2TvlStacked(),
    fetchL2StablecoinStacked(),
    getEtfFlowHistory("etf_flow_eth", 7),
    fetchEthEtfHoldings(),
    getDatHoldings("dat_holdings_eth"),
  ]);

  console.log("[chain/eth] Sparkline:", sparklineData.sparkline.length, "pts, change:", sparklineData.change7d?.toFixed(2) + "%");
  console.log("[chain/eth] Supply:", supplyData.ethSupply?.toLocaleString(), "ETH");
  console.log("[chain/eth] Staking:", stakingData.totalStaked?.toLocaleString(), "ETH,", stakingData.stakingRatio?.toFixed(2) + "%");
  console.log("[chain/eth] Burn 24h:", burnIssuanceData.burn24h?.toFixed(2), "ETH, deflationary:", burnIssuanceData.isDeflationary);
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

  return {
    chain: "eth",
    price7d: {
      change: sparklineData.change7d,
      sparkline: sparklineData.sparkline,
      high: high7d,
      low: low7d,
    },
    supply: {
      circulating: supplyData.ethSupply,
      totalBurnt: supplyData.ethBurnt,
    },
    staking: {
      totalStaked: stakingData.totalStaked,
      validatorCount: stakingData.validatorCount,
      stakingRatio: stakingData.stakingRatio,
    },
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
  ] = await Promise.all([
    fetchPriceSparkline("solana"),
    fetchSolanaSupply(),
    fetchSolanaInflation(),
    fetchSolanaDailyFees(7), // Get 7d for chart
    fetchChainTvlWithSparkline("Solana"),
    fetchStablecoinWithSparkline("Solana"),
    getEtfFlowHistory("etf_flow_sol", 7),
  ]);

  console.log("[chain/sol] Sparkline:", sparklineData.sparkline.length, "pts, change:", sparklineData.change7d?.toFixed(2) + "%");
  console.log("[chain/sol] Supply:", supplyData.circulatingSupply?.toLocaleString(), "SOL, staking:", supplyData.stakingPct?.toFixed(1) + "%");
  console.log("[chain/sol] Inflation:", inflationData.annualRatePct?.toFixed(2) + "%");
  console.log("[chain/sol] TVL:", tvlData.current ? (tvlData.current / 1e9).toFixed(2) + "B" : "null");
  console.log("[chain/sol] ETF flows:", etfFlows.length, "days");

  return {
    chain: "sol",
    price7d: {
      change: sparklineData.change7d,
      sparkline: sparklineData.sparkline,
    },
    supply: {
      total: supplyData.totalSupply,
      circulating: supplyData.circulatingSupply,
      staked: supplyData.stakedAmount,
      stakingPct: supplyData.stakingPct,
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
    value: row.value,
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
