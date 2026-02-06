import { NextResponse } from "next/server";
import { fetchPriceSparkline } from "@/lib/fetchers/coingecko";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sparklineData = await fetchPriceSparkline("ethereum");

    const high = sparklineData.sparkline.length > 0
      ? Math.max(...sparklineData.sparkline)
      : null;
    const low = sparklineData.sparkline.length > 0
      ? Math.min(...sparklineData.sparkline)
      : null;

    return NextResponse.json({
      price7d: {
        change: sparklineData.change7d,
        sparkline: sparklineData.sparkline,
        high,
        low,
      },
    });
  } catch (error) {
    console.error("[/api/v1/chain/eth/price] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ETH price data" },
      { status: 500 }
    );
  }
}
