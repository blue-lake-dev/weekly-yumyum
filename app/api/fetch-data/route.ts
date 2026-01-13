import { NextResponse } from "next/server";
import { fetchAllData, getErrors } from "@/lib/fetchers";

export async function POST() {
  try {
    // Fetch all data from APIs
    const newData = await fetchAllData();

    // Get list of errors (fields that failed to fetch)
    const errors = getErrors(newData);

    return NextResponse.json({
      success: true,
      data: newData,
      errors,
    });
  } catch (error) {
    console.error("POST /api/fetch-data error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
