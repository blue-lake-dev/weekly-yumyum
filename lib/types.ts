// Data source identifier
export type DataSource =
  | "binance"
  | "coingecko"
  | "alternative"
  | "yahoo"
  | "defillama"
  | "manual";

// Metric value with current and previous week values
export interface MetricValue {
  current: number | string | null;
  current_at?: string; // Timestamp of current value, e.g., "1/18 00:00 UTC"
  previous?: number | string | null; // Value from 7 days ago
  previous_at?: string; // Timestamp of previous value, e.g., "1/11 00:00 UTC"
  change_pct?: number; // Percentage change: ((current - previous) / previous) * 100
  error?: string;
  source?: DataSource;
  isManual?: boolean;
  sourceUrl?: string; // URL to view source data (for manual fields)
}

export interface StringMetricValue {
  current: string | null;
  current_at?: string;
  previous?: string | null;
  previous_at?: string;
  change_pct?: number;
  error?: string;
  source?: DataSource;
  isManual?: boolean;
  sourceUrl?: string;
}

export interface CryptoMarket {
  btc_price: MetricValue;
  eth_price: MetricValue;
  btc_dominance: MetricValue;
  btc_gold_ratio: MetricValue;
  eth_btc_ratio: MetricValue;
  fear_greed: MetricValue;
  mvrv: MetricValue;
  vol_7d: MetricValue;
  vol_30d: MetricValue;
  mstr: MetricValue;
  bmnr: MetricValue;
  cme_gap: MetricValue;
}

export interface LendingProtocol {
  name: string;
  borrow: MetricValue;
}

export interface FundFlow {
  btc_etf_flow: MetricValue;
  eth_etf_flow: MetricValue;
  stablecoin_supply: MetricValue;
  stablecoin_by_chain: Record<string, MetricValue>;
  cex_flow_btc: MetricValue;
  cex_flow_eth: MetricValue;
  miner_breakeven: MetricValue;
  defi_total_borrow: MetricValue;
  defi_top_protocols: LendingProtocol[];
  btc_oi: MetricValue;
  long_short_ratio: MetricValue;
  funding_rate: MetricValue;
}

export interface Macro {
  // Auto-fetched
  dxy: MetricValue;
  us_10y: MetricValue;
  gold: MetricValue;
  sp500: MetricValue;
  nasdaq: MetricValue;
  sp500_nasdaq_ratio: MetricValue;
  // Manual inputs (monthly releases)
  cpi: MetricValue;
  ppi: MetricValue;
  nfp: MetricValue;
  unemployment: MetricValue;
  sofr: MetricValue;
  fedwatch_rate: StringMetricValue;
}

export interface DashboardData {
  updated_at: string;
  crypto_market: CryptoMarket;
  fund_flow: FundFlow;
  macro: Macro;
}

// Manual fields that can be edited in the dashboard
export const MANUAL_FIELDS = [
  // Crypto market (previous value only)
  "crypto_market.btc_dominance.previous",
  // Fund flow
  "fund_flow.btc_etf_flow",
  "fund_flow.eth_etf_flow",
  "fund_flow.cex_flow_btc",
  "fund_flow.cex_flow_eth",
  "fund_flow.miner_breakeven",
  "fund_flow.btc_oi",
  "fund_flow.long_short_ratio",
  "fund_flow.funding_rate",
  // Macro
  "macro.cpi",
  "macro.ppi",
  "macro.nfp",
  "macro.unemployment",
  "macro.sofr",
  "macro.fedwatch_rate",
] as const;

export type ManualFieldPath = (typeof MANUAL_FIELDS)[number];

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FetchResult {
  updated_at: string;
  errors: string[];
}
