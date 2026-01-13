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

interface SimplePriceResponse {
  bitcoin: { usd: number };
  ethereum: { usd: number };
}

export async function fetchBtcPrice(): Promise<MetricValue> {
  try {
    const data = await fetchWithTimeout<SimplePriceResponse>(
      `${COINGECKO_API}/simple/price?ids=bitcoin&vs_currencies=usd`
    );
    return { current: data.bitcoin.usd, source: "coingecko" };
  } catch (error) {
    console.error("fetchBtcPrice error:", error);
    return { current: null, error: "Failed to fetch BTC price", source: "coingecko" };
  }
}

export async function fetchEthPrice(): Promise<MetricValue> {
  try {
    const data = await fetchWithTimeout<SimplePriceResponse>(
      `${COINGECKO_API}/simple/price?ids=ethereum&vs_currencies=usd`
    );
    return { current: data.ethereum.usd, source: "coingecko" };
  } catch (error) {
    console.error("fetchEthPrice error:", error);
    return { current: null, error: "Failed to fetch ETH price", source: "coingecko" };
  }
}
