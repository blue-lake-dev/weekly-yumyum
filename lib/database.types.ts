// Supabase database types for V2

// Calendar event sources
export type CalendarEventSource = "fomc" | "economic" | "crypto" | "manual";

// Database row types
export interface MetricRow {
  id: number;
  date: string; // DATE as ISO string (YYYY-MM-DD)
  key: string;
  value: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CalendarEventRow {
  id: number;
  date: string;
  title: string;
  description: string | null;
  source: CalendarEventSource;
  visible: boolean;
  created_at: string;
}

export interface AdminRow {
  id: number;
  telegram_id: number;
  telegram_username: string | null;
  created_at: string;
}

// Insert types (omit auto-generated fields)
export type MetricInsert = Omit<MetricRow, "id" | "created_at">;
export type CalendarEventInsert = Omit<CalendarEventRow, "id" | "created_at">;
export type AdminInsert = Omit<AdminRow, "id" | "created_at">;

// Update types (all fields optional)
export type MetricUpdate = Partial<MetricInsert>;
export type CalendarEventUpdate = Partial<CalendarEventInsert>;
export type AdminUpdate = Partial<AdminInsert>;

// Supabase Database type (for typed client)
export interface Database {
  public: {
    Tables: {
      metrics: {
        Row: MetricRow;
        Insert: MetricInsert;
        Update: MetricUpdate;
      };
      calendar_events: {
        Row: CalendarEventRow;
        Insert: CalendarEventInsert;
        Update: CalendarEventUpdate;
      };
      admins: {
        Row: AdminRow;
        Insert: AdminInsert;
        Update: AdminUpdate;
      };
    };
  };
}

// Metric keys for V2 (from v2-plan.md)
export const METRIC_KEYS = {
  // ETH Core
  eth_supply: "eth_supply",
  eth_burn: "eth_burn",
  eth_issuance: "eth_issuance",
  eth_price: "eth_price",

  // RWA
  rwa_total: "rwa_total",
  rwa_by_category: "rwa_by_category", // metadata: {gold, treasuries, stocks, ...}

  // Holdings
  etf_holdings_total: "etf_holdings_total",
  etf_holdings: "etf_holdings", // metadata: [{ticker, value}, ...]
  dat_holdings_total: "dat_holdings_total",
  dat_holdings: "dat_holdings", // metadata: [{name, value}, ...]

  // Flows
  etf_flow_eth: "etf_flow_eth",
  etf_flow_btc: "etf_flow_btc",

  // TVL
  eth_tvl: "eth_tvl",

  // Market
  btc_price: "btc_price",
  btc_dominance: "btc_dominance",
  fear_greed: "fear_greed",
  eth_btc_ratio: "eth_btc_ratio",

  // Stablecoins
  stablecoin_total: "stablecoin_total",
  stablecoin_by_chain: "stablecoin_by_chain", // metadata: {ethereum, tron, bsc, ...}

  // Macro
  dxy: "dxy",
  gold: "gold",
  sp500: "sp500",
  nasdaq: "nasdaq",
  us_10y: "us_10y",
} as const;

export type MetricKey = (typeof METRIC_KEYS)[keyof typeof METRIC_KEYS];
