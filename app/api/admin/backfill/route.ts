import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { MetricInsert } from "@/lib/database.types";
import { fetchEtfFlows } from "@/lib/fetchers/farside";

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const DEFILLAMA_API = "https://api.llama.fi";

// Delay helper to avoid rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface BackfillResult {
  success: boolean;
  metricsStored: number;
  errors: string[];
  details: {
    etfFlows: number;
    prices: number;
    tvl: number;
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
 * Backfill historical data for metrics that support it
 * POST /api/admin/backfill?days=7
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

  console.log(`[backfill] Starting backfill for ${days} days...`);

  const errors: string[] = [];
  const metrics: MetricInsert[] = [];
  const details = { etfFlows: 0, prices: 0, tvl: 0 };

  // 1. ETF Flows (Farside) - already supports N days
  try {
    console.log("[backfill] 1. Fetching ETF flows...");
    const etfFlows = await fetchEtfFlows(days);

    if (etfFlows.eth) {
      for (const flow of etfFlows.eth) {
        metrics.push({
          date: flow.date,
          key: "etf_flow_eth",
          value: flow.total,
          metadata: { flows: flow.flows },
        });
        details.etfFlows++;
      }
      console.log(`[backfill] 1. ETH ETF flows: ${etfFlows.eth.length} days`);
    }

    if (etfFlows.btc) {
      for (const flow of etfFlows.btc) {
        metrics.push({
          date: flow.date,
          key: "etf_flow_btc",
          value: flow.total,
          metadata: { flows: flow.flows },
        });
        details.etfFlows++;
      }
      console.log(`[backfill] 1. BTC ETF flows: ${etfFlows.btc.length} days`);
    }

    if (etfFlows.error) errors.push(`etf_flows: ${etfFlows.error}`);
  } catch (e) {
    errors.push(`etf_flows: ${e}`);
    console.error("[backfill] 1. ETF flows error:", e);
  }

  // 2. ETH/BTC Prices (CoinGecko)
  try {
    console.log("[backfill] 2. Fetching prices...");

    // Fetch BTC prices
    const btcResponse = await fetch(
      `${COINGECKO_API}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`
    );
    if (btcResponse.ok) {
      const btcData = await btcResponse.json();
      const prices = btcData.prices as [number, number][];

      for (const [timestamp, price] of prices) {
        const date = new Date(timestamp).toISOString().split("T")[0];
        metrics.push({
          date,
          key: "btc_price",
          value: price,
          metadata: { source: "coingecko" },
        });
        details.prices++;
      }
      console.log(`[backfill] 2. BTC prices: ${prices.length} days`);
    } else {
      errors.push(`btc_price: HTTP ${btcResponse.status}`);
      console.error(`[backfill] 2. BTC prices error: HTTP ${btcResponse.status}`);
    }

    await delay(500); // Rate limit

    // Fetch ETH prices
    const ethResponse = await fetch(
      `${COINGECKO_API}/coins/ethereum/market_chart?vs_currency=usd&days=${days}&interval=daily`
    );
    if (ethResponse.ok) {
      const ethData = await ethResponse.json();
      const prices = ethData.prices as [number, number][];

      for (const [timestamp, price] of prices) {
        const date = new Date(timestamp).toISOString().split("T")[0];
        metrics.push({
          date,
          key: "eth_price",
          value: price,
          metadata: { source: "coingecko" },
        });
        details.prices++;
      }
      console.log(`[backfill] 2. ETH prices: ${prices.length} days`);
    } else {
      errors.push(`eth_price: HTTP ${ethResponse.status}`);
      console.error(`[backfill] 2. ETH prices error: HTTP ${ethResponse.status}`);
    }
  } catch (e) {
    errors.push(`prices: ${e}`);
    console.error("[backfill] 2. Prices error:", e);
  }

  // 3. ETH TVL (DeFiLlama)
  try {
    console.log("[backfill] 3. Fetching ETH TVL...");

    const tvlResponse = await fetch(
      `${DEFILLAMA_API}/v2/historicalChainTvl/Ethereum`
    );

    if (tvlResponse.ok) {
      const tvlData = (await tvlResponse.json()) as Array<{
        date: number;
        tvl: number;
      }>;

      // Get last N days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

      const recentData = tvlData.filter((d) => d.date >= cutoffTimestamp);

      for (const entry of recentData) {
        const date = new Date(entry.date * 1000).toISOString().split("T")[0];
        // Convert to billions for consistency
        const tvlInBillions = entry.tvl / 1e9;
        metrics.push({
          date,
          key: "eth_tvl",
          value: tvlInBillions,
          metadata: { raw: entry.tvl, source: "defillama" },
        });
        details.tvl++;
      }
      console.log(`[backfill] 3. ETH TVL: ${recentData.length} days`);
    } else {
      errors.push(`eth_tvl: HTTP ${tvlResponse.status}`);
      console.error(`[backfill] 3. ETH TVL error: HTTP ${tvlResponse.status}`);
    }
  } catch (e) {
    errors.push(`eth_tvl: ${e}`);
    console.error("[backfill] 3. ETH TVL error:", e);
  }

  // Deduplicate metrics (same date+key can appear if API returns overlapping data)
  const dedupedMetrics = dedupeMetrics(metrics);
  console.log(`[backfill] Deduped: ${metrics.length} -> ${dedupedMetrics.length} metrics`);

  // Store all metrics in Supabase
  let metricsStored = 0;
  if (dedupedMetrics.length > 0) {
    console.log(`[backfill] 4. Storing ${dedupedMetrics.length} metrics to Supabase...`);
    console.log(`[backfill] 4. Keys: ${[...new Set(dedupedMetrics.map(m => m.key))].join(", ")}`);

    try {
      const supabase = createServerClient();

      // Upsert metrics (update if date+key exists)
      const { error: upsertError } = await supabase
        .from("metrics")
        .upsert(dedupedMetrics as any, { onConflict: "date,key" });

      if (upsertError) {
        console.error("[backfill] 4. Supabase error:", upsertError);
        errors.push(`supabase: ${upsertError.message}`);
      } else {
        metricsStored = dedupedMetrics.length;
        console.log(`[backfill] 4. Successfully stored ${metricsStored} metrics`);
      }
    } catch (e) {
      errors.push(`supabase: ${e}`);
      console.error("[backfill] 4. Supabase exception:", e);
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
