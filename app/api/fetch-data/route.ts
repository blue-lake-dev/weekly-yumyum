import { NextResponse } from "next/server";
import { getData, saveData, getStorageType } from "@/lib/storage";
import { fetchAllData, getErrors } from "@/lib/fetchers";

export async function POST() {
  try {
    // Get existing data to preserve manual fields and use as "previous" values
    const previousData = await getData();

    // Fetch all data from APIs
    const newData = await fetchAllData(previousData ?? undefined);

    // Save to storage
    const saved = await saveData(newData);

    if (!saved) {
      return NextResponse.json(
        { success: false, error: "Failed to save data" },
        { status: 500 }
      );
    }

    // Get list of errors (fields that failed to fetch)
    const errors = getErrors(newData);

    return NextResponse.json({
      success: true,
      data: newData,
      errors,
      storage: getStorageType(),
    });
  } catch (error) {
    console.error("POST /api/fetch-data error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
