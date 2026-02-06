import { NextResponse } from "next/server";
import { fetchMayerMultiple, fetchCoinSupply } from "@/lib/fetchers/coingecko";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Get mining cost from Supabase (stored by daily cron)
async function getMiningCost(): Promise<{ productionCost: number | null; date: string | null }> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("metrics")
      .select("value, date")
      .eq("key", "btc_mining_cost")
      .order("date", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const row = data[0] as { date: string; value: number | null };
      return {
        productionCost: row.value,
        date: row.date,
      };
    }
    return { productionCost: null, date: null };
  } catch (error) {
    console.error("[getMiningCost] Error:", error);
    return { productionCost: null, date: null };
  }
}

export async function GET() {
  try {
    const [mayerData, supplyData, miningCost] = await Promise.all([
      fetchMayerMultiple(),
      fetchCoinSupply("bitcoin"),
      getMiningCost(),
    ]);

    const maxSupply = supplyData.maxSupply ?? 21_000_000;
    const circulating = supplyData.circulatingSupply;
    const percentMined = circulating && maxSupply ? (circulating / maxSupply) * 100 : null;

    return NextResponse.json({
      mayerMultiple: {
        current: mayerData.current,
        ma200: mayerData.ma200,
        interpretation: mayerData.interpretation,
      },
      miningCost: {
        productionCost: miningCost.productionCost,
        date: miningCost.date,
      },
      supply: {
        circulating,
        maxSupply,
        percentMined,
      },
    });
  } catch (error) {
    console.error("[/api/v1/chain/btc/indicators] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch BTC indicators" },
      { status: 500 }
    );
  }
}
