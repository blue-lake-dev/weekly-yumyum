import { NextResponse } from "next/server";
import {
  fetchChainTvlWithSparkline,
  fetchStablecoinWithSparkline,
} from "@/lib/fetchers/defillama";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [tvlData, stablecoinsData] = await Promise.all([
      fetchChainTvlWithSparkline("Solana"),
      fetchStablecoinWithSparkline("Solana"),
    ]);

    return NextResponse.json({
      tvl: {
        total: tvlData.current,
        change7d: tvlData.change7d,
        sparkline: tvlData.sparkline,
      },
      stablecoins: {
        total: stablecoinsData.current,
        change7d: stablecoinsData.change7d,
        sparkline: stablecoinsData.sparkline,
      },
    });
  } catch (error) {
    console.error("[/api/v1/chain/sol/charts] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SOL chart data" },
      { status: 500 }
    );
  }
}
