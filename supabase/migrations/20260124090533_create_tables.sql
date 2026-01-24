-- YUMYUM V2 Database Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Metrics table (normalized: one row per metric per day)
CREATE TABLE metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  key VARCHAR(50) NOT NULL,
  value NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date, key)
);

-- Calendar events
CREATE TABLE calendar_events (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  source VARCHAR(20) NOT NULL CHECK (source IN ('fomc', 'economic', 'crypto', 'manual')),
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users (for Telegram OTP auth)
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  telegram_username VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_metrics_date ON metrics(date DESC);
CREATE INDEX idx_metrics_key ON metrics(key);
CREATE INDEX idx_metrics_date_key ON metrics(date, key);

CREATE INDEX idx_calendar_date ON calendar_events(date);
CREATE INDEX idx_calendar_source ON calendar_events(source);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- metrics: public read, service role write
CREATE POLICY "Public read metrics"
  ON metrics FOR SELECT
  USING (true);

CREATE POLICY "Service write metrics"
  ON metrics FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service update metrics"
  ON metrics FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service delete metrics"
  ON metrics FOR DELETE
  TO service_role
  USING (true);

-- calendar_events: public read visible only, service role write
CREATE POLICY "Public read visible events"
  ON calendar_events FOR SELECT
  USING (visible = true);

CREATE POLICY "Service read all events"
  ON calendar_events FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service write events"
  ON calendar_events FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service update events"
  ON calendar_events FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service delete events"
  ON calendar_events FOR DELETE
  TO service_role
  USING (true);

-- admins: service role only
CREATE POLICY "Service manage admins"
  ON admins FOR ALL
  TO service_role
  USING (true);
