import { NextResponse } from "next/server";
import { fetchAndStoreV2Metrics } from "@/lib/fetchers/v2-aggregator";

// Manual trigger for admin to fetch all metrics
// TODO: Replace with JWT auth middleware after Telegram OTP is implemented

export async function POST(request: Request) {
  // Simple admin secret check (temporary until JWT auth)
  const authHeader = request.headers.get("authorization");
  const adminSecret = process.env.ADMIN_SECRET;

  if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await fetchAndStoreV2Metrics();

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
