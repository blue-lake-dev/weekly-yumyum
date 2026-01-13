import { NextRequest, NextResponse } from "next/server";
import { getData, saveData } from "@/lib/storage";
import { MANUAL_FIELDS, type ManualFieldPath } from "@/lib/types";

interface UpdateRequest {
  field: ManualFieldPath;
  value: {
    current: number | string | null;
    previous?: number | string | null;
  };
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateRequest;
    const { field, value } = body;

    // Validate field is a manual field
    if (!MANUAL_FIELDS.includes(field)) {
      return NextResponse.json(
        { success: false, error: `Field "${field}" is not a manual field` },
        { status: 400 }
      );
    }

    const data = await getData();
    if (!data) {
      return NextResponse.json(
        { success: false, error: "No data found" },
        { status: 404 }
      );
    }

    // Parse field path and update
    const [section, key] = field.split(".") as [string, string];
    const sectionData = data[section as keyof typeof data];

    if (typeof sectionData === "object" && sectionData !== null && key in sectionData) {
      (sectionData as Record<string, unknown>)[key] = {
        ...(sectionData as Record<string, unknown>)[key] as object,
        ...value,
        isManual: true,
      };
    }

    const saved = await saveData(data);

    if (!saved) {
      return NextResponse.json(
        { success: false, error: "Failed to save data" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("PATCH /api/update-manual error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update field" },
      { status: 500 }
    );
  }
}
