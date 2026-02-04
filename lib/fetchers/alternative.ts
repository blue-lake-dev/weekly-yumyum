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

async function fetchWithTimeout<T>(
  url: string,
  timeout = 5000,
  revalidate = 900 // 15 min default cache
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate },
    });
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

// ============================================================================
// Extended Fear & Greed for QuickStats (with 1d/7d/30d changes)
// ============================================================================

/**
 * Get Korean label for Fear & Greed value
 * Standard ranges from Alternative.me
 */
function getFearGreedLabel(value: number): string {
  if (value <= 24) return "극단적 공포";
  if (value <= 44) return "공포";
  if (value <= 55) return "중립";
  if (value <= 74) return "탐욕";
  return "극단적 탐욕";
}

/**
 * Calculate point change (not percentage) for Fear & Greed
 * e.g., 72 → 65 = -7 points
 */
function calcPointChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return current - previous;
}

export interface FearGreedExtendedData {
  value: number | null;
  label: string;
  change1d: number | null;  // point change vs yesterday
  change7d: number | null;  // point change vs 7 days ago
  change30d: number | null; // point change vs 30 days ago (MoM)
  error?: string;
}

/**
 * Fetch Fear & Greed with extended historical comparisons
 * Returns current value + 1d/7d/30d point changes
 */
export async function fetchFearGreedExtended(): Promise<FearGreedExtendedData> {
  try {
    // Fetch 31 days to calculate 30d (MoM) change
    const data = await fetchWithTimeout<FearGreedResponse>(`${ALTERNATIVE_API}/?limit=31`);

    if (!data.data || data.data.length === 0) {
      throw new Error("No data returned");
    }

    // Index 0 = today, 1 = yesterday, 7 = 7 days ago, 30 = 30 days ago
    const current = parseInt(data.data[0].value, 10);
    const value1dAgo = data.data.length >= 2 ? parseInt(data.data[1].value, 10) : null;
    const value7dAgo = data.data.length >= 8 ? parseInt(data.data[7].value, 10) : null;
    const value30dAgo = data.data.length >= 31 ? parseInt(data.data[30].value, 10) : null;

    const label = getFearGreedLabel(current);

    console.log("[alternative] Fear & Greed:", current, label);
    console.log("[alternative] 1d ago:", value1dAgo, "| 7d ago:", value7dAgo, "| 30d ago:", value30dAgo);

    return {
      value: current,
      label,
      change1d: calcPointChange(current, value1dAgo),
      change7d: calcPointChange(current, value7dAgo),
      change30d: calcPointChange(current, value30dAgo),
    };
  } catch (error) {
    console.error("[alternative] fetchFearGreedExtended error:", error);
    return {
      value: null,
      label: "알 수 없음",
      change1d: null,
      change7d: null,
      change30d: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
