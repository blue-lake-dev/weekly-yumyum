const ETHERSCAN_API = "https://api.etherscan.io/v2/api";

interface EthSupply2Response {
  status: string;
  message: string;
  result: {
    EthSupply: string; // in wei
    Eth2Staking: string; // ETH2 staking rewards (in wei)
    BurntFees: string; // EIP-1559 burned fees (in wei)
    WithdrawnTotal: string; // Total withdrawn from beacon chain (in wei)
  };
}

// Convert wei to ETH
function weiToEth(wei: string): number {
  return Number(BigInt(wei) / BigInt(1e14)) / 10000; // Keep 4 decimal precision
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

export interface EthSupplyData {
  ethSupply: number | null; // Total circulating supply in ETH
  ethBurnt: number | null; // Total burnt fees in ETH (cumulative)
  eth2Staking: number | null; // Total staking rewards in ETH (cumulative)
  error?: string;
}

export async function fetchEthSupply(): Promise<EthSupplyData> {
  const apiKey = process.env.ETHERSCAN_API_KEY;

  if (!apiKey) {
    return {
      ethSupply: null,
      ethBurnt: null,
      eth2Staking: null,
      error: "ETHERSCAN_API_KEY not set",
    };
  }

  try {
    const url = `${ETHERSCAN_API}?chainid=1&module=stats&action=ethsupply2&apikey=${apiKey}`;
    const data = await fetchWithTimeout<EthSupply2Response>(url);

    if (data.status !== "1" || !data.result) {
      throw new Error(data.message || "Invalid response");
    }

    const { EthSupply, BurntFees, Eth2Staking } = data.result;

    // Calculate actual circulating supply:
    // EthSupply is pre-burn, pre-staking rewards
    // Actual = EthSupply + Eth2Staking - BurntFees
    const baseSupply = weiToEth(EthSupply);
    const stakingRewards = weiToEth(Eth2Staking);
    const burnt = weiToEth(BurntFees);

    const circulatingSupply = baseSupply + stakingRewards - burnt;

    return {
      ethSupply: circulatingSupply,
      ethBurnt: burnt,
      eth2Staking: stakingRewards,
    };
  } catch (error) {
    console.error("fetchEthSupply error:", error);
    return {
      ethSupply: null,
      ethBurnt: null,
      eth2Staking: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
