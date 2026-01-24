import { createServerClient } from "@/lib/supabase";
import type { MetricInsert } from "@/lib/database.types";
import { fetchEthSupply } from "./etherscan";
import { fetchEthBurnIssuance } from "./ultrasound";
import { fetchEthEtfHoldings } from "./dune";
import { fetchEtfFlows } from "./farside";
import { fetchRwaByChain } from "./defillama-rwa";

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
 * Fetch all V2 metrics and store in Supabase
 * Used by both cron and admin routes
 */
export async function fetchAndStoreV2Metrics(): Promise<FetchResult> {
  const errors: string[] = [];
  const metrics: MetricInsert[] = [];
  const today = getToday();

  // 1. ETH Supply (Etherscan)
  try {
    const ethSupply = await fetchEthSupply();
    if (ethSupply.ethSupply !== null) {
      metrics.push({ date: today, key: "eth_supply", value: ethSupply.ethSupply, metadata: {} });
    }
    if (ethSupply.ethBurnt !== null) {
      metrics.push({ date: today, key: "eth_burnt_total", value: ethSupply.ethBurnt, metadata: {} });
    }
    if (ethSupply.error) errors.push(`etherscan: ${ethSupply.error}`);
  } catch (e) {
    errors.push(`etherscan: ${e}`);
  }

  // 2. ETH Burn/Issuance (ultrasound.money)
  try {
    const burnIssuance = await fetchEthBurnIssuance();
    if (burnIssuance.dailyBurn !== null) {
      metrics.push({ date: today, key: "eth_burn", value: burnIssuance.dailyBurn, metadata: {} });
    }
    if (burnIssuance.dailyIssuance !== null) {
      metrics.push({ date: today, key: "eth_issuance", value: burnIssuance.dailyIssuance, metadata: {} });
    }
    if (burnIssuance.error) errors.push(`ultrasound: ${burnIssuance.error}`);
  } catch (e) {
    errors.push(`ultrasound: ${e}`);
  }

  // 3. ETF Holdings (Dune)
  try {
    const etfHoldings = await fetchEthEtfHoldings();
    if (etfHoldings.totalEth !== null) {
      metrics.push({
        date: today,
        key: "etf_holdings_total",
        value: etfHoldings.totalEth,
        metadata: { usd: etfHoldings.totalUsd },
      });
    }
    if (etfHoldings.holdings) {
      metrics.push({
        date: today,
        key: "etf_holdings",
        value: null,
        metadata: { holdings: etfHoldings.holdings },
      });
    }
    if (etfHoldings.error) errors.push(`dune: ${etfHoldings.error}`);
  } catch (e) {
    errors.push(`dune: ${e}`);
  }

  // 4. ETF Flows (Farside)
  try {
    const etfFlows = await fetchEtfFlows(1); // Just today
    if (etfFlows.eth?.[0]) {
      const ethFlow = etfFlows.eth[0];
      metrics.push({
        date: ethFlow.date,
        key: "etf_flow_eth",
        value: ethFlow.total,
        metadata: { flows: ethFlow.flows },
      });
    }
    if (etfFlows.btc?.[0]) {
      const btcFlow = etfFlows.btc[0];
      metrics.push({
        date: btcFlow.date,
        key: "etf_flow_btc",
        value: btcFlow.total,
        metadata: { flows: btcFlow.flows },
      });
    }
    if (etfFlows.error) errors.push(`farside: ${etfFlows.error}`);
  } catch (e) {
    errors.push(`farside: ${e}`);
  }

  // 5. RWA by Chain (DeFiLlama)
  try {
    const rwaByChain = await fetchRwaByChain();
    if (rwaByChain.total !== null) {
      metrics.push({
        date: today,
        key: "rwa_by_chain",
        value: rwaByChain.total,
        metadata: {
          byChain: rwaByChain.byChain,
          topProtocols: rwaByChain.topProtocols,
        },
      });
    }
    if (rwaByChain.error) errors.push(`defillama-rwa: ${rwaByChain.error}`);
  } catch (e) {
    errors.push(`defillama-rwa: ${e}`);
  }

  // Store metrics in Supabase
  if (metrics.length > 0) {
    try {
      const supabase = createServerClient();

      // Upsert metrics (update if date+key exists, insert if not)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upsertError } = await supabase
        .from("metrics")
        .upsert(metrics as any, { onConflict: "date,key" });

      if (upsertError) {
        errors.push(`supabase: ${upsertError.message}`);
      }
    } catch (e) {
      errors.push(`supabase: ${e}`);
    }
  }

  return {
    success: errors.length === 0,
    metricsStored: metrics.length,
    errors,
  };
}
