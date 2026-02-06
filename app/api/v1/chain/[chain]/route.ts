import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// Import fetchers
import {
  fetchCoinSupply,
  fetchPriceSparkline,
  fetchMayerMultiple,
  fetchBtcCompanyHoldings,
} from "@/lib/fetchers/coingecko";
import { fetchMempoolStats } from "@/lib/fetchers/mempool";
import { fetchBtcHashrate } from "@/lib/fetchers/blockchain-com";
import { fetchBtcEtfHoldings } from "@/lib/fetchers/dune";

type ChainParam = "btc" | "eth" | "sol";

/**
 * GET /api/v3/chain/[chain]
 * Returns chain-specific data for BTC, ETH, or SOL
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chain: string }> }
) {
  const { chain } = await params;
  const chainLower = chain.toLowerCase() as ChainParam;

  if (!["btc", "eth", "sol"].includes(chainLower)) {
    return NextResponse.json(
      { error: `Invalid chain: ${chain}. Use btc, eth, or sol.` },
      { status: 400 }
    );
  }

  try {
    switch (chainLower) {
      case "btc":
        return NextResponse.json(await getBtcData());
      case "eth":
        // ETH uses split endpoints: /api/v1/chain/eth/{price,stats,charts,holdings}
        return NextResponse.json(
          { error: "ETH data moved to split endpoints: /api/v1/chain/eth/{price,stats,charts,holdings}" },
          { status: 410 }
        );
      case "sol":
        // SOL uses split endpoints: /api/v1/chain/sol/{price,stats,charts,holdings}
        return NextResponse.json(
          { error: "SOL data moved to split endpoints: /api/v1/chain/sol/{price,stats,charts,holdings}" },
          { status: 410 }
        );
    }
  } catch (error) {
    console.error(`[chain/${chain}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch chain data" },
      { status: 500 }
    );
  }
}

/**
 * BTC Chain Data
 * - 7d price sparkline + change + high/low
 * - Mayer Multiple (price / 200d MA)
 * - Mempool stats (pending tx, fees, congestion)
 * - Hashrate with 30d sparkline
 * - Mining cost (from Supabase, scraped weekly)
 * - Company holdings (public treasuries)
 * - ETF flows (7d history for chart)
 * - ETF holdings (from Dune)
 */
async function getBtcData() {
  console.log("[chain/btc] Fetching BTC data...");

  const [
    sparklineData,
    supplyData,
    mayerMultipleData,
    mempoolData,
    hashrateData,
    miningCost,
    companyHoldings,
    etfFlows,
    etfHoldings,
  ] = await Promise.all([
    fetchPriceSparkline("bitcoin"),
    fetchCoinSupply("bitcoin"),
    fetchMayerMultiple(),
    fetchMempoolStats(),
    fetchBtcHashrate(),
    getMiningCostFromSupabase(),
    fetchBtcCompanyHoldings(),
    getEtfFlowHistory("etf_flow_btc", 7),
    fetchBtcEtfHoldings(),
  ]);

  console.log("[chain/btc] Sparkline points:", sparklineData.sparkline.length);
  console.log("[chain/btc] Supply:", supplyData.circulatingSupply?.toLocaleString());
  console.log("[chain/btc] Mayer Multiple:", mayerMultipleData.current?.toFixed(2), `(${mayerMultipleData.interpretation})`);
  console.log("[chain/btc] Mempool:", mempoolData.pendingTxCount?.toLocaleString(), "txs,", mempoolData.congestionLevel);
  console.log("[chain/btc] Hashrate:", hashrateData.current?.toFixed(2), "EH/s");
  console.log("[chain/btc] Mining cost:", miningCost.productionCost ? `$${miningCost.productionCost.toLocaleString()}` : "N/A");
  console.log("[chain/btc] Company holdings:", companyHoldings.totalBtc?.toLocaleString(), "BTC");
  console.log("[chain/btc] ETF flows:", etfFlows.length, "days");
  console.log("[chain/btc] ETF holdings:", etfHoldings.totalBtc?.toLocaleString(), "BTC");

  // Calculate percent mined
  const percentMined = supplyData.circulatingSupply && supplyData.maxSupply
    ? (supplyData.circulatingSupply / supplyData.maxSupply) * 100
    : null;

  // Calculate 7d high/low from sparkline
  const high7d = sparklineData.sparkline.length > 0
    ? Math.max(...sparklineData.sparkline)
    : null;
  const low7d = sparklineData.sparkline.length > 0
    ? Math.min(...sparklineData.sparkline)
    : null;

  return {
    chain: "btc",
    price7d: {
      change: sparklineData.change7d,
      sparkline: sparklineData.sparkline,
      high: high7d,
      low: low7d,
    },
    supply: {
      circulating: supplyData.circulatingSupply,
      maxSupply: supplyData.maxSupply,
      percentMined,
    },
    mayerMultiple: {
      current: mayerMultipleData.current,
      ma200: mayerMultipleData.ma200,
      interpretation: mayerMultipleData.interpretation,
    },
    mempool: {
      pendingTxCount: mempoolData.pendingTxCount,
      pendingVsize: mempoolData.pendingVsize,
      fees: mempoolData.fees,
      congestionLevel: mempoolData.congestionLevel,
    },
    hashrate: {
      current: hashrateData.current,
      change30d: hashrateData.change30d,
      sparkline: hashrateData.sparkline,
    },
    miningCost: {
      productionCost: miningCost.productionCost,
      date: miningCost.date,
    },
    companyHoldings: {
      totalBtc: companyHoldings.totalBtc,
      totalUsd: companyHoldings.totalUsd,
      companies: companyHoldings.companies?.slice(0, 10).map(c => ({
        name: c.name,
        symbol: c.symbol,
        holdings: c.holdings,
        value: c.value,
      })) ?? null,
    },
    etfFlows: {
      today: etfFlows[0]?.value ?? null,
      history: etfFlows,
    },
    etfHoldings: {
      totalBtc: etfHoldings.totalBtc,
      totalUsd: etfHoldings.totalUsd,
      holdings: etfHoldings.holdings,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get ETF flow history from Supabase
 * Returns last N available trading days (excludes weekends automatically)
 */
async function getEtfFlowHistory(key: string, days: number) {
  const supabase = createServerClient();

  // Fetch last N rows by date (not calendar days) to handle weekends
  const { data, error } = await supabase
    .from("metrics")
    .select("date, value")
    .eq("key", key)
    .order("date", { ascending: false })
    .limit(days);

  if (error) {
    console.error("[chain] getEtfFlowHistory error:", error);
    return [];
  }

  console.log(`[chain] getEtfFlowHistory ${key}: ${data?.length ?? 0} rows`);

  return (data || []).map((row: { date: string; value: number | null }) => ({
    date: row.date,
    value: row.value, // Keep as millions (formatFlow expects millions)
  }));
}

// Type for mining cost stored in Supabase
interface MiningCostRow {
  date: string;
  value: number | null;
}

/**
 * Get BTC mining cost from Supabase (stored weekly by cron)
 */
async function getMiningCostFromSupabase() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("metrics")
    .select("date, value")
    .eq("key", "btc_mining_cost")
    .order("date", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    console.log("[chain/btc] No mining cost data in Supabase");
    return {
      productionCost: null,
      date: null,
    };
  }

  const row = data[0] as MiningCostRow;

  return {
    productionCost: row.value,
    date: row.date,
  };
}
