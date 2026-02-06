import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { fetchEthEtfHoldings } from "@/lib/fetchers/dune";

export const dynamic = "force-dynamic";

interface DatMetadata {
  totalUsd?: number;
  supplyPct?: number;
  companies?: Array<{
    name: string;
    holdings: number;
    holdingsUsd: number;
    supplyPct: number;
  }>;
}

interface MetricsRowWithMetadata {
  date: string;
  value: number | null;
  metadata: Record<string, unknown>;
}

async function getEtfFlowHistory(days: number) {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("metrics")
      .select("date, value")
      .eq("key", "etf_flow_eth")
      .order("date", { ascending: false })
      .limit(days);

    if (data && data.length > 0) {
      const rows = data as Array<{ date: string; value: number | null }>;
      return {
        today: rows[0].value,
        history: rows.map((row) => ({
          date: row.date,
          value: row.value,
        })),
      };
    }
    return { today: null, history: [] };
  } catch (error) {
    console.error("[eth/holdings] getEtfFlowHistory error:", error);
    return { today: null, history: [] };
  }
}

async function getDatHoldings() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("metrics")
      .select("date, value, metadata")
      .eq("key", "dat_holdings_eth")
      .order("date", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const row = data[0] as MetricsRowWithMetadata;
      const metadata = row.metadata as DatMetadata | null;
      return {
        totalEth: row.value,
        totalUsd: metadata?.totalUsd ?? null,
        supplyPct: metadata?.supplyPct ?? null,
        companies: metadata?.companies ?? null,
        date: row.date,
      };
    }
    return { totalEth: null, totalUsd: null, supplyPct: null, companies: null, date: null };
  } catch (error) {
    console.error("[eth/holdings] getDatHoldings error:", error);
    return { totalEth: null, totalUsd: null, supplyPct: null, companies: null, date: null };
  }
}

export async function GET() {
  try {
    const [etfFlows, etfHoldings, datHoldings] = await Promise.all([
      getEtfFlowHistory(7),
      fetchEthEtfHoldings(),
      getDatHoldings(),
    ]);

    return NextResponse.json({
      etfFlows: {
        today: etfFlows.today,
        history: etfFlows.history,
      },
      etfHoldings: {
        totalEth: etfHoldings.totalEth,
        totalUsd: etfHoldings.totalUsd,
        holdings: etfHoldings.holdings,
      },
      datHoldings,
    });
  } catch (error) {
    console.error("[/api/v1/chain/eth/holdings] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ETH holdings" },
      { status: 500 }
    );
  }
}
