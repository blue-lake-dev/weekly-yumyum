import type { MetricValue } from "../types";

const BINANCE_API = "https://api.binance.com/api/v3";
const BINANCE_FAPI = "https://fapi.binance.com/fapi/v1";

interface BinanceTickerResponse {
  symbol: string;
  price: string;
}

interface BinanceFundingRateResponse {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
}

interface BinanceLongShortResponse {
  symbol: string;
  longShortRatio: string;
  timestamp: number;
}

async function fetchWithTimeout<T>(url: string, timeout = 10000): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; YumYumDashboard/1.0)",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(id);
  }
}

export async function fetchBtcPrice(): Promise<MetricValue> {
  try {
    const data = await fetchWithTimeout<BinanceTickerResponse>(
      `${BINANCE_API}/ticker/price?symbol=BTCUSDT`
    );
    const current = parseFloat(data.price);
    return { current, source: "binance" };
  } catch (error) {
    console.error("fetchBtcPrice error:", error);
    return { current: null, error: "Failed to fetch BTC price", source: "binance" };
  }
}

export async function fetchEthPrice(): Promise<MetricValue> {
  try {
    const data = await fetchWithTimeout<BinanceTickerResponse>(
      `${BINANCE_API}/ticker/price?symbol=ETHUSDT`
    );
    const current = parseFloat(data.price);
    return { current, source: "binance" };
  } catch (error) {
    console.error("fetchEthPrice error:", error);
    return { current: null, error: "Failed to fetch ETH price", source: "binance" };
  }
}

// Fallback for funding rate (used if Coinglass fails)
export async function fetchFundingRateBinance(): Promise<MetricValue> {
  try {
    const data = await fetchWithTimeout<BinanceFundingRateResponse[]>(
      `${BINANCE_FAPI}/fundingRate?symbol=BTCUSDT&limit=1`
    );
    const current = parseFloat(data[0].fundingRate) * 100; // Convert to percentage
    return { current, source: "binance" };
  } catch (error) {
    console.error("fetchFundingRate (binance) error:", error);
    return { current: null, error: "Failed to fetch funding rate", source: "binance" };
  }
}

// Fallback for long/short ratio (used if Coinglass fails)
export async function fetchLongShortRatioBinance(): Promise<MetricValue> {
  try {
    const data = await fetchWithTimeout<BinanceLongShortResponse[]>(
      `${BINANCE_FAPI}/globalLongShortAccountRatio?symbol=BTCUSDT&period=1d&limit=1`
    );
    const current = parseFloat(data[0].longShortRatio);
    return { current, source: "binance" };
  } catch (error) {
    console.error("fetchLongShortRatio (binance) error:", error);
    return { current: null, error: "Failed to fetch long/short ratio", source: "binance" };
  }
}
