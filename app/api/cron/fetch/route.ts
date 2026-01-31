import { NextResponse } from "next/server";
import { fetchAndStoreV3Metrics } from "@/lib/fetchers/v3-aggregator";

// Vercel Cron: runs daily at 09:00 KST (00:00 UTC)
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/fetch", "schedule": "0 0 * * *" }] }
//
// V3 stores only 3 metrics daily (ETF flows for BTC, ETH, SOL)
// Everything else is fetched live via API routes

export async function GET(request: Request) {
  // Verify cron secret (Vercel sets this header for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In production, verify the cron secret
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await fetchAndStoreV3Metrics();

    return NextResponse.json({
      success: result.success,
      metricsStored: result.metricsStored,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
