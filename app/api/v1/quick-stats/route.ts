import { NextResponse } from "next/server";
import { fetchFearGreedExtended } from "@/lib/fetchers/alternative";
import { fetchDominance } from "@/lib/fetchers/coinmarketcap";
import { fetchGlobalMetrics } from "@/lib/fetchers/coingecko";
import { fetchStablecoinWithSparkline } from "@/lib/fetchers/defillama";
import { createServerClient } from "@/lib/supabase";

/**
 * GET /api/v1/quick-stats
 * Returns: Total Market Cap, Fear & Greed, Dominance, Stablecoins, ETF flows
 */
export async function GET() {
  const errors: string[] = [];

  // Fetch all data in parallel
  const [
    globalMetricsResult,
    fearGreedResult,
    dominanceResult,
    stablecoinResult,
    etfFlowsResult,
  ] = await Promise.all([
    fetchGlobalMetrics().catch((e) => {
      errors.push(`globalMetrics: ${e}`);
      return { totalMarketCap: null, marketCapChange24h: null, error: String(e) };
    }),
    fetchFearGreedExtended().catch((e) => {
      errors.push(`fearGreed: ${e}`);
      return { value: null, label: "알 수 없음", change1d: null, change7d: null, change30d: null, error: String(e) };
    }),
    fetchDominance().catch((e) => {
      errors.push(`dominance: ${e}`);
      return { btcDominance: null, ethDominance: null, othersDominance: null, error: String(e) };
    }),
    fetchStablecoinWithSparkline("all").catch((e) => {
      errors.push(`stablecoins: ${e}`);
      return { current: null, change7d: null, sparkline: [], error: String(e) };
    }),
    fetchLatestEtfFlows().catch((e) => {
      errors.push(`etfFlows: ${e}`);
      return { btc: null, eth: null, sol: null, date: null };
    }),
  ]);

  // Add errors from results that have error property
  if (globalMetricsResult.error) {
    errors.push(`globalMetrics: ${globalMetricsResult.error}`);
  }
  if (fearGreedResult.error) {
    errors.push(`fearGreed: ${fearGreedResult.error}`);
  }
  if (dominanceResult.error) {
    errors.push(`dominance: ${dominanceResult.error}`);
  }

  return NextResponse.json({
    totalMarketCap: {
      value: globalMetricsResult.totalMarketCap, // Raw USD value (e.g., 3.41e12)
      change24h: globalMetricsResult.marketCapChange24h,
    },
    fearGreed: {
      value: fearGreedResult.value,
      label: fearGreedResult.label,
      change1d: fearGreedResult.change1d,
      change7d: fearGreedResult.change7d,
      change30d: fearGreedResult.change30d,
    },
    dominance: {
      btc: dominanceResult.btcDominance,
      eth: dominanceResult.ethDominance,
      others: dominanceResult.othersDominance,
    },
    stablecoins: {
      value: stablecoinResult.current, // Raw USD value
      change7d: stablecoinResult.change7d ?? null,
      sparkline: stablecoinResult.sparkline ?? [], // Raw USD values
    },
    etfFlows: {
      btc: etfFlowsResult.btc !== null ? etfFlowsResult.btc * 1e6 : null, // Raw USD
      eth: etfFlowsResult.eth !== null ? etfFlowsResult.eth * 1e6 : null, // Raw USD
      sol: etfFlowsResult.sol !== null ? etfFlowsResult.sol * 1e6 : null, // Raw USD
      date: etfFlowsResult.date,
    },
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Fetch latest available ETF flows from Supabase
 * (ETFs only trade on weekdays, so we fetch most recent data, not just today)
 */
async function fetchLatestEtfFlows(): Promise<{
  btc: number | null;
  eth: number | null;
  sol: number | null;
  date: string | null;
}> {
  const supabase = createServerClient();

  // Fetch the most recent record for each ETF flow key
  const [btcResult, ethResult, solResult] = await Promise.all([
    supabase
      .from("metrics")
      .select("value, date")
      .eq("key", "etf_flow_btc")
      .order("date", { ascending: false })
      .limit(1),
    supabase
      .from("metrics")
      .select("value, date")
      .eq("key", "etf_flow_eth")
      .order("date", { ascending: false })
      .limit(1),
    supabase
      .from("metrics")
      .select("value, date")
      .eq("key", "etf_flow_sol")
      .order("date", { ascending: false })
      .limit(1),
  ]);

  // Type for metric row
  type MetricRow = { value: number; date: string };

  // Get the most recent date from any of the results
  const dates = [
    (btcResult.data as MetricRow[] | null)?.[0]?.date,
    (ethResult.data as MetricRow[] | null)?.[0]?.date,
    (solResult.data as MetricRow[] | null)?.[0]?.date,
  ].filter(Boolean) as string[];

  const latestDate = dates.length > 0 ? dates.sort().reverse()[0] : null;

  return {
    btc: (btcResult.data as MetricRow[] | null)?.[0]?.value ?? null,
    eth: (ethResult.data as MetricRow[] | null)?.[0]?.value ?? null,
    sol: (solResult.data as MetricRow[] | null)?.[0]?.value ?? null,
    date: latestDate,
  };
}
