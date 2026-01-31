/**
 * CoinMarketCap API - Global market metrics (dominance)
 * Free Basic tier: 10,000 credits/month, 30 req/min
 * Requires CMC_API_KEY env var
 */

const CMC_API = "https://pro-api.coinmarketcap.com/v1";

interface CMCGlobalMetricsResponse {
  status: {
    error_code: number;
    error_message: string | null;
  };
  data: {
    btc_dominance: number;
    eth_dominance: number;
    active_cryptocurrencies: number;
    total_market_cap: number;
    total_volume_24h: number;
    last_updated: string;
  };
}

export interface DominanceData {
  btcDominance: number | null;
  ethDominance: number | null;
  othersDominance: number | null;
  totalMarketCap: number | null;
  lastUpdated: string | null;
  error?: string;
}

/**
 * Fetch global market dominance from CoinMarketCap
 * Returns BTC, ETH, and Others dominance percentages
 */
export async function fetchDominance(): Promise<DominanceData> {
  const apiKey = process.env.CMC_API_KEY;

  if (!apiKey) {
    console.error("[cmc] CMC_API_KEY not set");
    return {
      btcDominance: null,
      ethDominance: null,
      othersDominance: null,
      totalMarketCap: null,
      lastUpdated: null,
      error: "CMC_API_KEY not set",
    };
  }

  try {
    const response = await fetch(`${CMC_API}/global-metrics/quotes/latest`, {
      headers: {
        "X-CMC_PRO_API_KEY": apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`CMC API HTTP ${response.status}`);
    }

    const data: CMCGlobalMetricsResponse = await response.json();

    if (data.status.error_code !== 0) {
      throw new Error(data.status.error_message || "CMC API error");
    }

    const btcDominance = data.data.btc_dominance;
    const ethDominance = data.data.eth_dominance;
    const othersDominance = 100 - btcDominance - ethDominance;

    console.log("[cmc] BTC Dominance:", btcDominance.toFixed(2) + "%");
    console.log("[cmc] ETH Dominance:", ethDominance.toFixed(2) + "%");
    console.log("[cmc] Others:", othersDominance.toFixed(2) + "%");

    return {
      btcDominance,
      ethDominance,
      othersDominance,
      totalMarketCap: data.data.total_market_cap,
      lastUpdated: data.data.last_updated,
    };
  } catch (error) {
    console.error("[cmc] fetchDominance error:", error);
    return {
      btcDominance: null,
      ethDominance: null,
      othersDominance: null,
      totalMarketCap: null,
      lastUpdated: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
