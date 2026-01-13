import { NextResponse } from "next/server";
import { getData, getStorageType } from "@/lib/storage";

export async function GET() {
  try {
    const data = await getData();

    if (!data) {
      return NextResponse.json(
        { success: false, error: "No data found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      storage: getStorageType(),
    });
  } catch (error) {
    console.error("GET /api/data error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
