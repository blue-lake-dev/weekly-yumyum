import { NextResponse } from "next/server";
import { fetchAndStoreMetrics } from "@/lib/fetchers/aggregator";
// import { extractToken, verifyJwt } from "@/lib/auth";

// Manual trigger for admin to fetch all metrics
// Protected by JWT auth (Telegram OTP login)
//
// V3 stores only 3 metrics daily (ETF flows for BTC, ETH, SOL)
// Everything else is fetched live via API routes

export async function POST(request: Request) {
  // TODO: Re-enable JWT verification once Telegram admin UI is ready
  // const token = extractToken(request);
  //
  // if (!token) {
  //   return NextResponse.json({ error: "No token provided" }, { status: 401 });
  // }
  //
  // const { valid, error } = await verifyJwt(token);
  //
  // if (!valid) {
  //   return NextResponse.json(
  //     { error: error || "Invalid token" },
  //     { status: 401 }
  //   );
  // }

  // Suppress unused parameter warning
  void request;

  console.log("[admin/fetch] POST request received (V3)");

  try {
    const result = await fetchAndStoreMetrics();
    console.log("[admin/fetch] Result:", result);

    return NextResponse.json({
      success: result.success,
      metricsStored: result.metricsStored,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
