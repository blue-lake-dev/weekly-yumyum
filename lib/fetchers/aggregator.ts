import { createServerClient } from "@/lib/supabase";
import type { MetricInsert } from "@/lib/database.types";
import { fetchEtfFlows } from "./farside";
import { fetchDatHoldings, fetchSolDatHoldings } from "./dat-scraper";
import { fetchSolEtfHoldings } from "./defillama-etf";
import { fetchBtcMiningCost } from "./macromicro";

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
 * Daily Aggregator - Stores metrics that require scraping or daily snapshots
 * Everything else is fetched live (no storage needed)
 *
 * Stored metrics:
 * - etf_flow_btc (daily ETF net flow)
 * - etf_flow_eth (daily ETF net flow)
 * - etf_flow_sol (daily ETF net flow)
 * - dat_holdings_eth (corporate/institutional ETH holdings snapshot)
 */
export async function fetchAndStoreMetrics(): Promise<FetchResult> {
  console.log("[aggregator] Starting fetch...");
  const errors: string[] = [];
  const metrics: MetricInsert[] = [];
  const today = getToday();

  // Fetch ETF Flows from Farside (BTC, ETH, SOL)
  try {
    const etfFlows = await fetchEtfFlows(1); // Fetch most recent day
    console.log("[aggregator] Farside ETF Flows response:", JSON.stringify(etfFlows));

    // Check if data is from today
    const latestEthDate = etfFlows.eth?.[0]?.date;
    const latestBtcDate = etfFlows.btc?.[0]?.date;
    const latestSolDate = etfFlows.sol?.[0]?.date;

    const isEthToday = latestEthDate === today;
    const isBtcToday = latestBtcDate === today;
    const isSolToday = latestSolDate === today;

    console.log(`[aggregator] ETF dates - ETH: ${latestEthDate} (today: ${isEthToday}), BTC: ${latestBtcDate} (today: ${isBtcToday}), SOL: ${latestSolDate} (today: ${isSolToday})`);

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
      console.log("[aggregator] Farside not updated yet for today, skipping ETF flows");
    }

    if (etfFlows.error) errors.push(`farside: ${etfFlows.error}`);
  } catch (e) {
    errors.push(`farside: ${e}`);
  }

  // Fetch DAT (Digital Asset Treasury) Holdings - ETH corporate/institutional holdings
  // Unlike ETF flows, this is a cumulative snapshot that updates daily
  try {
    console.log("[aggregator] Fetching ETH DAT holdings...");
    const datHoldings = await fetchDatHoldings();

    if (datHoldings.totalEth && !datHoldings.error) {
      metrics.push({
        date: today,
        key: "dat_holdings_eth",
        value: datHoldings.totalEth,
        metadata: {
          totalUsd: datHoldings.totalUsd,
          supplyPct: datHoldings.supplyPct,
          companies: datHoldings.companies,
        },
      });
      console.log(`[aggregator] ETH DAT holdings: ${datHoldings.totalEth} ETH, ${datHoldings.companies?.length ?? 0} companies`);
    } else {
      console.log("[aggregator] ETH DAT holdings fetch returned no data");
      if (datHoldings.error) errors.push(`dat_eth: ${datHoldings.error}`);
    }
  } catch (e) {
    console.error("[aggregator] ETH DAT holdings error:", e);
    errors.push(`dat_eth: ${e}`);
  }

  // Fetch SOL ETF Holdings from DeFiLlama
  try {
    console.log("[aggregator] Fetching SOL ETF holdings...");
    const solEtfHoldings = await fetchSolEtfHoldings();

    if (solEtfHoldings.holdings && !solEtfHoldings.error) {
      metrics.push({
        date: today,
        key: "etf_holdings_sol",
        value: solEtfHoldings.totalAum,
        metadata: {
          holdings: solEtfHoldings.holdings,
        },
      });
      console.log(`[aggregator] SOL ETF holdings: $${(solEtfHoldings.totalAum ?? 0) / 1e6}M, ${solEtfHoldings.holdings.length} funds`);
    } else {
      console.log("[aggregator] SOL ETF holdings fetch returned no data");
      if (solEtfHoldings.error) errors.push(`etf_sol: ${solEtfHoldings.error}`);
    }
  } catch (e) {
    console.error("[aggregator] SOL ETF holdings error:", e);
    errors.push(`etf_sol: ${e}`);
  }

  // Fetch SOL DAT Holdings from DeFiLlama
  try {
    console.log("[aggregator] Fetching SOL DAT holdings...");
    const solDatHoldings = await fetchSolDatHoldings();

    if (solDatHoldings.totalHoldings && !solDatHoldings.error) {
      metrics.push({
        date: today,
        key: "dat_holdings_sol",
        value: solDatHoldings.totalHoldings,
        metadata: {
          totalUsd: solDatHoldings.totalUsd,
          supplyPct: solDatHoldings.supplyPct,
          companies: solDatHoldings.companies,
        },
      });
      console.log(`[aggregator] SOL DAT holdings: ${solDatHoldings.totalHoldings} SOL, ${solDatHoldings.companies?.length ?? 0} companies`);
    } else {
      console.log("[aggregator] SOL DAT holdings fetch returned no data");
      if (solDatHoldings.error) errors.push(`dat_sol: ${solDatHoldings.error}`);
    }
  } catch (e) {
    console.error("[aggregator] SOL DAT holdings error:", e);
    errors.push(`dat_sol: ${e}`);
  }

  // Fetch BTC Mining Cost (daily scrape from MacroMicro)
  try {
    console.log("[aggregator] Fetching BTC mining cost...");
    const miningCost = await fetchBtcMiningCost();

    if (miningCost.productionCost && !miningCost.error) {
      metrics.push({
        date: today,
        key: "btc_mining_cost",
        value: miningCost.productionCost,
        metadata: {
          scrapedAt: miningCost.scrapedAt,
        },
      });
      console.log(`[aggregator] BTC mining cost: $${miningCost.productionCost.toLocaleString()}`);
    } else {
      console.log("[aggregator] BTC mining cost fetch returned no data");
      if (miningCost.error) errors.push(`btc_mining_cost: ${miningCost.error}`);
    }
  } catch (e) {
    console.error("[aggregator] BTC mining cost error:", e);
    errors.push(`btc_mining_cost: ${e}`);
  }

  // Store metrics in Supabase
  if (metrics.length > 0) {
    console.log(`[aggregator] Storing ${metrics.length} metrics:`, metrics.map(m => m.key));

    try {
      const supabase = createServerClient();

      // Upsert metrics (update if date+key exists, insert if not)
      const { data, error: upsertError } = await supabase
        .from("metrics")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(metrics as any, { onConflict: "date,key" })
        .select();

      console.log("[aggregator] Upsert result - data:", data?.length ?? 0, "rows, error:", upsertError);

      if (upsertError) {
        console.error("[aggregator] Supabase upsert error:", JSON.stringify(upsertError, null, 2));
        errors.push(`supabase: ${upsertError.message || upsertError.code || JSON.stringify(upsertError)}`);
      }
    } catch (e) {
      console.error("[aggregator] Supabase exception:", e);
      errors.push(`supabase: ${e}`);
    }
  } else {
    console.log("[aggregator] No metrics to store (Farside may not have today's data yet)");
  }

  return {
    success: errors.length === 0,
    metricsStored: metrics.length,
    errors,
  };
}
