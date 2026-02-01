import { NextResponse } from "next/server";
import { fetchFearGreed } from "@/lib/fetchers/alternative";
import { fetchDominance } from "@/lib/fetchers/coinmarketcap";
import { fetchStablecoinSupply } from "@/lib/fetchers/defillama";
import { createServerClient } from "@/lib/supabase";

export const revalidate = 900; // 15 min cache

/**
 * GET /api/v3/quick-stats
 * Returns: Fear & Greed, BTC Dominance, Stablecoins, ETF flows
 */
export async function GET() {
  const errors: string[] = [];

  // Fetch all data in parallel
  const [fearGreedResult, dominanceResult, stablecoinResult, etfFlowsResult] =
    await Promise.all([
      fetchFearGreed().catch((e) => {
        errors.push(`fearGreed: ${e}`);
        return { current: null, error: String(e) };
      }),
      fetchDominance().catch((e) => {
        errors.push(`dominance: ${e}`);
        return { btcDominance: null, ethDominance: null, othersDominance: null, error: String(e) };
      }),
      fetchStablecoinSupply().catch((e) => {
        errors.push(`stablecoins: ${e}`);
        return { current: null, error: String(e) };
      }),
      fetchLatestEtfFlows().catch((e) => {
        errors.push(`etfFlows: ${e}`);
        return { btc: null, eth: null, sol: null };
      }),
    ]);

  // Get Fear & Greed label
  const fgValue = fearGreedResult.current as number | null;
  const fgLabel = getFearGreedLabel(fgValue);

  // Add dominance error if present
  if (dominanceResult.error) {
    errors.push(`dominance: ${dominanceResult.error}`);
  }

  return NextResponse.json({
    fearGreed: {
      value: fgValue,
      label: fgLabel,
    },
    dominance: {
      btc: dominanceResult.btcDominance,
      eth: dominanceResult.ethDominance,
      others: dominanceResult.othersDominance,
    },
    stablecoins: {
      total: stablecoinResult.current,
    },
    etfFlows: etfFlowsResult,
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
}> {
  const supabase = createServerClient();

  // Fetch the most recent record for each ETF flow key
  const [btcResult, ethResult, solResult] = await Promise.all([
    supabase
      .from("metrics")
      .select("value")
      .eq("key", "etf_flow_btc")
      .order("date", { ascending: false })
      .limit(1),
    supabase
      .from("metrics")
      .select("value")
      .eq("key", "etf_flow_eth")
      .order("date", { ascending: false })
      .limit(1),
    supabase
      .from("metrics")
      .select("value")
      .eq("key", "etf_flow_sol")
      .order("date", { ascending: false })
      .limit(1),
  ]);

  return {
    btc: (btcResult.data?.[0] as { value: number } | undefined)?.value ?? null,
    eth: (ethResult.data?.[0] as { value: number } | undefined)?.value ?? null,
    sol: (solResult.data?.[0] as { value: number } | undefined)?.value ?? null,
  };
}

/**
 * Get Korean label for Fear & Greed value
 */
function getFearGreedLabel(value: number | null): string {
  if (value === null) return "알 수 없음";
  if (value <= 25) return "극단적 공포";
  if (value <= 45) return "공포";
  if (value <= 55) return "중립";
  if (value <= 75) return "탐욕";
  return "극단적 탐욕";
}
