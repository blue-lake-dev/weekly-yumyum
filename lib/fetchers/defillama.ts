import type { MetricValue, LendingProtocol } from "../types";

const DEFILLAMA_API = "https://api.llama.fi";
const STABLECOINS_API = "https://stablecoins.llama.fi";

interface ProtocolData {
  name: string;
  slug: string;
  tvl: Array<{ date: number; totalLiquidityUSD: number }>;
  chainTvls?: Record<string, number>;
  currentChainTvls?: Record<string, number>;
}

interface StablecoinData {
  peggedAssets: Array<{
    name: string;
    chainCirculating: Record<string, { current: { peggedUSD: number } }>;
  }>;
}

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

// Fetch total stablecoin supply
export async function fetchStablecoinSupply(): Promise<MetricValue> {
  try {
    // API returns array directly with totalCirculating.peggedUSD
    const data = await fetchWithTimeout<Array<{ date: string; totalCirculating: { peggedUSD: number } }>>(
      `${STABLECOINS_API}/stablecoincharts/all`
    );

    if (!data || data.length === 0) {
      throw new Error("No stablecoin data");
    }

    const latest = data[data.length - 1];
    const current = latest.totalCirculating.peggedUSD / 1e9; // Billions
    return { current, source: "defillama" };
  } catch (error) {
    console.error("fetchStablecoinSupply error:", error);
    return { current: null, error: "Failed to fetch stablecoin supply", source: "defillama" };
  }
}

// Fetch stablecoin by specific chain
export async function fetchStablecoinByChain(chain: string): Promise<MetricValue> {
  try {
    const data = await fetchWithTimeout<StablecoinData>(
      `${STABLECOINS_API}/stablecoins?includePrices=false`
    );

    let total = 0;
    for (const asset of data.peggedAssets) {
      const chainData = asset.chainCirculating[chain];
      if (chainData?.current?.peggedUSD) {
        total += chainData.current.peggedUSD;
      }
    }

    const current = total / 1e9; // Billions
    return { current, source: "defillama" };
  } catch (error) {
    console.error(`fetchStablecoinByChain(${chain}) error:`, error);
    return { current: null, error: `Failed to fetch ${chain} stablecoin`, source: "defillama" };
  }
}

// Lending protocols to track (sorted by typical borrow volume)
const LENDING_PROTOCOLS = [
  { slug: "aave-v3", name: "Aave" },
  { slug: "morpho-blue", name: "Morpho" },
  { slug: "spark", name: "Spark" },
  { slug: "compound-v3", name: "Compound" },
  { slug: "justlend", name: "JustLend" },
];

// Fetch single protocol total borrowed amount
async function fetchProtocolBorrowed(slug: string): Promise<number | null> {
  try {
    const data = await fetchWithTimeout<ProtocolData>(
      `${DEFILLAMA_API}/protocol/${slug}`
    );

    // Sum all borrowed amounts from currentChainTvls (keys ending with "-borrowed")
    if (!data.currentChainTvls) {
      return null;
    }

    let totalBorrowed = 0;
    for (const [key, value] of Object.entries(data.currentChainTvls)) {
      if (key.endsWith("-borrowed") && typeof value === "number") {
        totalBorrowed += value;
      }
    }

    return totalBorrowed > 0 ? totalBorrowed : null;
  } catch (error) {
    console.error(`fetchProtocolBorrowed(${slug}) error:`, error);
    return null;
  }
}

// Fetch top 3 lending protocols by borrowed amount
export async function fetchTopLendingProtocols(): Promise<{
  total: MetricValue;
  protocols: LendingProtocol[];
}> {
  try {
    const results = await Promise.all(
      LENDING_PROTOCOLS.map(async (p) => {
        const borrowed = await fetchProtocolBorrowed(p.slug);
        return { name: p.name, borrowed };
      })
    );

    // Filter out nulls and sort by borrowed amount
    const validResults = results
      .filter((r) => r.borrowed !== null)
      .sort((a, b) => (b.borrowed || 0) - (a.borrowed || 0));

    // Calculate total and get top 3
    const total = validResults.reduce((sum, r) => sum + (r.borrowed || 0), 0);
    const top3 = validResults.slice(0, 3);

    return {
      total: { current: total / 1e9, source: "defillama" }, // Billions
      protocols: top3.map((p) => ({
        name: p.name,
        borrow: { current: (p.borrowed || 0) / 1e9, source: "defillama" as const },
      })),
    };
  } catch (error) {
    console.error("fetchTopLendingProtocols error:", error);
    return {
      total: { current: null, error: "Failed to fetch lending data", source: "defillama" },
      protocols: [],
    };
  }
}

// ETF Flow data - placeholder (requires specialized API)
export async function fetchBtcEtfFlow(): Promise<MetricValue> {
  return {
    current: null,
    error: "ETF flow requires manual input",
    source: "manual",
    isManual: true,
  };
}

export async function fetchEthEtfFlow(): Promise<MetricValue> {
  return {
    current: null,
    error: "ETF flow requires manual input",
    source: "manual",
    isManual: true,
  };
}
