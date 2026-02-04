/**
 * Solana RPC + Dune - Supply, staking, fees, and inflation data
 * Uses public RPC endpoint (rate limited but free)
 * Uses Dune API for daily transaction fees (query ID: 6625740)
 */

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const DUNE_API = "https://api.dune.com/api/v1";
const DUNE_QUERY_ID = "6625740"; // User's SOL fees query

interface RpcResponse<T> {
  jsonrpc: string;
  id: number;
  result: T;
  error?: { code: number; message: string };
}

interface SupplyResult {
  value: {
    total: number; // Total supply in lamports
    circulating: number; // Circulating supply in lamports
    nonCirculating: number;
  };
}

interface VoteAccountsResult {
  current: Array<{ activatedStake: number }>;
  delinquent: Array<{ activatedStake: number }>;
}

interface InflationRateResult {
  total: number; // Annual inflation rate (e.g., 0.045 = 4.5%)
  validator: number;
  foundation: number;
  epoch: number;
}

// Dune API response types
interface DuneQueryResult {
  execution_id: string;
  state: string;
  result?: {
    rows: Array<{
      day: string;   // "2026-01-30 00:00:00.000 UTC"
      fee: number;   // Total fees in SOL
    }>;
  };
}

export interface SolanaSupplyData {
  totalSupply: number | null; // In SOL
  circulatingSupply: number | null; // In SOL
  stakedAmount: number | null; // In SOL
  stakingPct: number | null; // Percentage of circulating supply staked
  error?: string;
}

export interface SolanaInflationData {
  annualRate: number | null; // e.g., 0.045 = 4.5%
  annualRatePct: number | null; // e.g., 4.5
  epoch: number | null;
  error?: string;
}

export interface SolanaDailyFeesData {
  date: string | null;
  totalFeesSol: number | null;
  fees7d: Array<{ date: string; feesSol: number }> | null; // Last 7 days for charts
  error?: string;
}

async function rpcCall<T>(
  method: string,
  params: unknown[] = [],
  revalidate = 900 // 15 min default cache (matches use-chain-data)
): Promise<T> {
  const response = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`RPC HTTP ${response.status}`);
  }

  const data: RpcResponse<T> = await response.json();

  if (data.error) {
    throw new Error(`RPC Error: ${data.error.message}`);
  }

  return data.result;
}

/**
 * Fetch SOL supply and staking data from Solana RPC
 */
export async function fetchSolanaSupply(): Promise<SolanaSupplyData> {
  try {
    // Fetch supply
    const supplyResult = await rpcCall<SupplyResult>("getSupply", [{ commitment: "finalized" }]);

    const totalSupply = supplyResult.value.total / 1e9; // Convert lamports to SOL
    const circulatingSupply = supplyResult.value.circulating / 1e9;

    // Fetch vote accounts to calculate staked amount
    const voteAccounts = await rpcCall<VoteAccountsResult>("getVoteAccounts", [{ commitment: "finalized" }]);

    const currentStake = voteAccounts.current.reduce((sum, v) => sum + v.activatedStake, 0);
    const delinquentStake = voteAccounts.delinquent.reduce((sum, v) => sum + v.activatedStake, 0);
    const stakedAmount = (currentStake + delinquentStake) / 1e9;

    const stakingPct = (stakedAmount / circulatingSupply) * 100;

    console.log("[solana] Total supply:", totalSupply.toLocaleString(), "SOL");
    console.log("[solana] Circulating:", circulatingSupply.toLocaleString(), "SOL");
    console.log("[solana] Staked:", stakedAmount.toLocaleString(), "SOL", `(${stakingPct.toFixed(1)}%)`);

    return {
      totalSupply,
      circulatingSupply,
      stakedAmount,
      stakingPct,
    };
  } catch (error) {
    console.error("[solana] fetchSolanaSupply error:", error);
    return {
      totalSupply: null,
      circulatingSupply: null,
      stakedAmount: null,
      stakingPct: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch current inflation rate from Solana RPC
 */
export async function fetchSolanaInflation(): Promise<SolanaInflationData> {
  try {
    const result = await rpcCall<InflationRateResult>("getInflationRate");

    console.log("[solana] Inflation rate:", (result.total * 100).toFixed(2) + "%");
    console.log("[solana] Current epoch:", result.epoch);

    return {
      annualRate: result.total,
      annualRatePct: result.total * 100,
      epoch: result.epoch,
    };
  } catch (error) {
    console.error("[solana] fetchSolanaInflation error:", error);
    return {
      annualRate: null,
      annualRatePct: null,
      epoch: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch daily transaction fees from Dune Analytics
 * Query ID: 6625740 - User's SOL fees query
 * Returns 24h fees: today_partial + yesterday_complete
 * @param days - Number of days to fetch for history (default: 1)
 */
export async function fetchSolanaDailyFees(days: number = 1): Promise<SolanaDailyFeesData> {
  const apiKey = process.env.DUNE_API_KEY;

  if (!apiKey) {
    console.error("[solana] DUNE_API_KEY not set");
    return {
      date: null,
      totalFeesSol: null,
      fees7d: null,
      error: "DUNE_API_KEY not set",
    };
  }

  try {
    // Fetch enough rows: today + yesterday + requested days
    const limit = days + 2;
    const url = `${DUNE_API}/query/${DUNE_QUERY_ID}/results?limit=${limit}`;
    console.log("[solana] Fetching fees from Dune, days:", days);

    const response = await fetch(url, {
      headers: {
        "X-DUNE-API-KEY": apiKey,
      },
      next: { revalidate: 900 }, // 15 min cache (matches use-chain-data)
    });

    if (!response.ok) {
      throw new Error(`Dune API HTTP ${response.status}`);
    }

    const data: DuneQueryResult = await response.json();

    if (!data.result?.rows || data.result.rows.length < 2) {
      throw new Error("Not enough data returned from Dune");
    }

    const rows = data.result.rows;
    const today = new Date().toISOString().split("T")[0];

    // Find today's partial and yesterday's complete data
    const todayRow = rows.find((row) => row.day.split(" ")[0] === today);
    const yesterdayRow = rows.find((row) => row.day.split(" ")[0] !== today);

    if (!yesterdayRow) {
      throw new Error("No complete day data available");
    }

    const todayFees = todayRow?.fee ?? 0;
    const yesterdayFees = yesterdayRow.fee;

    // Simple 24h estimate: today partial + yesterday complete
    const fees24h = todayFees + yesterdayFees;

    console.log("[solana] Today partial:", todayFees.toFixed(2), "SOL");
    console.log("[solana] Yesterday complete:", yesterdayFees.toFixed(2), "SOL");
    console.log("[solana] 24h fees:", fees24h.toFixed(2), "SOL");

    // Build fees array for charts (complete days only, excluding today)
    const completeRows = rows.filter((row) => row.day.split(" ")[0] !== today);
    const fees7d = completeRows.slice(0, days).map((row) => ({
      date: row.day.split(" ")[0],
      feesSol: row.fee,
    }));

    return {
      date: today,
      totalFeesSol: fees24h,
      fees7d: days > 1 ? fees7d : null,
    };
  } catch (error) {
    console.error("[solana] fetchSolanaDailyFees error:", error);
    return {
      date: null,
      totalFeesSol: null,
      fees7d: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
