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
  // Daily values (calculated from annualized rates)
  dailyBurn: number | null; // ETH burned per day
  dailyIssuance: number | null; // ETH issued per day (PoS rewards)
  dailyNetSupplyChange: number | null; // issuance - burn

  // Cumulative totals
  totalBurnedSinceMerge: number | null;
  totalBurnedSinceEIP1559: number | null;

  // Metadata
  timestamp: string | null;
  blockNumber: number | null;
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

    // Convert annualized rates to daily values
    const dailyBurn = d1.burn_rate_yearly.eth / 365;
    const dailyIssuance = d1.issuance_rate_yearly.eth / 365;
    const dailyNetSupplyChange = dailyIssuance - dailyBurn;

    // Get cumulative burn totals
    const totalBurnedSinceMerge = burnSums.since_merge?.sum.eth ?? null;
    const totalBurnedSinceEIP1559 = burnSums.since_burn?.sum.eth ?? null;

    return {
      dailyBurn,
      dailyIssuance,
      dailyNetSupplyChange,
      totalBurnedSinceMerge,
      totalBurnedSinceEIP1559,
      timestamp: d1.timestamp,
      blockNumber: d1.block_number,
    };
  } catch (error) {
    console.error("fetchEthBurnIssuance error:", error);
    return {
      dailyBurn: null,
      dailyIssuance: null,
      dailyNetSupplyChange: null,
      totalBurnedSinceMerge: null,
      totalBurnedSinceEIP1559: null,
      timestamp: null,
      blockNumber: null,
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
