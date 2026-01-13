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

interface SimplePriceResponse {
  bitcoin?: { usd: number };
  ethereum?: { usd: number };
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

// Delay helper to avoid rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch all CoinGecko data in minimal API calls to avoid rate limiting
export interface CoinGeckoData {
  btcPrice: MetricValue;
  ethPrice: MetricValue;
  btcDominance: MetricValue;
}

export async function fetchAllCoinGeckoData(): Promise<CoinGeckoData> {
  let btcPrice: MetricValue = { current: null, error: "Failed to fetch BTC price", source: "coingecko" };
  let ethPrice: MetricValue = { current: null, error: "Failed to fetch ETH price", source: "coingecko" };
  let btcDominance: MetricValue = { current: null, error: "Failed to fetch BTC dominance", source: "coingecko" };

  // Fetch both prices in a single API call
  try {
    const priceData = await fetchWithTimeout<SimplePriceResponse>(
      `${COINGECKO_API}/simple/price?ids=bitcoin,ethereum&vs_currencies=usd`
    );
    if (priceData.bitcoin?.usd) {
      btcPrice = { current: priceData.bitcoin.usd, source: "coingecko" };
    }
    if (priceData.ethereum?.usd) {
      ethPrice = { current: priceData.ethereum.usd, source: "coingecko" };
    }
  } catch (error) {
    console.error("fetchCoinGeckoPrices error:", error);
  }

  // Small delay before second API call to avoid rate limiting
  await delay(500);

  // Fetch dominance data
  try {
    const globalData = await fetchWithTimeout<GlobalData>(`${COINGECKO_API}/global`);
    btcDominance = { current: globalData.data.market_cap_percentage.btc, source: "coingecko" };
  } catch (error) {
    console.error("fetchBtcDominance error:", error);
  }

  return { btcPrice, ethPrice, btcDominance };
}

// Legacy exports for backwards compatibility (if needed elsewhere)
export async function fetchBtcDominance(): Promise<MetricValue> {
  const data = await fetchAllCoinGeckoData();
  return data.btcDominance;
}

export async function fetchBtcPrice(): Promise<MetricValue> {
  const data = await fetchAllCoinGeckoData();
  return data.btcPrice;
}

export async function fetchEthPrice(): Promise<MetricValue> {
  const data = await fetchAllCoinGeckoData();
  return data.ethPrice;
}
