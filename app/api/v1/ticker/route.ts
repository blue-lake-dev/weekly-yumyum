import { NextResponse } from "next/server";
import { fetchTickerPrices } from "@/lib/fetchers/coingecko-market";

export const revalidate = 60; // 1 min cache (CoinGecko updates every ~1-2 min)

/**
 * GET /api/v3/ticker
 * Returns live prices for BTC, ETH, SOL with 24h change
 * Source: CoinGecko /simple/price (single API call, rate-limit friendly)
 */
export async function GET() {
  try {
    const tickers = await fetchTickerPrices();

    return NextResponse.json({
      tickers,
      source: "coingecko",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[ticker] Error:", error);
    return NextResponse.json(
      {
        tickers: [],
        error: "Failed to fetch ticker data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
