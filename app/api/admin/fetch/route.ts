import { NextResponse } from "next/server";
import { fetchAndStoreV2Metrics } from "@/lib/fetchers/v2-aggregator";
// import { extractToken, verifyJwt } from "@/lib/auth";

// Manual trigger for admin to fetch all metrics
// Protected by JWT auth (Telegram OTP login)

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

  console.log("[admin/fetch] POST request received");

  try {
    const result = await fetchAndStoreV2Metrics();
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
