import { NextResponse } from "next/server";
import { fetchMempoolStats } from "@/lib/fetchers/mempool";
import { fetchBtcHashrate } from "@/lib/fetchers/blockchain-com";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [mempool, hashrate] = await Promise.all([
      fetchMempoolStats(),
      fetchBtcHashrate(),
    ]);

    return NextResponse.json({
      mempool: {
        pendingTxCount: mempool.pendingTxCount,
        pendingVsize: mempool.pendingVsize,
        fees: mempool.fees,
        congestionLevel: mempool.congestionLevel,
      },
      hashrate: {
        current: hashrate.current,
        change30d: hashrate.change30d,
        sparkline: hashrate.sparkline,
      },
    });
  } catch (error) {
    console.error("[/api/v1/chain/btc/network] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch BTC network stats" },
      { status: 500 }
    );
  }
}
