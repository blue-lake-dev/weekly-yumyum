import type { MetricValue } from "../types";

const ALTERNATIVE_API = "https://api.alternative.me/fng";

interface FearGreedResponse {
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
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

export async function fetchFearGreed(): Promise<MetricValue> {
  try {
    const data = await fetchWithTimeout<FearGreedResponse>(`${ALTERNATIVE_API}/?limit=1`);
    const current = parseInt(data.data[0].value, 10);
    return { current, source: "alternative" };
  } catch (error) {
    console.error("fetchFearGreed error:", error);
    return { current: null, error: "Failed to fetch Fear & Greed index", source: "alternative" };
  }
}
