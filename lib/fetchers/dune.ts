const DUNE_API = "https://api.dune.com/api/v1";

// Query IDs from hildobby's ETH ETF dashboard
const ETH_ETF_QUERY_ID = 3944634;

interface DuneQueryResponse {
  execution_id?: string;
  state?: string;
  result?: {
    rows: EthEtfRow[];
    metadata?: {
      column_names: string[];
      column_types: string[];
    };
  };
  error?: string;
}

// Row structure from query 3944634
interface EthEtfRow {
  etf_ticker: string;
  plain_issuer: string;
  tvl: number; // ETH holdings
  usd_value: number;
  percentage_of_total: number;
  percentage_fee: string;
}

async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(id);
  }
}

export interface EtfHolding {
  ticker: string;
  issuer: string;
  eth: number;
  usd: number;
  percentage: number;
}

export interface EtfHoldingsData {
  totalEth: number | null;
  totalUsd: number | null;
  holdings: EtfHolding[] | null;
  error?: string;
}

export async function fetchEthEtfHoldings(): Promise<EtfHoldingsData> {
  const apiKey = process.env.DUNE_API_KEY || process.env.VITE_DUNE_API_KEY;

  if (!apiKey) {
    return {
      totalEth: null,
      totalUsd: null,
      holdings: null,
      error: "DUNE_API_KEY not set",
    };
  }

  try {
    const url = `${DUNE_API}/query/${ETH_ETF_QUERY_ID}/results`;
    const data = await fetchWithTimeout<DuneQueryResponse>(url, {
      headers: { "x-dune-api-key": apiKey },
    });

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.result?.rows?.length) {
      throw new Error("No data returned from Dune");
    }

    const rows = data.result.rows;

    // Build holdings array and calculate totals
    const holdings: EtfHolding[] = [];
    let totalEth = 0;
    let totalUsd = 0;

    for (const row of rows) {
      const eth = Number(row.tvl) || 0;
      const usd = Number(row.usd_value) || 0;

      holdings.push({
        ticker: row.etf_ticker,
        issuer: row.plain_issuer,
        eth,
        usd,
        percentage: row.percentage_of_total,
      });

      totalEth += eth;
      totalUsd += usd;
    }

    // Sort by holdings descending
    holdings.sort((a, b) => b.eth - a.eth);

    return {
      totalEth,
      totalUsd,
      holdings,
    };
  } catch (error) {
    console.error("fetchEthEtfHoldings error:", error);
    return {
      totalEth: null,
      totalUsd: null,
      holdings: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
