import { NextResponse } from "next/server";
import { fetchBtcPriceStats } from "@/lib/fetchers/coingecko";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchBtcPriceStats();

    if (data.error) {
      return NextResponse.json(data, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[/api/v1/chain/btc/price] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch BTC price stats" },
      { status: 500 }
    );
  }
}
