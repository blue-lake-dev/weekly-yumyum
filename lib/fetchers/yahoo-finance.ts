import type { MetricValue } from "../types";

// Using Yahoo Finance v8 API (unofficial but commonly used)
const YAHOO_API = "https://query1.finance.yahoo.com/v8/finance/chart";

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
        previousClose: number;
      };
      indicators: {
        quote: Array<{
          close: number[];
          high: number[];
          low: number[];
        }>;
      };
    }>;
    error: null | { code: string; description: string };
  };
}

async function fetchWithTimeout<T>(url: string, timeout = 10000): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(id);
  }
}

async function fetchYahooPrice(symbol: string): Promise<MetricValue> {
  try {
    const data = await fetchWithTimeout<YahooChartResponse>(
      `${YAHOO_API}/${symbol}?interval=1d&range=1d`
    );

    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }

    const current = data.chart.result[0].meta.regularMarketPrice;
    return { current, source: "yahoo" };
  } catch (error) {
    console.error(`fetchYahooPrice(${symbol}) error:`, error);
    return { current: null, error: `Failed to fetch ${symbol}`, source: "yahoo" };
  }
}

// Calculate realized volatility from price history
async function fetchVolatility(symbol: string, days: number): Promise<MetricValue> {
  try {
    const data = await fetchWithTimeout<YahooChartResponse>(
      `${YAHOO_API}/${symbol}?interval=1d&range=${days + 5}d`
    );

    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }

    const closes = data.chart.result[0].indicators.quote[0].close.filter(
      (c) => c !== null
    );

    if (closes.length < days) {
      throw new Error("Not enough data for volatility calculation");
    }

    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }

    // Take last N days
    const recentReturns = returns.slice(-days);

    // Calculate standard deviation
    const mean = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
    const variance =
      recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      (recentReturns.length - 1);
    const dailyVol = Math.sqrt(variance);

    // Annualize and convert to percentage
    const current = dailyVol * Math.sqrt(365) * 100;
    return { current, source: "yahoo" };
  } catch (error) {
    console.error(`fetchVolatility(${symbol}, ${days}) error:`, error);
    return { current: null, error: `Failed to fetch ${days}D volatility`, source: "yahoo" };
  }
}

// Export individual fetchers
export const fetchNasdaq = () => fetchYahooPrice("^IXIC");
export const fetchMstr = () => fetchYahooPrice("MSTR");
export const fetchBmnr = () => fetchYahooPrice("BMNR");
export const fetchDxy = () => fetchYahooPrice("DX-Y.NYB");
export const fetchUs10y = () => fetchYahooPrice("^TNX");
export const fetchGold = () => fetchYahooPrice("GC=F");
export const fetchSp500 = () => fetchYahooPrice("^GSPC");
export const fetchBtcFutures = () => fetchYahooPrice("BTC=F");

export const fetchVol7d = () => fetchVolatility("BTC-USD", 7);
export const fetchVol30d = () => fetchVolatility("BTC-USD", 30);

// CME Gap - BTC futures price
export async function fetchCmeGap(): Promise<MetricValue> {
  return fetchBtcFutures();
}
