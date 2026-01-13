import type { MetricValue } from "../types";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

interface GlobalData {
  data: {
    market_cap_percentage: {
      btc: number;
      eth: number;
    };
  };
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

export async function fetchBtcDominance(): Promise<MetricValue> {
  try {
    const data = await fetchWithTimeout<GlobalData>(`${COINGECKO_API}/global`);
    const current = data.data.market_cap_percentage.btc;
    return { current, source: "coingecko" };
  } catch (error) {
    console.error("fetchBtcDominance error:", error);
    return { current: null, error: "Failed to fetch BTC dominance", source: "coingecko" };
  }
}
