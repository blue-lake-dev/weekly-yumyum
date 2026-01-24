const DEFILLAMA_API = "https://api.llama.fi";

// ETH + L2 chains to track
const ETH_CHAINS = [
  "Ethereum",
  "Arbitrum",
  "Optimism",
  "Base",
  "Polygon",
  "zkSync Era",
  "Linea",
  "Scroll",
  "Mantle",
  "Blast",
];

interface DefiLlamaProtocol {
  name: string;
  category: string;
  chains: string[];
  chainTvls: Record<string, number>;
  tvl: number;
}

async function fetchWithTimeout<T>(url: string, timeout = 30000): Promise<T> {
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

export interface RwaByChainData {
  total: number | null; // Total RWA TVL on ETH + L2s
  byChain: Record<string, number> | null; // { Ethereum: 5000000000, Arbitrum: 100000000, ... }
  topProtocols: Array<{ name: string; tvl: number; chains: string[] }> | null;
  error?: string;
}

export async function fetchRwaByChain(): Promise<RwaByChainData> {
  try {
    const protocols = await fetchWithTimeout<DefiLlamaProtocol[]>(
      `${DEFILLAMA_API}/protocols`
    );

    // Filter RWA category
    const rwaProtocols = protocols.filter((p) => p.category === "RWA");

    // Aggregate by chain
    const byChain: Record<string, number> = {};
    let total = 0;
    const protocolsOnEth: Array<{ name: string; tvl: number; chains: string[] }> = [];

    for (const protocol of rwaProtocols) {
      const chainTvls = protocol.chainTvls || {};
      let protocolEthTvl = 0;
      const protocolChains: string[] = [];

      for (const chain of ETH_CHAINS) {
        if (chainTvls[chain]) {
          const tvl = chainTvls[chain];
          byChain[chain] = (byChain[chain] || 0) + tvl;
          protocolEthTvl += tvl;
          protocolChains.push(chain);
        }
      }

      if (protocolEthTvl > 0) {
        total += protocolEthTvl;
        protocolsOnEth.push({
          name: protocol.name,
          tvl: protocolEthTvl,
          chains: protocolChains,
        });
      }
    }

    // Sort protocols by TVL and get top 10
    protocolsOnEth.sort((a, b) => b.tvl - a.tvl);
    const topProtocols = protocolsOnEth.slice(0, 10);

    // Sort byChain by TVL
    const sortedByChain = Object.fromEntries(
      Object.entries(byChain).sort((a, b) => b[1] - a[1])
    );

    return {
      total,
      byChain: sortedByChain,
      topProtocols,
    };
  } catch (error) {
    console.error("fetchRwaByChain error:", error);
    return {
      total: null,
      byChain: null,
      topProtocols: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
