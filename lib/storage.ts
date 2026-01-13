import { kv } from "@vercel/kv";
import { promises as fs } from "fs";
import path from "path";
import type { DashboardData } from "./types";

const KV_KEY = "dashboard_data";
const LOCAL_FILE = path.join(process.cwd(), "data", "latest.json");

// Check if Vercel KV is configured
function isKvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// Get data from storage (KV or local file)
export async function getData(): Promise<DashboardData | null> {
  if (isKvConfigured()) {
    try {
      const data = await kv.get<DashboardData>(KV_KEY);
      return data;
    } catch (error) {
      console.error("KV get error:", error);
      return null;
    }
  }

  // Fallback to local file for development
  try {
    const content = await fs.readFile(LOCAL_FILE, "utf-8");
    return JSON.parse(content) as DashboardData;
  } catch (error) {
    console.error("Local file read error:", error);
    return null;
  }
}

// Save data to storage (KV or local file)
export async function saveData(data: DashboardData): Promise<boolean> {
  if (isKvConfigured()) {
    try {
      await kv.set(KV_KEY, data);
      return true;
    } catch (error) {
      console.error("KV set error:", error);
      return false;
    }
  }

  // Fallback to local file for development
  try {
    await fs.writeFile(LOCAL_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Local file write error:", error);
    return false;
  }
}

// Update specific field in storage
export async function updateField(
  fieldPath: string,
  value: unknown
): Promise<boolean> {
  const data = await getData();
  if (!data) return false;

  // Parse field path like "fund_flow.miner_breakeven"
  const parts = fieldPath.split(".");
  let current: Record<string, unknown> = data as unknown as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]] as Record<string, unknown>;
    if (!current) return false;
  }

  const lastKey = parts[parts.length - 1];
  current[lastKey] = value;

  return saveData(data);
}

// Get storage type for debugging
export function getStorageType(): string {
  return isKvConfigured() ? "vercel-kv" : "local-file";
}
