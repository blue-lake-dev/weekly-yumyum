const DUNE_API = "https://api.dune.com/api/v1";

// Query IDs from hildobby's ETF dashboards
const ETH_ETF_QUERY_ID = 3944634;
const BTC_ETF_QUERY_ID = 3378009;

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

// Row structure from query 3378009 (BTC ETF)
// Note: tvl is string in scientific notation (e.g., "8.195E5")
interface BtcEtfRow {
  etf_ticker: string;
  plain_issuer: string;
  tvl: string; // BTC holdings in scientific notation
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

export interface BtcEtfHolding {
  ticker: string;
  issuer: string;
  btc: number;
  usd: number;
  percentage: number;
}

export interface BtcEtfHoldingsData {
  totalBtc: number | null;
  totalUsd: number | null;
  holdings: BtcEtfHolding[] | null;
  error?: string;
}

export async function fetchEthEtfHoldings(): Promise<EtfHoldingsData> {
  const apiKey = process.env.DUNE_API_KEY;

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

export async function fetchBtcEtfHoldings(): Promise<BtcEtfHoldingsData> {
  const apiKey = process.env.DUNE_API_KEY;

  if (!apiKey) {
    return {
      totalBtc: null,
      totalUsd: null,
      holdings: null,
      error: "DUNE_API_KEY not set",
    };
  }

  try {
    const url = `${DUNE_API}/query/${BTC_ETF_QUERY_ID}/results`;
    const data = await fetchWithTimeout<{ result?: { rows: BtcEtfRow[] }; error?: string }>(url, {
      headers: { "x-dune-api-key": apiKey },
    });

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.result?.rows?.length) {
      throw new Error("No data returned from Dune");
    }

    const rows = data.result.rows;

    // Dedupe by ticker (keep first row per ticker)
    const seenTickers = new Set<string>();
    const dedupedRows: BtcEtfRow[] = [];
    for (const row of rows) {
      if (!seenTickers.has(row.etf_ticker)) {
        seenTickers.add(row.etf_ticker);
        dedupedRows.push(row);
      }
    }

    // Build holdings array and calculate totals
    const holdings: BtcEtfHolding[] = [];
    let totalBtc = 0;
    let totalUsd = 0;

    for (const row of dedupedRows) {
      // Parse scientific notation (e.g., "8.195E5" → 819500)
      const btc = parseFloat(row.tvl) || 0;
      const usd = Number(row.usd_value) || 0;

      holdings.push({
        ticker: row.etf_ticker,
        issuer: row.plain_issuer,
        btc,
        usd,
        percentage: row.percentage_of_total,
      });

      totalBtc += btc;
      totalUsd += usd;
    }

    // Sort by holdings descending
    holdings.sort((a, b) => b.btc - a.btc);

    return {
      totalBtc,
      totalUsd,
      holdings,
    };
  } catch (error) {
    console.error("fetchBtcEtfHoldings error:", error);
    return {
      totalBtc: null,
      totalUsd: null,
      holdings: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
