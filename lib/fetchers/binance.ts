/**
 * Binance Futures API - Long/Short ratio and Funding rate
 * Free, no API key required
 */

const BINANCE_FUTURES_API = "https://fapi.binance.com";

interface LongShortRatioResponse {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
}

interface FundingRateResponse {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
}

export interface DerivativesData {
  symbol: string;
  longRatio: number; // e.g., 0.58 = 58% long
  shortRatio: number; // e.g., 0.42 = 42% short
  fundingRate: number; // e.g., 0.0001 = 0.01%
}

export interface AllDerivativesData {
  btc: DerivativesData | null;
  eth: DerivativesData | null;
  sol: DerivativesData | null;
  error?: string;
}

async function fetchWithTimeout<T>(
  url: string,
  timeout = 5000,
  revalidate = 300 // 5 min default cache (matches use-derivatives)
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

async function fetchDerivativesForSymbol(symbol: string): Promise<DerivativesData | null> {
  try {
    // Fetch long/short ratio
    const lsData = await fetchWithTimeout<LongShortRatioResponse[]>(
      `${BINANCE_FUTURES_API}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`
    );

    // Fetch funding rate
    const frData = await fetchWithTimeout<FundingRateResponse[]>(
      `${BINANCE_FUTURES_API}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`
    );

    if (!lsData?.[0] || !frData?.[0]) {
      return null;
    }

    const longShortRatio = parseFloat(lsData[0].longShortRatio);
    const longRatio = longShortRatio / (1 + longShortRatio);
    const shortRatio = 1 - longRatio;
    const fundingRate = parseFloat(frData[0].fundingRate);

    return {
      symbol,
      longRatio,
      shortRatio,
      fundingRate,
    };
  } catch (error) {
    console.error(`[binance-futures] Error fetching ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch derivatives data for BTC, ETH, SOL
 */
export async function fetchAllDerivatives(): Promise<AllDerivativesData> {
  try {
    const [btc, eth, sol] = await Promise.all([
      fetchDerivativesForSymbol("BTCUSDT"),
      fetchDerivativesForSymbol("ETHUSDT"),
      fetchDerivativesForSymbol("SOLUSDT"),
    ]);

    console.log("[binance-futures] BTC L/S:", btc ? `${(btc.longRatio * 100).toFixed(1)}%/${(btc.shortRatio * 100).toFixed(1)}%` : "N/A");
    console.log("[binance-futures] ETH L/S:", eth ? `${(eth.longRatio * 100).toFixed(1)}%/${(eth.shortRatio * 100).toFixed(1)}%` : "N/A");
    console.log("[binance-futures] SOL L/S:", sol ? `${(sol.longRatio * 100).toFixed(1)}%/${(sol.shortRatio * 100).toFixed(1)}%` : "N/A");

    return { btc, eth, sol };
  } catch (error) {
    console.error("[binance-futures] fetchAllDerivatives error:", error);
    return {
      btc: null,
      eth: null,
      sol: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch funding rates only (lighter call)
 */
export async function fetchFundingRates(): Promise<{
  btc: number | null;
  eth: number | null;
  sol: number | null;
}> {
  try {
    const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const data = await fetchWithTimeout<FundingRateResponse[]>(
          `${BINANCE_FUTURES_API}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`
        );
        return data?.[0] ? parseFloat(data[0].fundingRate) : null;
      })
    );

    console.log("[binance-futures] Funding rates - BTC:", results[0], "ETH:", results[1], "SOL:", results[2]);

    return {
      btc: results[0],
      eth: results[1],
      sol: results[2],
    };
  } catch (error) {
    console.error("[binance-futures] fetchFundingRates error:", error);
    return { btc: null, eth: null, sol: null };
  }
}
