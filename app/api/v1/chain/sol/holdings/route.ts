import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface MetricsRowWithMetadata {
  date: string;
  value: number | null;
  metadata: Record<string, unknown>;
}

interface SolEtfMetadata {
  holdings?: Array<{
    ticker: string;
    issuer: string;
    coin: string;
    flows: number | null;
    aum: number | null;
  }>;
}

interface SolDatMetadata {
  totalUsd?: number;
  supplyPct?: number;
  companies?: Array<{
    name: string;
    holdings: number;
    holdingsUsd: number;
    supplyPct: number;
  }>;
}

async function getEtfFlowHistory(days: number) {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("metrics")
      .select("date, value")
      .eq("key", "etf_flow_sol")
      .order("date", { ascending: false })
      .limit(days);

    if (data && data.length > 0) {
      return {
        today: data[0].value,
        history: data.map((row: { date: string; value: number | null }) => ({
          date: row.date,
          value: row.value,
        })),
      };
    }
    return { today: null, history: [] };
  } catch (error) {
    console.error("[sol/holdings] getEtfFlowHistory error:", error);
    return { today: null, history: [] };
  }
}

async function getSolEtfHoldings() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("metrics")
      .select("date, value, metadata")
      .eq("key", "etf_holdings_sol")
      .order("date", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const row = data[0] as MetricsRowWithMetadata;
      const metadata = row.metadata as SolEtfMetadata | null;
      return {
        totalSol: null,
        totalUsd: row.value,
        holdings: metadata?.holdings?.map(h => ({
          ticker: h.ticker,
          issuer: h.issuer,
          usd: h.aum ?? 0,
        })) ?? null,
        date: row.date,
      };
    }
    return { totalSol: null, totalUsd: null, holdings: null, date: null };
  } catch (error) {
    console.error("[sol/holdings] getSolEtfHoldings error:", error);
    return { totalSol: null, totalUsd: null, holdings: null, date: null };
  }
}

async function getSolDatHoldings() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("metrics")
      .select("date, value, metadata")
      .eq("key", "dat_holdings_sol")
      .order("date", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const row = data[0] as MetricsRowWithMetadata;
      const metadata = row.metadata as SolDatMetadata | null;
      return {
        totalSol: row.value,
        totalUsd: metadata?.totalUsd ?? null,
        supplyPct: metadata?.supplyPct ?? null,
        companies: metadata?.companies ?? null,
        date: row.date,
      };
    }
    return { totalSol: null, totalUsd: null, supplyPct: null, companies: null, date: null };
  } catch (error) {
    console.error("[sol/holdings] getSolDatHoldings error:", error);
    return { totalSol: null, totalUsd: null, supplyPct: null, companies: null, date: null };
  }
}

export async function GET() {
  try {
    const [etfFlows, etfHoldings, datHoldings] = await Promise.all([
      getEtfFlowHistory(7),
      getSolEtfHoldings(),
      getSolDatHoldings(),
    ]);

    return NextResponse.json({
      etfFlows: {
        today: etfFlows.today,
        history: etfFlows.history,
      },
      etfHoldings,
      datHoldings,
    });
  } catch (error) {
    console.error("[/api/v1/chain/sol/holdings] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SOL holdings" },
      { status: 500 }
    );
  }
}
