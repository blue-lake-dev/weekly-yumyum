import type { MetricValue } from "../types";
import { formatTimestamp } from "../utils";

const ALTERNATIVE_API = "https://api.alternative.me/fng";

interface FearGreedResponse {
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string; // Unix timestamp in seconds
  }>;
}

async function fetchWithTimeout<T>(url: string, timeout = 10000): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(id);
  }
}

// Helper to calculate change percentage
function calcChangePct(current: number | null, previous: number | null): number | undefined {
  if (current === null || previous === null || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

export async function fetchFearGreed(): Promise<MetricValue> {
  try {
    // Fetch last 8 days to get both current and 7-day-ago values
    const data = await fetchWithTimeout<FearGreedResponse>(`${ALTERNATIVE_API}/?limit=8`);

    if (!data.data || data.data.length === 0) {
      throw new Error("No data returned");
    }

    // Index 0 is today (most recent), index 7 is 7 days ago
    const currentEntry = data.data[0];
    const previousEntry = data.data.length >= 8 ? data.data[7] : null;

    const current = parseInt(currentEntry.value, 10);
    const current_at = formatTimestamp(parseInt(currentEntry.timestamp, 10), "UTC");

    const previous = previousEntry ? parseInt(previousEntry.value, 10) : null;
    const previous_at = previousEntry ? formatTimestamp(parseInt(previousEntry.timestamp, 10), "UTC") : undefined;

    return {
      current,
      current_at,
      previous,
      previous_at,
      change_pct: calcChangePct(current, previous),
      source: "alternative",
    };
  } catch (error) {
    console.error("fetchFearGreed error:", error);
    return { current: null, error: "Failed to fetch Fear & Greed index", source: "alternative" };
  }
}
