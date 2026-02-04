const ETHERSCAN_API = "https://api.etherscan.io/v2/api";
const BEACONCHAIN_API = "https://beaconcha.in/api/v1";

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

async function fetchWithTimeout<T>(
  url: string,
  timeout = 5000,
  revalidate = 900 // 15 min default cache (matches use-chain-data)
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

// ============================================================================
// Beacon Chain Staking Data (from beaconcha.in)
// ============================================================================

interface BeaconEpochResponse {
  status: string;
  data: {
    epoch: number;
    validatorscount: number;
    totalvalidatorbalance: number; // in Gwei
    averagevalidatorbalance: number;
    finalized: boolean;
    eligibleether: number; // in Gwei
    globalparticipationrate: number;
    votedether: number; // in Gwei
  };
}

export interface EthStakingData {
  totalStaked: number | null;      // Total ETH staked (raw ETH, not wei)
  validatorCount: number | null;   // Number of active validators
  stakingRatio: number | null;     // % of supply staked (e.g., 28.4)
  avgValidatorBalance: number | null; // Average validator balance in ETH
  error?: string;
}

/**
 * Fetch ETH staking data from beaconcha.in
 * Returns total staked ETH and validator count
 * Note: Rate limited to 1 req/min on free tier
 */
export async function fetchEthStaking(): Promise<EthStakingData> {
  try {
    const url = `${BEACONCHAIN_API}/epoch/latest`;
    const data = await fetchWithTimeout<BeaconEpochResponse>(url);

    if (data.status !== "OK" || !data.data) {
      throw new Error("Invalid beaconcha.in response");
    }

    const { validatorscount, totalvalidatorbalance, averagevalidatorbalance } = data.data;

    // Convert Gwei to ETH (1 ETH = 1e9 Gwei)
    const totalStaked = totalvalidatorbalance / 1e9;
    const avgValidatorBalance = averagevalidatorbalance / 1e9;

    // To calculate staking ratio, we need total supply
    // Fetch it from Etherscan
    const supplyData = await fetchEthSupply();
    const stakingRatio = supplyData.ethSupply
      ? (totalStaked / supplyData.ethSupply) * 100
      : null;

    console.log(`[beaconchain] Staked: ${totalStaked.toFixed(0)} ETH, Validators: ${validatorscount}, Ratio: ${stakingRatio?.toFixed(2)}%`);

    return {
      totalStaked,
      validatorCount: validatorscount,
      stakingRatio,
      avgValidatorBalance,
    };
  } catch (error) {
    console.error("fetchEthStaking error:", error);
    return {
      totalStaked: null,
      validatorCount: null,
      stakingRatio: null,
      avgValidatorBalance: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
