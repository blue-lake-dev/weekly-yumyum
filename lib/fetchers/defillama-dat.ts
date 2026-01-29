// DeFiLlama Digital Asset Treasuries (DAT) fetcher
// Returns ETH holdings from corporate treasuries

interface TreasuryResponse {
  name: string;
  tvl: number;
  chains?: string[];
  tokenBreakdowns?: {
    majors?: number; // ETH + BTC combined
    stablecoins?: number;
    ownTokens?: number;
  };
}

export interface DatHoldingsData {
  totalEthUsd: number | null; // Total ETH holdings in USD (approximation from majors)
  totalEth: number | null; // Total ETH holdings (calculated from USD / ETH price)
  companies: { name: string; ethUsd: number }[];
  error?: string;
}

/**
 * Fetch DAT (Digital Asset Treasuries) ETH holdings from DeFiLlama
 * Note: The API returns "majors" which is ETH+BTC combined, so this is an approximation
 * @param ethPrice - Current ETH price in USD (used to calculate ETH amount)
 */
export async function fetchDatHoldings(ethPrice: number): Promise<DatHoldingsData> {
  try {
    const response = await fetch("https://api.llama.fi/treasuries");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const treasuries: TreasuryResponse[] = await response.json();

    // Filter for Ethereum-chain treasuries with majors > 0
    const ethTreasuries = treasuries
      .filter((t) => {
        const hasMajors = (t.tokenBreakdowns?.majors ?? 0) > 0;
        const isEthChain = t.chains?.includes("Ethereum");
        return hasMajors && isEthChain;
      })
      .map((t) => ({
        name: t.name.replace(" (treasury)", "").replace(" (Treasury)", ""),
        ethUsd: t.tokenBreakdowns?.majors ?? 0,
      }))
      .sort((a, b) => b.ethUsd - a.ethUsd);

    // Sum up all majors
    const totalEthUsd = ethTreasuries.reduce((sum, t) => sum + t.ethUsd, 0);

    // Calculate ETH amount from USD value
    const totalEth = ethPrice > 0 ? totalEthUsd / ethPrice : null;

    return {
      totalEthUsd,
      totalEth,
      companies: ethTreasuries.slice(0, 10), // Top 10 for metadata
    };
  } catch (error) {
    console.error("fetchDatHoldings error:", error);
    return {
      totalEthUsd: null,
      totalEth: null,
      companies: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
