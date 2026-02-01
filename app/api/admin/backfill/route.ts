import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { MetricInsert } from "@/lib/database.types";
import { fetchEtfFlows } from "@/lib/fetchers/farside";

interface BackfillResult {
  success: boolean;
  metricsStored: number;
  errors: string[];
  details: {
    btcFlows: number;
    ethFlows: number;
    solFlows: number;
  };
}

// Deduplicate metrics by date+key (keep last occurrence)
function dedupeMetrics(metrics: MetricInsert[]): MetricInsert[] {
  const map = new Map<string, MetricInsert>();
  for (const m of metrics) {
    const key = `${m.date}:${m.key}`;
    map.set(key, m);
  }
  return Array.from(map.values());
}

/**
 * V3 Backfill - ETF flows only
 * POST /api/admin/backfill?days=7
 *
 * In V3, only ETF flows are stored in Supabase.
 * Everything else (prices, TVL, burn, etc.) is fetched live.
 */
export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "7", 10);

  if (days < 1 || days > 30) {
    return NextResponse.json(
      { error: "days must be between 1 and 30" },
      { status: 400 }
    );
  }

  console.log(`[backfill] Starting V3 backfill for ${days} days (ETF flows only)...`);

  const errors: string[] = [];
  const metrics: MetricInsert[] = [];
  const details = { btcFlows: 0, ethFlows: 0, solFlows: 0 };

  // Fetch ETF Flows (Farside) - BTC, ETH, SOL
  try {
    console.log("[backfill] Fetching ETF flows...");
    const etfFlows = await fetchEtfFlows(days);

    if (etfFlows.btc) {
      for (const flow of etfFlows.btc) {
        metrics.push({
          date: flow.date,
          key: "etf_flow_btc",
          value: flow.total,
          metadata: { flows: flow.flows },
        });
        details.btcFlows++;
      }
      console.log(`[backfill] BTC ETF flows: ${etfFlows.btc.length} days`);
    }

    if (etfFlows.eth) {
      for (const flow of etfFlows.eth) {
        metrics.push({
          date: flow.date,
          key: "etf_flow_eth",
          value: flow.total,
          metadata: { flows: flow.flows },
        });
        details.ethFlows++;
      }
      console.log(`[backfill] ETH ETF flows: ${etfFlows.eth.length} days`);
    }

    if (etfFlows.sol) {
      for (const flow of etfFlows.sol) {
        metrics.push({
          date: flow.date,
          key: "etf_flow_sol",
          value: flow.total,
          metadata: { flows: flow.flows },
        });
        details.solFlows++;
      }
      console.log(`[backfill] SOL ETF flows: ${etfFlows.sol.length} days`);
    }

    if (etfFlows.error) errors.push(`farside: ${etfFlows.error}`);
  } catch (e) {
    errors.push(`farside: ${e}`);
    console.error("[backfill] ETF flows error:", e);
  }

  // Deduplicate metrics (same date+key can appear if API returns overlapping data)
  const dedupedMetrics = dedupeMetrics(metrics);
  console.log(`[backfill] Deduped: ${metrics.length} -> ${dedupedMetrics.length} metrics`);

  // Store all metrics in Supabase
  let metricsStored = 0;
  if (dedupedMetrics.length > 0) {
    console.log(`[backfill] Storing ${dedupedMetrics.length} metrics to Supabase...`);

    try {
      const supabase = createServerClient();

      const { error: upsertError } = await supabase
        .from("metrics")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(dedupedMetrics as any, { onConflict: "date,key" });

      if (upsertError) {
        console.error("[backfill] Supabase error:", upsertError);
        errors.push(`supabase: ${upsertError.message}`);
      } else {
        metricsStored = dedupedMetrics.length;
        console.log(`[backfill] Successfully stored ${metricsStored} metrics`);
      }
    } catch (e) {
      errors.push(`supabase: ${e}`);
      console.error("[backfill] Supabase exception:", e);
    }
  }

  const result: BackfillResult = {
    success: errors.length === 0,
    metricsStored,
    errors,
    details,
  };

  console.log("[backfill] Result:", result);

  return NextResponse.json(result);
}
