import { createServerClient } from "@/lib/supabase";
import type { MetricInsert } from "@/lib/database.types";
import { fetchEtfFlows } from "./farside-etf";

// Get today's date in YYYY-MM-DD format
function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export interface FetchResult {
  success: boolean;
  metricsStored: number;
  errors: string[];
}

/**
 * V3 Aggregator - Stores only 3 ETF flow metrics daily
 * Everything else is fetched live (no storage needed)
 *
 * Stored metrics:
 * - etf_flow_btc
 * - etf_flow_eth
 * - etf_flow_sol
 */
export async function fetchAndStoreV3Metrics(): Promise<FetchResult> {
  console.log("[v3-aggregator] Starting fetch...");
  const errors: string[] = [];
  const metrics: MetricInsert[] = [];
  const today = getToday();

  // Fetch ETF Flows from Farside (BTC, ETH, SOL)
  try {
    const etfFlows = await fetchEtfFlows(1); // Fetch most recent day
    console.log("[v3-aggregator] Farside ETF Flows response:", JSON.stringify(etfFlows));

    // Check if data is from today
    const latestEthDate = etfFlows.eth?.[0]?.date;
    const latestBtcDate = etfFlows.btc?.[0]?.date;
    const latestSolDate = etfFlows.sol?.[0]?.date;

    const isEthToday = latestEthDate === today;
    const isBtcToday = latestBtcDate === today;
    const isSolToday = latestSolDate === today;

    console.log(`[v3-aggregator] ETF dates - ETH: ${latestEthDate} (today: ${isEthToday}), BTC: ${latestBtcDate} (today: ${isBtcToday}), SOL: ${latestSolDate} (today: ${isSolToday})`);

    // Only store if data is from today (market has closed and Farside updated)
    if (isEthToday && etfFlows.eth?.[0]) {
      const ethFlow = etfFlows.eth[0];
      metrics.push({
        date: ethFlow.date,
        key: "etf_flow_eth",
        value: ethFlow.total,
        metadata: { flows: ethFlow.flows },
      });
    }

    if (isBtcToday && etfFlows.btc?.[0]) {
      const btcFlow = etfFlows.btc[0];
      metrics.push({
        date: btcFlow.date,
        key: "etf_flow_btc",
        value: btcFlow.total,
        metadata: { flows: btcFlow.flows },
      });
    }

    if (isSolToday && etfFlows.sol?.[0]) {
      const solFlow = etfFlows.sol[0];
      metrics.push({
        date: solFlow.date,
        key: "etf_flow_sol",
        value: solFlow.total,
        metadata: { flows: solFlow.flows },
      });
    }

    if (!isEthToday && !isBtcToday && !isSolToday) {
      console.log("[v3-aggregator] Farside not updated yet for today, skipping ETF flows");
    }

    if (etfFlows.error) errors.push(`farside: ${etfFlows.error}`);
  } catch (e) {
    errors.push(`farside: ${e}`);
  }

  // Store metrics in Supabase
  if (metrics.length > 0) {
    console.log(`[v3-aggregator] Storing ${metrics.length} metrics:`, metrics.map(m => m.key));

    try {
      const supabase = createServerClient();

      // Upsert metrics (update if date+key exists, insert if not)
      const { data, error: upsertError } = await supabase
        .from("metrics")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(metrics as any, { onConflict: "date,key" })
        .select();

      console.log("[v3-aggregator] Upsert result - data:", data?.length ?? 0, "rows, error:", upsertError);

      if (upsertError) {
        console.error("[v3-aggregator] Supabase upsert error:", JSON.stringify(upsertError, null, 2));
        errors.push(`supabase: ${upsertError.message || upsertError.code || JSON.stringify(upsertError)}`);
      }
    } catch (e) {
      console.error("[v3-aggregator] Supabase exception:", e);
      errors.push(`supabase: ${e}`);
    }
  } else {
    console.log("[v3-aggregator] No metrics to store (Farside may not have today's data yet)");
  }

  return {
    success: errors.length === 0,
    metricsStored: metrics.length,
    errors,
  };
}
