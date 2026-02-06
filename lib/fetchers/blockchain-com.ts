/**
 * Blockchain.com API fetcher
 * Provides BTC network stats including hashrate
 *
 * API Docs: https://www.blockchain.com/api/charts_api
 */

const BLOCKCHAIN_API = "https://api.blockchain.info";

async function fetchWithTimeout<T>(
  url: string,
  timeout = 5000,
  revalidate = 86400 // 1 day - daily aggregates
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

// ============================================================================
// Types
// ============================================================================

interface ChartDataPoint {
  x: number;    // Unix timestamp (seconds)
  y: number;    // Value (hashrate in TH/s for hash-rate chart)
}

interface ChartApiResponse {
  status: string;
  name: string;
  unit: string;
  period: string;
  description: string;
  values: ChartDataPoint[];
}

export interface HashrateData {
  current: number | null;       // Current hashrate in EH/s
  change30d: number | null;     // Percentage change over 30d
  sparkline: number[];          // 30 daily values in EH/s
  error?: string;
}

// ============================================================================
// Fetcher
// ============================================================================

/**
 * Fetch BTC network hashrate with 30-day history
 * Returns data in EH/s (Exahashes per second)
 *
 * Note: Blockchain.com returns data in TH/s, we convert to EH/s (÷ 1e6)
 */
export async function fetchBtcHashrate(): Promise<HashrateData> {
  try {
    const data = await fetchWithTimeout<ChartApiResponse>(
      `${BLOCKCHAIN_API}/charts/hash-rate?timespan=30days&format=json`
    );

    if (!data.values || data.values.length === 0) {
      throw new Error("No hashrate data available");
    }

    // Convert from TH/s to EH/s (1 EH = 1,000,000 TH)
    const sparkline = data.values.map(point => point.y / 1e6);

    // Current is the latest value
    const current = sparkline[sparkline.length - 1];

    // First value (30 days ago)
    const first = sparkline[0];

    // Calculate 30d change percentage
    const change30d = first > 0 ? ((current - first) / first) * 100 : null;

    console.log(`[blockchain-com] Hashrate: ${current.toFixed(2)} EH/s`);
    console.log(`[blockchain-com] 30d change: ${change30d?.toFixed(2)}%`);
    console.log(`[blockchain-com] Sparkline points: ${sparkline.length}`);

    return {
      current,
      change30d,
      sparkline,
    };
  } catch (error) {
    console.error("[blockchain-com] fetchBtcHashrate error:", error);
    return {
      current: null,
      change30d: null,
      sparkline: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
