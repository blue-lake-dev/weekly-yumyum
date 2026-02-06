/**
 * Mempool.space API fetcher
 * Provides BTC mempool stats and fee recommendations
 *
 * API Docs: https://mempool.space/docs/api
 */

const MEMPOOL_API = "https://mempool.space/api";

async function fetchWithTimeout<T>(
  url: string,
  timeout = 5000,
  revalidate = 60 // 1 min - real-time-ish data
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

interface MempoolApiResponse {
  count: number;           // Total pending transactions
  vsize: number;           // Virtual size in vBytes
  total_fee: number;       // Total fees in satoshis
  fee_histogram: number[][]; // Fee rate histogram
}

interface RecommendedFeesResponse {
  fastestFee: number;      // sat/vB for next block
  halfHourFee: number;     // sat/vB for ~30 min
  hourFee: number;         // sat/vB for ~1 hour
  economyFee: number;      // sat/vB for low priority
  minimumFee: number;      // sat/vB minimum
}

export interface MempoolStats {
  pendingTxCount: number | null;
  pendingVsize: number | null;     // in MB
  fees: {
    fastest: number | null;        // sat/vB
    halfHour: number | null;
    hour: number | null;
    economy: number | null;
  };
  congestionLevel: "low" | "moderate" | "high" | "extreme" | null;
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate congestion score (0-100) based on mempool vSize and fastest fee
 * Uses 50/50 weighting of two metrics to catch different congestion scenarios
 */
function getCongestionScore(mempoolVMB: number, fastestFee: number): number {
  const vsizeScore = Math.min(mempoolVMB / 60, 1) * 50;   // 0-50 (60 vMB = max)
  const feeScore = Math.min(fastestFee / 80, 1) * 50;     // 0-50 (80 sat/vB = max)
  return Math.round(vsizeScore + feeScore);
}

/**
 * Determine congestion level based on combined score
 * - Low: < 15 (weekend calm, normal weekday)
 * - Moderate: 15-39 (increased activity)
 * - High: 40-64 (inscription waves, busy periods)
 * - Extreme: 65+ (major events like Runes launch)
 */
function getCongestionLevel(score: number): "low" | "moderate" | "high" | "extreme" {
  if (score < 15) return "low";
  if (score < 40) return "moderate";
  if (score < 65) return "high";
  return "extreme";
}

// ============================================================================
// Fetcher
// ============================================================================

/**
 * Fetch mempool stats and recommended fees
 * Combines data from /mempool and /v1/fees/recommended endpoints
 */
export async function fetchMempoolStats(): Promise<MempoolStats> {
  try {
    // Fetch both endpoints in parallel
    const [mempoolData, feesData] = await Promise.all([
      fetchWithTimeout<MempoolApiResponse>(`${MEMPOOL_API}/mempool`),
      fetchWithTimeout<RecommendedFeesResponse>(`${MEMPOOL_API}/v1/fees/recommended`),
    ]);

    const pendingTxCount = mempoolData.count;
    const pendingVsize = mempoolData.vsize / 1e6; // Convert to MB
    const congestionScore = getCongestionScore(pendingVsize, feesData.fastestFee);
    const congestionLevel = getCongestionLevel(congestionScore);

    console.log(`[mempool] Pending: ${pendingTxCount.toLocaleString()} txs (${congestionLevel})`);
    console.log(`[mempool] Fees: fastest=${feesData.fastestFee}, halfHour=${feesData.halfHourFee}, hour=${feesData.hourFee}`);

    return {
      pendingTxCount,
      pendingVsize,
      fees: {
        fastest: feesData.fastestFee,
        halfHour: feesData.halfHourFee,
        hour: feesData.hourFee,
        economy: feesData.economyFee,
      },
      congestionLevel,
    };
  } catch (error) {
    console.error("[mempool] fetchMempoolStats error:", error);
    return {
      pendingTxCount: null,
      pendingVsize: null,
      fees: {
        fastest: null,
        halfHour: null,
        hour: null,
        economy: null,
      },
      congestionLevel: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
