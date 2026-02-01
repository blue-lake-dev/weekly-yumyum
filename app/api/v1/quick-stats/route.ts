import { NextResponse } from "next/server";
import { fetchFearGreed } from "@/lib/fetchers/alternative-fng";
import { fetchDominance } from "@/lib/fetchers/coinmarketcap-dominance";
import { fetchStablecoinSupply } from "@/lib/fetchers/defillama-tvl";
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
      fetchTodayEtfFlows().catch((e) => {
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
 * Fetch today's ETF flows from Supabase
 */
async function fetchTodayEtfFlows(): Promise<{
  btc: number | null;
  eth: number | null;
  sol: number | null;
}> {
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("metrics")
    .select("key, value")
    .eq("date", today)
    .in("key", ["etf_flow_btc", "etf_flow_eth", "etf_flow_sol"]);

  if (error) {
    console.error("[quick-stats] Supabase error:", error);
    throw error;
  }

  const flows = {
    btc: null as number | null,
    eth: null as number | null,
    sol: null as number | null,
  };

  for (const row of (data as Array<{ key: string; value: number | null }>) || []) {
    if (row.key === "etf_flow_btc") flows.btc = row.value;
    if (row.key === "etf_flow_eth") flows.eth = row.value;
    if (row.key === "etf_flow_sol") flows.sol = row.value;
  }

  return flows;
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
