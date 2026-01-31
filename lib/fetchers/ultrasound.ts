// ultrasound.money API - ETH burn and issuance data
// No API key required (public endpoints)

const ULTRASOUND_API = "https://ultrasound.money/api/v2/fees";

type TimeFrame = "m5" | "h1" | "d1" | "d7" | "d30" | "since_merge" | "since_burn";

interface GaugeRateEntry {
  block_number: number;
  burn_rate_yearly: { eth: number; usd: number };
  issuance_rate_yearly: { eth: number; usd: number };
  issuance_rate_yearly_pow: { eth: number; usd: number };
  supply_growth_rate_yearly: number;
  supply_growth_rate_yearly_pow: number;
  timestamp: string;
}

type GaugeRatesResponse = Record<TimeFrame, GaugeRateEntry>;

interface BurnSumEntry {
  block_number: number;
  sum: { eth: number; usd: number };
  timestamp: string;
}

type BurnSumsResponse = Record<TimeFrame, BurnSumEntry>;

async function fetchWithTimeout<T>(url: string, timeout = 15000): Promise<T> {
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

export interface EthBurnIssuanceData {
  // Actual burn amounts (from burn-sums)
  burn24h: number | null; // ETH burned in last 24h
  burn7d: number | null; // ETH burned in last 7 days
  burnSinceMerge: number | null; // Total burned since merge

  // Supply growth rate (from gauge-rates)
  supplyGrowthRateYearly: number | null; // e.g., 0.0079 = 0.79%
  isDeflationary: boolean;

  // Metadata
  timestamp: string | null;
  error?: string;
}

export async function fetchEthBurnIssuance(): Promise<EthBurnIssuanceData> {
  try {
    // Fetch both endpoints in parallel
    const [gaugeRates, burnSums] = await Promise.all([
      fetchWithTimeout<GaugeRatesResponse>(`${ULTRASOUND_API}/gauge-rates`),
      fetchWithTimeout<BurnSumsResponse>(`${ULTRASOUND_API}/burn-sums`),
    ]);

    const d1 = gaugeRates.d1;
    if (!d1) {
      throw new Error("Missing d1 timeframe data");
    }

    // Actual burn amounts
    const burn24h = burnSums.d1?.sum.eth ?? null;
    const burn7d = burnSums.d7?.sum.eth ?? null;
    const burnSinceMerge = burnSums.since_merge?.sum.eth ?? null;

    // Supply growth rate (negative = deflationary)
    const supplyGrowthRateYearly = d1.supply_growth_rate_yearly;
    const isDeflationary = supplyGrowthRateYearly < 0;

    console.log(`[ultrasound] ETH burn 24h: ${burn24h?.toFixed(2)} ETH, 7d: ${burn7d?.toFixed(2)} ETH`);
    console.log(`[ultrasound] Supply growth: ${(supplyGrowthRateYearly * 100).toFixed(2)}%/year (${isDeflationary ? 'deflationary' : 'inflationary'})`);

    return {
      burn24h,
      burn7d,
      burnSinceMerge,
      supplyGrowthRateYearly,
      isDeflationary,
      timestamp: d1.timestamp,
    };
  } catch (error) {
    console.error("fetchEthBurnIssuance error:", error);
    return {
      burn24h: null,
      burn7d: null,
      burnSinceMerge: null,
      supplyGrowthRateYearly: null,
      isDeflationary: false,
      timestamp: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Fetch burn data for specific timeframe
export async function fetchBurnByTimeframe(
  timeframe: TimeFrame = "d1"
): Promise<{ burn: number | null; timestamp: string | null; error?: string }> {
  try {
    const data = await fetchWithTimeout<BurnSumsResponse>(
      `${ULTRASOUND_API}/burn-sums`
    );

    const entry = data[timeframe];
    if (!entry) {
      throw new Error(`Missing ${timeframe} data`);
    }

    return {
      burn: entry.sum.eth,
      timestamp: entry.timestamp,
    };
  } catch (error) {
    console.error(`fetchBurnByTimeframe(${timeframe}) error:`, error);
    return {
      burn: null,
      timestamp: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
