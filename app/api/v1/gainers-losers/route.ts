import { NextResponse } from "next/server";
import { fetchGainersLosers } from "@/lib/fetchers/coingecko";

/**
 * GET /api/v3/gainers-losers
 * Returns top gainers and losers from top 100 coins by market cap
 * Query params:
 *   - limit: number of gainers/losers to return (default: 10, max: 20)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam || "10", 10), 1), 20);

  try {
    console.log("[/api/v1/gainers-losers] Fetching with limit:", limit);
    const data = await fetchGainersLosers(limit);
    console.log("[/api/v1/gainers-losers] Result: gainers=%d losers=%d error=%s", data.gainers.length, data.losers.length, data.error || "none");

    if (data.error) {
      return NextResponse.json(
        {
          gainers: [],
          losers: [],
          error: data.error,
          timestamp: new Date().toISOString(),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      gainers: data.gainers,
      losers: data.losers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[gainers-losers] Error:", error);
    return NextResponse.json(
      {
        gainers: [],
        losers: [],
        error: "Failed to fetch gainers/losers",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
