-- V3 Migration: Add daily_summaries table and cleanup deprecated metrics
-- Run: supabase db push (or apply manually in Supabase dashboard)

-- 1. Create daily_summaries table for AI-generated market summaries
CREATE TABLE IF NOT EXISTS daily_summaries (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date DESC);

-- RLS: public read, service role write
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read summaries"
  ON daily_summaries FOR SELECT
  USING (true);

CREATE POLICY "Service write summaries"
  ON daily_summaries FOR ALL
  TO service_role
  USING (true);

-- 2. Delete deprecated metric keys (V2 → V3 migration)
-- These are no longer stored in V3 (fetched live or not needed)
DELETE FROM metrics WHERE key IN (
  -- Prices (now from ticker API, not stored)
  'btc_price',
  'eth_price',
  'sol_price',

  -- ETH burn/issuance (now fetched live from ultrasound.money)
  'eth_burn',
  'eth_issuance',

  -- V2 stored, V3 fetches live (15 min cache)
  'fear_greed',
  'btc_dominance',
  'stablecoin_total',
  'stablecoin_by_chain',
  'rwa_by_chain',

  -- V2 stored, V3 fetches daily (no storage)
  'eth_supply',
  'eth_tvl',
  'eth_etf_holdings_total',
  'eth_dat_holdings_total',
  'eth_burnt_total',

  -- V2 keys not used in V3
  'rwa_total',
  'rwa_by_category',
  'etf_holdings_total',
  'etf_holdings',
  'dat_holdings_total',
  'dat_holdings',
  'eth_btc_ratio',

  -- Macro (removed in V3)
  'dxy',
  'gold',
  'sp500',
  'nasdaq',
  'us_10y'
);

-- Verify: Only V3 keys should remain (3 metrics)
-- SELECT DISTINCT key FROM metrics ORDER BY key;
-- Expected: etf_flow_btc, etf_flow_eth, etf_flow_sol
