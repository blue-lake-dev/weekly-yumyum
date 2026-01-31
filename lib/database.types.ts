// Supabase database types for V3

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

export interface DailySummaryRow {
  id: number;
  date: string;
  summary: string;
  created_at: string;
}

// Insert types (omit auto-generated fields)
export type MetricInsert = Omit<MetricRow, "id" | "created_at">;
export type CalendarEventInsert = Omit<CalendarEventRow, "id" | "created_at">;
export type AdminInsert = Omit<AdminRow, "id" | "created_at">;
export type DailySummaryInsert = Omit<DailySummaryRow, "id" | "created_at">;

// Update types (all fields optional)
export type MetricUpdate = Partial<MetricInsert>;
export type CalendarEventUpdate = Partial<CalendarEventInsert>;
export type AdminUpdate = Partial<AdminInsert>;
export type DailySummaryUpdate = Partial<DailySummaryInsert>;

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
      daily_summaries: {
        Row: DailySummaryRow;
        Insert: DailySummaryInsert;
        Update: DailySummaryUpdate;
      };
    };
  };
}

// Metric keys for V3 (3 metrics/day stored in Supabase)
// Everything else fetched live - no storage needed
export const METRIC_KEYS = {
  // ETF Flows (stored daily for 7d charts)
  etf_flow_btc: "etf_flow_btc",
  etf_flow_eth: "etf_flow_eth",
  etf_flow_sol: "etf_flow_sol",
} as const;

export type MetricKey = (typeof METRIC_KEYS)[keyof typeof METRIC_KEYS];
