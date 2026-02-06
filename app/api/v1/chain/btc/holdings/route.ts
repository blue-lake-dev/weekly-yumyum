import { NextResponse } from "next/server";
import { fetchBtcCompanyHoldings } from "@/lib/fetchers/coingecko";
import { fetchBtcEtfHoldings } from "@/lib/fetchers/dune";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Get ETF flows from Supabase (stored by daily cron)
async function getEtfFlows(): Promise<{ today: number | null; history: Array<{ date: string; value: number | null }> }> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("metrics")
      .select("value, date")
      .eq("key", "etf_flow_btc")
      .order("date", { ascending: false })
      .limit(30);

    if (data && data.length > 0) {
      const rows = data as Array<{ date: string; value: number | null }>;
      return {
        today: rows[0].value,
        history: rows.map((d) => ({ date: d.date, value: d.value })),
      };
    }
    return { today: null, history: [] };
  } catch (error) {
    console.error("[getEtfFlows] Error:", error);
    return { today: null, history: [] };
  }
}

export async function GET() {
  try {
    const [etfFlows, etfHoldings, companyHoldings] = await Promise.all([
      getEtfFlows(),
      fetchBtcEtfHoldings(),
      fetchBtcCompanyHoldings(),
    ]);

    return NextResponse.json({
      etfFlows: {
        today: etfFlows.today,
        history: etfFlows.history,
      },
      etfHoldings: {
        totalBtc: etfHoldings.totalBtc,
        totalUsd: etfHoldings.totalUsd,
        holdings: etfHoldings.holdings,
      },
      companyHoldings: {
        totalBtc: companyHoldings.totalBtc,
        totalUsd: companyHoldings.totalUsd,
        companies: companyHoldings.companies,
      },
    });
  } catch (error) {
    console.error("[/api/v1/chain/btc/holdings] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch BTC holdings" },
      { status: 500 }
    );
  }
}
