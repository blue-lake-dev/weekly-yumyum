// beaconcha.in API - ETH staking APR and issuance data
// Free public API, no key required
// Docs: https://beaconcha.in/api/v1/docs

const BEACONCHAIN_API = "https://beaconcha.in/api/v1";

interface EthStoreResponse {
  status: string;
  data: {
    apr: number; // Current day APR (e.g., 0.0285 = 2.85%)
    avgapr7d: number; // 7-day average APR
    avgapr31d: number; // 31-day average APR
    consensus_rewards_sum_wei: number; // Today's issuance (wei)
    avgconsensus_rewards7d_wei: number; // 7d avg daily issuance (wei)
    avgconsensus_rewards31d_wei: number; // 31d avg daily issuance (wei)
    day: number; // Day number since genesis
    day_start: string; // ISO timestamp
    day_end: string; // ISO timestamp
  };
}

export interface EthStakingData {
  // Staking APR
  apr: number | null; // Current APR as decimal (0.0285 = 2.85%)
  apr7d: number | null; // 7d average APR
  apr31d: number | null; // 31d average APR

  // Issuance (new ETH minted as staking rewards)
  issuance24h: number | null; // ETH issued in last 24h
  issuance7d: number | null; // ETH issued in last 7d (calculated from avg * 7)
  issuance7dDaily: number | null; // Average daily issuance over 7d

  // Metadata
  day: number | null;
  timestamp: string | null;
  error?: string;
}

async function fetchWithRetry<T>(
  url: string,
  retries = 3,
  timeout = 5000,
  revalidate = 900 // 15 min default cache (matches use-chain-data)
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        next: { revalidate },
      });
      clearTimeout(id);

      if (response.status === 429) {
        // Rate limited - wait and retry
        const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`[beaconchain] Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      clearTimeout(id);
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries - 1) {
        const waitTime = Math.pow(2, attempt) * 500;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error("Failed after retries");
}

// ============================================================================
// Epoch Data (staked amount, validator count)
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

export interface EthStakingAmountData {
  totalStaked: number | null;      // Total ETH staked (raw ETH, not wei)
  validatorCount: number | null;   // Number of active validators
  avgValidatorBalance: number | null; // Average validator balance in ETH
  error?: string;
}

/**
 * Fetch ETH staking data from beaconcha.in epoch endpoint
 * Returns total staked ETH and validator count
 * Note: Rate limited to 1 req/min on free tier
 */
export async function fetchEthStaking(): Promise<EthStakingAmountData> {
  try {
    const url = `${BEACONCHAIN_API}/epoch/latest`;
    const data = await fetchWithRetry<BeaconEpochResponse>(url);

    if (data.status !== "OK" || !data.data) {
      throw new Error("Invalid beaconcha.in response");
    }

    const { validatorscount, totalvalidatorbalance, averagevalidatorbalance } = data.data;

    // Convert Gwei to ETH (1 ETH = 1e9 Gwei)
    const totalStaked = totalvalidatorbalance / 1e9;
    const avgValidatorBalance = averagevalidatorbalance / 1e9;

    console.log(`[beaconchain] Staked: ${totalStaked.toFixed(0)} ETH, Validators: ${validatorscount}`);

    return {
      totalStaked,
      validatorCount: validatorscount,
      avgValidatorBalance,
    };
  } catch (error) {
    console.error("[beaconchain] fetchEthStaking error:", error);
    return {
      totalStaked: null,
      validatorCount: null,
      avgValidatorBalance: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// ETH.STORE Data (APR, issuance)
// ============================================================================

/**
 * Fetch ETH staking APR and issuance data from beaconcha.in ETH.STORE
 * Updates once per day, recommended cache: 30-60 min
 */
export async function fetchEthStakingRewards(): Promise<EthStakingData> {
  try {
    const response = await fetchWithRetry<EthStoreResponse>(
      `${BEACONCHAIN_API}/ethstore/latest`
    );

    if (response.status !== "OK" || !response.data) {
      throw new Error("Invalid response from beaconcha.in");
    }

    const data = response.data;

    // Convert wei to ETH (1 ETH = 1e18 wei)
    const issuance24h = data.consensus_rewards_sum_wei / 1e18;
    const issuance7dDaily = data.avgconsensus_rewards7d_wei / 1e18;
    const issuance7d = issuance7dDaily * 7;

    console.log(
      `[beaconchain] APR: ${(data.apr * 100).toFixed(2)}%, ` +
        `Issuance 24h: ${issuance24h.toFixed(0)} ETH, ` +
        `7d: ${issuance7d.toFixed(0)} ETH`
    );

    return {
      apr: data.apr,
      apr7d: data.avgapr7d,
      apr31d: data.avgapr31d,
      issuance24h,
      issuance7d,
      issuance7dDaily,
      day: data.day,
      timestamp: data.day_end,
    };
  } catch (error) {
    console.error("[beaconchain] fetchEthStakingRewards error:", error);
    return {
      apr: null,
      apr7d: null,
      apr31d: null,
      issuance24h: null,
      issuance7d: null,
      issuance7dDaily: null,
      day: null,
      timestamp: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
