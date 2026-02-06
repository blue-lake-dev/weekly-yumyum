import { NextResponse } from "next/server";
import {
  fetchL2TvlStacked,
  fetchL2StablecoinStacked,
} from "@/lib/fetchers/defillama";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [l2TvlData, l2StablecoinData] = await Promise.all([
      fetchL2TvlStacked(),
      fetchL2StablecoinStacked(),
    ]);

    return NextResponse.json({
      l2Tvl: {
        dates: l2TvlData.dates,
        chains: l2TvlData.chains,
        totals: l2TvlData.totals,
      },
      l2Stablecoins: {
        dates: l2StablecoinData.dates,
        chains: l2StablecoinData.chains,
        totals: l2StablecoinData.totals,
      },
    });
  } catch (error) {
    console.error("[/api/v1/chain/eth/charts] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ETH chart data" },
      { status: 500 }
    );
  }
}
