import { createServerClient } from "@/lib/supabase";
import type { MetricInsert } from "@/lib/database.types";
import { fetchEthSupply } from "./etherscan";
import { fetchEthBurnIssuance } from "./ultrasound";
import { fetchEtfFlows } from "./farside";
import { fetchEthEtfHoldings } from "./dune";
import { fetchDatHoldings } from "./defillama-dat";
import { fetchRwaByChain } from "./defillama-rwa";
import { fetchAllCoinGeckoData } from "./coingecko";
import { fetchFearGreed } from "./alternative";
import { fetchStablecoinSupply, fetchStablecoinByChain, fetchEthTvl } from "./defillama";

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
  console.log("[v2-aggregator] Starting fetch...");
  const errors: string[] = [];
  const metrics: MetricInsert[] = [];
  const today = getToday();

  // 1. ETH Supply (Etherscan)
  try {
    const ethSupply = await fetchEthSupply();
    console.log("[v2-aggregator] 1. Etherscan response:", JSON.stringify(ethSupply));
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
    console.log("[v2-aggregator] 2. ultrasound.money response:", JSON.stringify(burnIssuance));
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

  // 3. CoinGecko (ETH price, BTC price, BTC dominance) - fetch early for DAT calculation
  let ethPriceValue: number | null = null;
  try {
    const coinGeckoData = await fetchAllCoinGeckoData();
    console.log("[v2-aggregator] 3. CoinGecko response:", JSON.stringify(coinGeckoData));
    const currentEthPrice = coinGeckoData.ethPrice.current;
    ethPriceValue = typeof currentEthPrice === "number" ? currentEthPrice : null;
    if (typeof ethPriceValue === "number") {
      metrics.push({
        date: today,
        key: "eth_price",
        value: ethPriceValue,
        metadata: {
          previous: coinGeckoData.ethPrice.previous,
          change_pct: coinGeckoData.ethPrice.change_pct,
        },
      });
    }
    if (coinGeckoData.ethPrice.error) errors.push(`coingecko-eth: ${coinGeckoData.ethPrice.error}`);

    const btcPrice = coinGeckoData.btcPrice.current;
    if (typeof btcPrice === "number") {
      metrics.push({
        date: today,
        key: "btc_price",
        value: btcPrice,
        metadata: {
          previous: coinGeckoData.btcPrice.previous,
          change_pct: coinGeckoData.btcPrice.change_pct,
        },
      });
    }
    if (coinGeckoData.btcPrice.error) errors.push(`coingecko-btc: ${coinGeckoData.btcPrice.error}`);

    const btcDom = coinGeckoData.btcDominance.current;
    if (typeof btcDom === "number") {
      metrics.push({
        date: today,
        key: "btc_dominance",
        value: btcDom,
        metadata: {},
      });
    }
    if (coinGeckoData.btcDominance.error) errors.push(`coingecko-dom: ${coinGeckoData.btcDominance.error}`);
  } catch (e) {
    errors.push(`coingecko: ${e}`);
  }

  // 4. ETF Holdings Total (Dune) - hildobby's ETH ETF dashboard
  try {
    const etfHoldings = await fetchEthEtfHoldings();
    console.log("[v2-aggregator] 4. Dune ETF Holdings response:", JSON.stringify(etfHoldings));
    if (etfHoldings.totalEth !== null) {
      metrics.push({
        date: today,
        key: "etf_holdings_total",
        value: etfHoldings.totalEth,
        metadata: {
          usd: etfHoldings.totalUsd,
          holdings: etfHoldings.holdings,
          source: "dune",
        },
      });
    }
    if (etfHoldings.error) errors.push(`dune-holdings: ${etfHoldings.error}`);
  } catch (e) {
    errors.push(`dune-holdings: ${e}`);
  }

  // 5. DAT Holdings Total (DeFiLlama) - corporate treasuries ETH holdings
  try {
    const datHoldings = await fetchDatHoldings(ethPriceValue ?? 0);
    console.log("[v2-aggregator] 5. DeFiLlama DAT Holdings response:", JSON.stringify(datHoldings));
    if (datHoldings.totalEth !== null) {
      metrics.push({
        date: today,
        key: "dat_holdings_total",
        value: datHoldings.totalEth,
        metadata: {
          usd: datHoldings.totalEthUsd,
          companies: datHoldings.companies,
        },
      });
    }
    if (datHoldings.error) errors.push(`defillama-dat: ${datHoldings.error}`);
  } catch (e) {
    errors.push(`defillama-dat: ${e}`);
  }

  // 6. ETF Flows (Farside) - Smart fetch: only store if today's data exists
  try {
    // Fetch just 1 day (most recent) to check if today's data is available
    const etfFlows = await fetchEtfFlows(1);
    console.log("[v2-aggregator] 6. Farside ETF Flows response:", JSON.stringify(etfFlows));

    // Check if the most recent data is from today
    const latestEthDate = etfFlows.eth?.[0]?.date;
    const latestBtcDate = etfFlows.btc?.[0]?.date;
    const isEthToday = latestEthDate === today;
    const isBtcToday = latestBtcDate === today;

    console.log(`[v2-aggregator] 6. ETF dates - ETH: ${latestEthDate} (today: ${isEthToday}), BTC: ${latestBtcDate} (today: ${isBtcToday})`);

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

    if (!isEthToday && !isBtcToday) {
      console.log("[v2-aggregator] 6. Farside not updated yet for today, skipping ETF flows");
    }

    if (etfFlows.error) errors.push(`farside: ${etfFlows.error}`);
  } catch (e) {
    errors.push(`farside: ${e}`);
  }

  // 7. RWA by Chain (DeFiLlama)
  try {
    const rwaByChain = await fetchRwaByChain();
    console.log("[v2-aggregator] 7. DeFiLlama RWA response:", JSON.stringify(rwaByChain));
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

  // 8. Fear & Greed Index (Alternative.me)
  try {
    const fearGreedData = await fetchFearGreed();
    console.log("[v2-aggregator] 8. Alternative.me Fear & Greed response:", JSON.stringify(fearGreedData));
    const fgValue = fearGreedData.current;
    if (typeof fgValue === "number") {
      metrics.push({
        date: today,
        key: "fear_greed",
        value: fgValue,
        metadata: {
          previous: fearGreedData.previous,
          change_pct: fearGreedData.change_pct,
        },
      });
    }
    if (fearGreedData.error) errors.push(`alternative: ${fearGreedData.error}`);
  } catch (e) {
    errors.push(`alternative: ${e}`);
  }

  // 9. Stablecoin Supply (DeFiLlama)
  try {
    const stablecoinTotal = await fetchStablecoinSupply();
    console.log("[v2-aggregator] 9. DeFiLlama Stablecoin response:", JSON.stringify(stablecoinTotal));
    const stableValue = stablecoinTotal.current;
    if (typeof stableValue === "number") {
      metrics.push({
        date: today,
        key: "stablecoin_total",
        value: stableValue, // Already in billions
        metadata: {
          previous: stablecoinTotal.previous,
          change_pct: stablecoinTotal.change_pct,
        },
      });
    }
    if (stablecoinTotal.error) errors.push(`defillama-stable: ${stablecoinTotal.error}`);

    // Stablecoin by chain - fetch top chains
    const chains = ["Ethereum", "Tron", "BSC", "Arbitrum", "Solana"];
    const byChain: Record<string, number> = {};
    for (const chain of chains) {
      const chainData = await fetchStablecoinByChain(chain);
      const chainValue = chainData.current;
      if (typeof chainValue === "number") {
        byChain[chain] = chainValue; // Already in billions
      }
    }
    if (Object.keys(byChain).length > 0) {
      metrics.push({
        date: today,
        key: "stablecoin_by_chain",
        value: null,
        metadata: { byChain },
      });
    }
  } catch (e) {
    errors.push(`defillama-stable: ${e}`);
  }

  // 10. ETH TVL (DeFiLlama)
  try {
    const ethTvlData = await fetchEthTvl();
    console.log("[v2-aggregator] 10. DeFiLlama ETH TVL response:", JSON.stringify(ethTvlData));
    const tvlValue = ethTvlData.current;
    if (typeof tvlValue === "number") {
      metrics.push({
        date: today,
        key: "eth_tvl",
        value: tvlValue, // In billions
        metadata: {},
      });
    }
    if (ethTvlData.error) errors.push(`defillama-tvl: ${ethTvlData.error}`);
  } catch (e) {
    errors.push(`defillama-tvl: ${e}`);
  }

  // Store metrics in Supabase
  if (metrics.length > 0) {
    console.log(`[v2-aggregator] Storing ${metrics.length} metrics:`, metrics.map(m => m.key));

    try {
      const supabase = createServerClient();

      // Upsert metrics (update if date+key exists, insert if not)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: upsertError } = await supabase
        .from("metrics")
        .upsert(metrics as any, { onConflict: "date,key" })
        .select();

      console.log("[v2-aggregator] Upsert result - data:", data?.length ?? 0, "rows, error:", upsertError);

      if (upsertError) {
        console.error("[v2-aggregator] Supabase upsert error:", JSON.stringify(upsertError, null, 2));
        errors.push(`supabase: ${upsertError.message || upsertError.code || JSON.stringify(upsertError)}`);
      }
    } catch (e) {
      console.error("[v2-aggregator] Supabase exception:", e);
      errors.push(`supabase: ${e}`);
    }
  }

  return {
    success: errors.length === 0,
    metricsStored: metrics.length,
    errors,
  };
}
