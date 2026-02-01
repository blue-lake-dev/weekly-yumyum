import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// Import fetchers
import { fetchCoinSupply, fetchPriceSparkline } from "@/lib/fetchers/coingecko-market";
import { fetchEthBurnIssuance } from "@/lib/fetchers/ultrasound-burn";
import { fetchEthSupply } from "@/lib/fetchers/etherscan-supply";
import { fetchChainTvlWithSparkline, fetchStablecoinWithSparkline } from "@/lib/fetchers/defillama-tvl";
import { fetchSolanaSupply, fetchSolanaInflation, fetchSolanaDailyFees } from "@/lib/fetchers/solana-chain";

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
  const [sparklineData, supplyData, etfFlows] = await Promise.all([
    fetchPriceSparkline("bitcoin"),
    fetchCoinSupply("bitcoin"),
    getEtfFlowHistory("etf_flow_btc", 7),
  ]);

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
 * - 7d price sparkline + change (current price from ticker API)
 * - Supply (from Etherscan)
 * - Burn/Issuance (deflationary check)
 * - TVL + Stablecoins on chain (with sparklines)
 * - ETF flows (7d history for chart)
 */
async function getEthData() {
  const [
    sparklineData,
    supplyData,
    burnIssuanceData,
    tvlData,
    stablecoinsData,
    etfFlows,
  ] = await Promise.all([
    fetchPriceSparkline("ethereum"),
    fetchEthSupply(),
    fetchEthBurnIssuance(),
    fetchChainTvlWithSparkline("Ethereum"),
    fetchStablecoinWithSparkline("Ethereum"),
    getEtfFlowHistory("etf_flow_eth", 7),
  ]);

  return {
    chain: "eth",
    price7d: {
      change: sparklineData.change7d,
      sparkline: sparklineData.sparkline,
    },
    supply: {
      circulating: supplyData.ethSupply,
      totalBurnt: supplyData.ethBurnt,
      stakingRewards: supplyData.eth2Staking,
    },
    burn: {
      last24h: burnIssuanceData.burn24h,
      last7d: burnIssuanceData.burn7d,
      sinceMerge: burnIssuanceData.burnSinceMerge,
      supplyGrowthPct: burnIssuanceData.supplyGrowthRateYearly
        ? burnIssuanceData.supplyGrowthRateYearly * 100
        : null, // e.g., 0.79 for 0.79%/year
      isDeflationary: burnIssuanceData.isDeflationary,
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
 * SOL Chain Data
 * - 7d price sparkline + change (current price from ticker API)
 * - Supply + staking (from Solana RPC)
 * - 24h fees (from Dune) + inflation rate (from RPC)
 * - TVL + Stablecoins on chain (with sparklines)
 * - ETF flows (7d history for chart)
 */
async function getSolData() {
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
 */
async function getEtfFlowHistory(key: string, days: number) {
  const supabase = createServerClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("metrics")
    .select("date, value")
    .eq("key", key)
    .gte("date", startDate.toISOString().split("T")[0])
    .order("date", { ascending: false });

  if (error) {
    console.error("[chain] getEtfFlowHistory error:", error);
    return [];
  }

  return (data || []).map((row: { date: string; value: number | null }) => ({
    date: row.date,
    value: row.value,
  }));
}
