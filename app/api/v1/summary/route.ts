import { NextResponse } from "next/server";

/**
 * GET /api/v3/summary
 * Returns today's AI-generated market summary
 * TODO: Implement with claude-summary.ts fetcher
 */
export async function GET() {
  // Dummy response until claude-summary.ts is implemented
  return NextResponse.json({
    date: new Date().toISOString().split("T")[0],
    summary: "오늘의 시장 요약은 준비 중입니다.",
    isDummy: true,
    timestamp: new Date().toISOString(),
  });
}
