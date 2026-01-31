/**
 * V3 Aggregator - Daily cron job
 * Stores 9 metrics/day to Supabase (down from ~16 in V2)
 * Note: SOL fees + inflation rate are fetched live, not stored
 */

import { createServerClient } from "@/lib/supabase";
import type { MetricInsert, DailySummaryInsert } from "@/lib/database.types";
import { fetchAllCoinGeckoData, fetchGainersLosers } from "./coingecko";
import { fetchEthBurnIssuance } from "./ultrasound";
import { fetchEtfFlows } from "./farside";
import { fetchFearGreed } from "./alternative";
import { generateDailySummary, getFearGreedLabel } from "./claude-summary";

// Get today's date in YYYY-MM-DD format
function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export interface V3FetchResult {
  success: boolean;
  metricsStored: number;
  summaryStored: boolean;
  errors: string[];
}

/**
 * Fetch all V3 metrics and store in Supabase
 * Used by cron and admin routes
 */
export async function fetchAndStoreV3Metrics(): Promise<V3FetchResult> {
  console.log("[v3-aggregator] Starting fetch...");
  const errors: string[] = [];
  const metrics: MetricInsert[] = [];
  const today = getToday();
  let summaryStored = false;

  // Collect data for AI summary
  let btcPrice = 0, btcChange = 0;
  let ethPrice = 0, ethChange = 0;
  let solPrice = 0, solChange = 0;
  let btcDominance = 0;
  let btcEtfFlow = 0, ethEtfFlow = 0, solEtfFlow = 0;
  let topGainer = "", topGainerPct = 0;
  let fearGreed = 50;

  // 1. Prices (CoinGecko) - BTC, ETH, SOL
  try {
    const cgData = await fetchAllCoinGeckoData();
    console.log("[v3-aggregator] 1. CoinGecko prices fetched");

    if (cgData.btcPrice.current !== null) {
      btcPrice = cgData.btcPrice.current;
      btcChange = cgData.btcPrice.change_pct ?? 0;
      metrics.push({
        date: today,
        key: "btc_price",
        value: cgData.btcPrice.current,
        metadata: { change_pct: cgData.btcPrice.change_pct },
      });
    }
    if (cgData.btcPrice.error) errors.push(`coingecko-btc: ${cgData.btcPrice.error}`);

    if (cgData.ethPrice.current !== null) {
      ethPrice = cgData.ethPrice.current;
      ethChange = cgData.ethPrice.change_pct ?? 0;
      metrics.push({
        date: today,
        key: "eth_price",
        value: cgData.ethPrice.current,
        metadata: { change_pct: cgData.ethPrice.change_pct },
      });
    }
    if (cgData.ethPrice.error) errors.push(`coingecko-eth: ${cgData.ethPrice.error}`);

    if (cgData.solPrice.current !== null) {
      solPrice = cgData.solPrice.current;
      solChange = cgData.solPrice.change_pct ?? 0;
      metrics.push({
        date: today,
        key: "sol_price",
        value: cgData.solPrice.current,
        metadata: { change_pct: cgData.solPrice.change_pct },
      });
    }
    if (cgData.solPrice.error) errors.push(`coingecko-sol: ${cgData.solPrice.error}`);

    if (cgData.btcDominance.current !== null) {
      btcDominance = cgData.btcDominance.current;
    }
  } catch (e) {
    errors.push(`coingecko: ${e}`);
  }

  // 2. ETH Burn/Issuance (ultrasound.money)
  try {
    const ethBurn = await fetchEthBurnIssuance();
    console.log("[v3-aggregator] 2. ETH burn/issuance fetched");

    if (ethBurn.dailyBurn !== null) {
      metrics.push({ date: today, key: "eth_burn", value: ethBurn.dailyBurn, metadata: {} });
    }
    if (ethBurn.dailyIssuance !== null) {
      metrics.push({ date: today, key: "eth_issuance", value: ethBurn.dailyIssuance, metadata: {} });
    }
    if (ethBurn.error) errors.push(`ultrasound: ${ethBurn.error}`);
  } catch (e) {
    errors.push(`ultrasound: ${e}`);
  }

  // 3. ETF Flows (Farside)
  try {
    const etfFlows = await fetchEtfFlows(1); // Just today
    console.log("[v3-aggregator] 3. ETF flows fetched");

    const todayBtc = etfFlows.btc?.find(f => f.date === today);
    const todayEth = etfFlows.eth?.find(f => f.date === today);
    const todaySol = etfFlows.sol?.find(f => f.date === today);

    if (todayBtc) {
      btcEtfFlow = todayBtc.total;
      metrics.push({
        date: today,
        key: "etf_flow_btc",
        value: todayBtc.total,
        metadata: { flows: todayBtc.flows },
      });
    }

    if (todayEth) {
      ethEtfFlow = todayEth.total;
      metrics.push({
        date: today,
        key: "etf_flow_eth",
        value: todayEth.total,
        metadata: { flows: todayEth.flows },
      });
    }

    if (todaySol) {
      solEtfFlow = todaySol.total;
      metrics.push({
        date: today,
        key: "etf_flow_sol",
        value: todaySol.total,
        metadata: { flows: todaySol.flows },
      });
    }

    if (etfFlows.error) errors.push(`farside: ${etfFlows.error}`);
  } catch (e) {
    errors.push(`farside: ${e}`);
  }

  // 4. Fear & Greed (for AI summary, not stored in V3)
  try {
    const fgData = await fetchFearGreed();
    if (fgData.current !== null) {
      fearGreed = fgData.current;
    }
  } catch (e) {
    console.warn("[v3-aggregator] Fear & Greed fetch failed:", e);
  }

  // 5. Top Gainer (for AI summary)
  try {
    const glData = await fetchGainersLosers(1);
    if (glData.gainers.length > 0) {
      topGainer = glData.gainers[0].symbol;
      topGainerPct = glData.gainers[0].change;
    }
  } catch (e) {
    console.warn("[v3-aggregator] Gainers/Losers fetch failed:", e);
  }

  // Store metrics in Supabase
  if (metrics.length > 0) {
    console.log(`[v3-aggregator] Storing ${metrics.length} metrics:`, metrics.map(m => m.key));

    try {
      const supabase = createServerClient();
      const { error: upsertError } = await supabase
        .from("metrics")
        .upsert(metrics, { onConflict: "date,key" });

      if (upsertError) {
        console.error("[v3-aggregator] Supabase upsert error:", upsertError);
        errors.push(`supabase: ${upsertError.message}`);
      }
    } catch (e) {
      console.error("[v3-aggregator] Supabase exception:", e);
      errors.push(`supabase: ${e}`);
    }
  }

  // 6. Generate and store AI summary
  try {
    console.log("[v3-aggregator] 6. Generating AI summary...");
    const summaryResult = await generateDailySummary({
      btcPrice,
      btcChange,
      ethPrice,
      ethChange,
      solPrice,
      solChange,
      btcDominance,
      fearGreed,
      fearGreedLabel: getFearGreedLabel(fearGreed),
      btcEtfFlow,
      ethEtfFlow,
      solEtfFlow,
      topGainer,
      topGainerPct,
    });

    if (summaryResult.summary) {
      const supabase = createServerClient();
      const summaryInsert: DailySummaryInsert = {
        date: today,
        summary: summaryResult.summary,
      };

      const { error: summaryError } = await supabase
        .from("daily_summaries")
        .upsert(summaryInsert, { onConflict: "date" });

      if (summaryError) {
        console.error("[v3-aggregator] Summary upsert error:", summaryError);
        errors.push(`summary: ${summaryError.message}`);
      } else {
        summaryStored = true;
        console.log("[v3-aggregator] AI summary stored");
      }
    } else if (summaryResult.error) {
      errors.push(`claude: ${summaryResult.error}`);
    }
  } catch (e) {
    errors.push(`claude: ${e}`);
  }

  console.log(`[v3-aggregator] Done. Metrics: ${metrics.length}, Summary: ${summaryStored}, Errors: ${errors.length}`);

  return {
    success: errors.length === 0,
    metricsStored: metrics.length,
    summaryStored,
    errors,
  };
}
