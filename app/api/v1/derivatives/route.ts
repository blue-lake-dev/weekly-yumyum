import { NextResponse } from "next/server";
import { fetchAllDerivatives } from "@/lib/fetchers/binance";

export const revalidate = 300; // 5 min cache

/**
 * GET /api/v3/derivatives
 * Returns Long/Short ratio and Funding rate for BTC, ETH, SOL
 * Data from Binance Futures API
 */
export async function GET() {
  try {
    const data = await fetchAllDerivatives();

    if (data.error) {
      return NextResponse.json(
        {
          btc: null,
          eth: null,
          sol: null,
          error: data.error,
          timestamp: new Date().toISOString(),
        },
        { status: 502 }
      );
    }

    // Format response with percentage values
    const formatData = (d: typeof data.btc) => {
      if (!d) return null;
      return {
        longPct: Math.round(d.longRatio * 100),   // e.g., 58
        shortPct: Math.round(d.shortRatio * 100), // e.g., 42
        fundingRate: d.fundingRate,               // e.g., 0.0001
        fundingRatePct: (d.fundingRate * 100).toFixed(4), // e.g., "0.0100"
      };
    };

    return NextResponse.json({
      btc: formatData(data.btc),
      eth: formatData(data.eth),
      sol: formatData(data.sol),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[derivatives] Error:", error);
    return NextResponse.json(
      {
        btc: null,
        eth: null,
        sol: null,
        error: "Failed to fetch derivatives data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
