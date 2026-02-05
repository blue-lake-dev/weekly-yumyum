import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const BUCKET_NAME = "rwa-data";

// Category display names and colors
const CATEGORIES = [
  { key: "US Treasury Debt", color: "#1e40af" },        // Dark blue
  { key: "non-US Government Debt", color: "#93c5fd" },  // Light blue
  { key: "Corporate Bonds", color: "#a855f7" },         // Purple
  { key: "Private Credit", color: "#3b82f6" },          // Blue
  { key: "Public Equity", color: "#ef4444" },           // Red
  { key: "Private Equity", color: "#fde047" },          // Yellow
  { key: "Commodities", color: "#f59e0b" },             // Orange/Gold
  { key: "Structured Credit", color: "#1e3a8a" },       // Navy
  { key: "Institutional Alternative Funds", color: "#67e8f9" }, // Cyan
  { key: "Actively-Managed Strategies", color: "#475569" },     // Slate
] as const;

interface RwaDataPoint {
  date: string;
  total: number;
  [key: string]: string | number;
}

interface RwaResponse {
  data: RwaDataPoint[];
  categories: Array<{ key: string; color: string }>;
  latest: {
    date: string;
    total: number;
    byCategory: Record<string, number>;
  };
  changes: {
    d7: number | null;
    d30: number | null;
  };
  csvFile?: string;
  error?: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Extract date from filename like "rwa-market-overview-2026-02-05.csv"
function extractDateFromFilename(filename: string): string | null {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})\.csv$/);
  return match ? match[1] : null;
}

export async function GET(): Promise<NextResponse<RwaResponse>> {
  try {
    const supabase = createServerClient();

    // List files in the bucket (cached for 5 minutes)
    const { data: files, error: listError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .list();

    if (listError || !files?.length) {
      throw new Error(listError?.message || "No files found in bucket");
    }

    // Find the latest file by date in filename
    const csvFiles = files
      .filter((f) => f.name.endsWith(".csv"))
      .map((f) => ({
        name: f.name,
        date: extractDateFromFilename(f.name),
      }))
      .filter((f) => f.date !== null)
      .sort((a, b) => b.date!.localeCompare(a.date!));

    if (!csvFiles.length) {
      throw new Error("No dated CSV files found");
    }

    const latestFile = csvFiles[0].name;

    // Fetch the CSV content
    const csvUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${latestFile}`;
    const csvRes = await fetch(csvUrl, {
      next: { revalidate: 3600 }, // Cache CSV content for 1 hour
    });

    if (!csvRes.ok) {
      throw new Error(`Failed to fetch CSV: ${csvRes.status}`);
    }

    const csvContent = await csvRes.text();
    const lines = csvContent.trim().split("\n");
    const header = parseCSVLine(lines[0]);

    // Find column indices
    const dateIdx = header.findIndex((h) => h === "Date");
    const categoryIndices: Record<string, number> = {};

    CATEGORIES.forEach(({ key }) => {
      const idx = header.findIndex((h) => h === key);
      if (idx !== -1) {
        categoryIndices[key] = idx;
      }
    });

    // Parse all rows
    const data: RwaDataPoint[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = parseCSVLine(line);
      const date = values[dateIdx];
      if (!date) continue;

      const point: RwaDataPoint = { date, total: 0 };

      for (const { key } of CATEGORIES) {
        const idx = categoryIndices[key];
        if (idx !== undefined) {
          const val = parseFloat(values[idx]) || 0;
          point[key] = val;
          point.total += val;
        }
      }

      data.push(point);
    }

    // Calculate latest and changes
    const latest = data[data.length - 1];
    const d7Ago = data[data.length - 8];
    const d30Ago = data[data.length - 31];

    const byCategory: Record<string, number> = {};
    CATEGORIES.forEach(({ key }) => {
      byCategory[key] = (latest[key] as number) || 0;
    });

    const d7Change = d7Ago ? ((latest.total - d7Ago.total) / d7Ago.total) * 100 : null;
    const d30Change = d30Ago ? ((latest.total - d30Ago.total) / d30Ago.total) * 100 : null;

    return NextResponse.json({
      data,
      categories: CATEGORIES.map((c) => ({ key: c.key, color: c.color })),
      latest: {
        date: latest.date,
        total: latest.total,
        byCategory,
      },
      changes: {
        d7: d7Change,
        d30: d30Change,
      },
      csvFile: latestFile,
    });
  } catch (error) {
    console.error("[rwa] Error:", error);
    return NextResponse.json({
      data: [],
      categories: [],
      latest: { date: "", total: 0, byCategory: {} },
      changes: { d7: null, d30: null },
      error: error instanceof Error ? error.message : "Failed to load RWA data",
    }, { status: 500 });
  }
}
