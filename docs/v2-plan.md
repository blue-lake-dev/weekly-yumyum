# YUMYUM V2 - Public Community Platform

> Migration from internal dashboard to public ETH-focused community platform

---

## 1. Project Overview

### Current State (V1)
- Internal dashboard for 3 team members
- 40+ metrics across Crypto Market, Fund Flow, Macro
- localStorage persistence
- 15 manual input fields
- Single `/api/fetch-data` route

### New Direction (V2)
- **Public** community platform for 얌얌코인 YouTube/Telegram audience
- **ETH-focused** metrics (team's core focus)
- Supabase backend (DB + Realtime + Auth)
- Daily auto-fetch via cron
- Calendar + Live chat features

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        External APIs                            │
│  (Etherscan, DeFiLlama, Dune, CoinGecko, Farside scraper)      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    (fetch once: cron or admin)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                │
│  ┌─────────────┐  ┌─────────────────┐  ┌──────────────────┐    │
│  │   metrics   │  │ calendar_events │  │  Realtime Chat   │    │
│  │ (normalized)│  │ (auto + manual) │  │  (no persist)    │    │
│  └─────────────┘  └─────────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    (read: all users)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                           │
│     Public: Dashboard, Calendar, Chat                           │
│     Admin: Fetch trigger, Calendar manage                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Sources

### Original Dashboard (V1) - 40+ Metrics

| Section | Metric | Source | Status in V2 |
|---------|--------|--------|--------------|
| **Crypto Market** | BTC Price | Binance | ✅ Keep |
| | ETH Price | Binance | ✅ Keep |
| | BTC Dominance | CoinGecko | ✅ Keep |
| | BTC/Gold Ratio | Calculated | ❌ Remove |
| | ETH/BTC Ratio | Calculated | ✅ Keep |
| | Fear & Greed | Alternative.me | ✅ Keep |
| | Realized Vol 7D/30D | Yahoo Finance | ❌ Remove |
| | MSTR, BMNR | Yahoo Finance | ❌ Remove |
| | CME Gap | Yahoo Finance | ❌ Remove |
| **Fund Flow** | BTC/ETH ETF Flow | Manual | 🔄 Farside scraper |
| | Stablecoin Supply | DeFiLlama | ✅ Keep |
| | Stablecoin by Chain | DeFiLlama | ✅ Keep |
| | CEX Net Flow | Manual (CoinGlass) | ❌ Remove (paid) |
| | Miner Breakeven | Manual | ❌ Remove |
| | DeFi Total Borrow | DeFiLlama | ❌ Remove |
| | BTC Open Interest | Manual (CoinGlass) | ❌ Remove (paid) |
| | Long/Short Ratio | Manual (CoinGlass) | ❌ Remove (paid) |
| | Funding Rate | Binance | ❌ Remove |
| **Macro** | CPI, PPI, NFP, Unemployment | Manual | ⏸️ Keep fetcher, display TBD |
| | FedWatch Rate | Manual | ❌ Remove |
| | SOFR | Manual | ❌ Remove |
| | DXY | Yahoo Finance | ⏸️ Keep fetcher, display TBD |
| | US 10Y | Yahoo Finance | ⏸️ Keep fetcher, display TBD |
| | Gold | Yahoo Finance | ⏸️ Keep fetcher, display TBD |
| | S&P 500 | Yahoo Finance | ⏸️ Keep fetcher, display TBD |
| | NASDAQ | Yahoo Finance | ⏸️ Keep fetcher, display TBD |

### New Dashboard (V2) - ETH-Focused Metrics

| Category | Metric | Source | API/Method |
|----------|--------|--------|------------|
| **ETH Core** | ETH Supply | Etherscan | `ethsupply2` → calculate: `EthSupply + Eth2Staking - BurntFees` |
| | ETH Daily Burn | ultrasound.money | `/api/v2/fees/gauge-rates` → `d1.burn_rate_yearly.eth / 365` |
| | ETH Daily Issuance | ultrasound.money | `/api/v2/fees/gauge-rates` → `d1.issuance_rate_yearly.eth / 365` |
| | ETH Price | CoinGecko | `/simple/price` |
| **RWA** | RWA Total by Category | rwa.xyz | Admin CSV upload → `rwa-token-timeseries-export.csv` (excl. Stablecoins) |
| | RWA by Chain (ETH + L2) | DeFiLlama | `/protocols` → filter `category=RWA` → aggregate `chainTvls` |
| **Holdings** | ETF Holdings Total | Dune | Query `3944634` |
| | ETF Holdings by Ticker | Dune | Query `3944634` (ETHA, ETHE, etc.) |
| | DAT Holdings | DeFiLlama | `/treasuries` endpoint |
| **Flows** | ETH ETF Daily Flow | Farside | Puppeteer scraper (`farside.co.uk/eth/`) |
| | BTC ETF Daily Flow | Farside | Puppeteer scraper (`farside.co.uk/btc/`) |
| **TVL** | ETH DApp TVL | DeFiLlama | `/v2/chains` |
| **Market** | BTC Price | CoinGecko | `/simple/price` |
| | BTC Dominance | CoinGecko | `/global` |
| | Fear & Greed Index | Alternative.me | `/fng/` |
| | ETH/BTC Ratio | Calculated | ETH price / BTC price |
| **Stablecoins** | Total Supply | DeFiLlama | `stablecoins.llama.fi/stablecoins` |
| | Supply by Chain | DeFiLlama | Same endpoint, filter by chain |
| **Macro** | DXY, Gold, S&P, NASDAQ | Yahoo Finance | Existing fetcher (display TBD) |

### API Keys Required

| Service | Key | Free Tier |
|---------|-----|-----------|
| Etherscan | `ETHERSCAN_API_KEY` | 5 calls/sec, 100K/day |
| Dune | `DUNE_API_KEY` | 2500 credits/month |
| DeFiLlama | None | Unlimited |
| CoinGecko | None (or demo key) | 10-30 calls/min |
| Alternative.me | None | Unlimited |
| ultrasound.money | None | Unlimited |
| rwa.xyz | Account required | CSV download (API pending approval) |

### Data Source Notes

- **rwa.xyz CSV** provides RWA by category (Treasury, Private Credit, Commodities, etc.) but excludes Stablecoins since DeFiLlama provides better chain-level breakdown
- **DeFiLlama** is primary source for: Stablecoins by chain, RWA by chain, TVL
- Categories in rwa.xyz CSV: US Treasury Debt, non-US Government Debt, Corporate Bonds, Private Credit, Public Equity, Private Equity, Commodities, Structured Credit, Institutional Alternative Funds, Actively-Managed Strategies

---

## 4. Database Schema

### Option A: Normalized (Chosen)

```sql
-- Main metrics table
CREATE TABLE metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  key VARCHAR(50) NOT NULL,
  value NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date, key)
);

CREATE INDEX idx_metrics_date ON metrics(date DESC);
CREATE INDEX idx_metrics_key ON metrics(key);

-- Calendar events
CREATE TABLE calendar_events (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  source VARCHAR(20) NOT NULL,  -- 'fomc' | 'economic' | 'crypto' | 'manual'
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_date ON calendar_events(date);

-- Admin users (for reference, actual auth via Telegram OTP)
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  telegram_username VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Metrics Keys

```
-- ETH Core
eth_supply, eth_burn, eth_issuance, eth_price

-- RWA (excl. Stablecoins - tracked separately)
rwa_total, rwa_by_category (metadata: {treasuries, private_credit, commodities, corporate_bonds, ...})
rwa_by_chain (metadata: {ethereum, arbitrum, base, optimism, polygon, ...})

-- Holdings
etf_holdings_total, etf_holdings (metadata: [{ticker, value}, ...])
dat_holdings_total, dat_holdings (metadata: [{name, value}, ...])

-- Flows
etf_flow_eth, etf_flow_btc

-- TVL
eth_tvl

-- Market
btc_price, btc_dominance, fear_greed, eth_btc_ratio

-- Stablecoins
stablecoin_total, stablecoin_by_chain (metadata: {ethereum, tron, bsc, ...})

-- Macro (display TBD)
dxy, gold, sp500, nasdaq, us_10y
```

### Row Level Security

```sql
-- metrics: public read, service role write
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON metrics FOR SELECT USING (true);
CREATE POLICY "Service write" ON metrics FOR ALL USING (auth.role() = 'service_role');

-- calendar_events: public read, service role write
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON calendar_events FOR SELECT USING (visible = true);
CREATE POLICY "Service write" ON calendar_events FOR ALL USING (auth.role() = 'service_role');
```

---

## 5. Pages & Features

### Routes

| Route | Access | Content |
|-------|--------|---------|
| `/` | Public | Market dashboard (landing) |
| `/calendar` | Public | Economy calendar (7-day default) |
| `/about` | Public | Channel info, team |
| `/admin` | Protected | Fetch trigger, calendar manage |

### Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│  🍠 YUMYUM    [시장지표]  [일정]  [About]    📺 💬   [Admin 🔒] │
└─────────────────────────────────────────────────────────────────┘
                                               ↑   ↑
                                           YouTube  Telegram
```

### Admin Panel Features

| Feature | Description |
|---------|-------------|
| 🔄 Fetch Now | Manual trigger to fetch all data |
| 📤 RWA Upload | Upload rwa.xyz CSV for RWA category data |
| 📅 Calendar | Show/hide events, add custom events |
| 💬 Chat (later) | Clear chat, basic moderation |

### Chat

- **Realtime only** (no persistence, ephemeral)
- **Anonymous** with random meme names (용감한호랑이, 행복한고래, etc.)
- **Floating UI** bottom-right, collapsible
- Default: expanded on desktop, minimized on mobile

### Calendar

- **Default view:** 7-day upcoming
- **Expand button:** Full monthly calendar
- **Sources:** FOMC schedule, economic calendar, CoinMarketCal
- **Admin:** Toggle visibility, add custom events
- **Storage:** Keep all history (~150KB/year)

---

## 6. UI/UX Decisions

### Design System (unchanged)
- Notion-style, light mode only (dark toggle later)
- Inter (English) + Pretendard (Korean)
- tabular-nums for numbers
- Color coding: 🟢 up, 🔴 down, ⚪ neutral

### Visualization by Metric

| Metric Type | Visualization | History |
|-------------|---------------|---------|
| ETH/BTC Price | Sparkline + value + % | 7-day |
| ETH Supply | Value only | Today |
| ETH Burn | Bar chart (daily) | 7-day |
| ETH Issuance | Value only | Today |
| RWA Total | Sparkline + value | 7-day |
| RWA by Category | Horizontal bar chart | Today |
| ETF Holdings Total | Sparkline + value | 7-day |
| ETF by Ticker | Horizontal bar chart | Today |
| ETF Flows | Bar chart (green/red) | 7-day |
| Fear & Greed | Gauge + sparkline | 7-day |
| BTC Dominance | Progress bar + sparkline | 7-day |
| Stablecoin Total | Sparkline + value | 7-day |
| Stablecoin by Chain | Horizontal bar chart | Today |
| Macro (DXY, Gold, etc.) | Sparkline + value | 7-day |

### Price Data
- **Granularity:** Daily close (midnight UTC)
- **Points:** 7 daily closes for sparklines
- MVP first, add granularity later if needed

---

## 7. Authentication

### Telegram OTP Flow

```
1. Admin visits /admin
2. Enters Telegram username
3. Bot (@yumyumcoin_admin_bot) sends 6-digit OTP
4. Admin enters OTP on site
5. Server verifies → issues JWT
6. JWT stored in httpOnly cookie (7-day expiry)
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Telegram Bot
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_BOT_USERNAME=yumyumcoin_admin_bot

# Auth
JWT_SECRET=xxx
ADMIN_TELEGRAM_IDS=123456789,987654321,555555555

# API Keys
ETHERSCAN_API_KEY=xxx
DUNE_API_KEY=xxx
```

---

## 8. Data Fetching Strategy

### Cron + Manual

| Trigger | When | Action |
|---------|------|--------|
| Vercel Cron | 1x daily (e.g., 09:00 KST) | Auto-fetch all metrics |
| Admin button | Anytime | Manual fetch all metrics |

### Day 1 Historical Fetch

```typescript
async function fetchData() {
  const existingRows = await supabase
    .from('metrics')
    .select('date')
    .limit(1);

  if (existingRows.length === 0) {
    // First run: fetch 7 days history
    await fetch7DaysHistory();
  } else {
    // Normal run: fetch today only
    await fetchToday();
  }
}
```

### APIs with Historical Support

| Source | Historical? | Method |
|--------|-------------|--------|
| DeFiLlama | ✅ Yes | `/historical` endpoints |
| CoinGecko | ✅ Yes | `/coins/{id}/market_chart` |
| Farside | ✅ Yes | Table has all dates |
| Etherscan | ❌ No | Current only (build from Day 1) |
| Dune | ⚠️ Depends | Query-specific |

---

## 9. Migration Steps

### Phase 1: Setup
- [x] Create Supabase project
- [x] Create tables (metrics, calendar_events, admins)
- [x] Set up RLS policies
- [ ] Create Telegram bot (@yumyumcoin_admin_bot)
- [x] Add environment variables
- [x] Add Supabase client (`lib/supabase.ts`)
- [x] Add database types (`lib/database.types.ts`)

### Phase 2: Backend
- [x] Create new fetchers
  - [x] Etherscan (`lib/fetchers/etherscan.ts`) - ETH supply
  - [x] ultrasound.money (`lib/fetchers/ultrasound.ts`) - ETH burn/issuance
  - [x] Dune (`lib/fetchers/dune.ts`) - ETF holdings
  - [x] Farside (`lib/fetchers/farside.ts`) - ETF flows
  - [x] rwa.xyz (`lib/fetchers/rwa-xyz.ts`) - RWA by category
- [x] Add DeFiLlama RWA fetcher (`lib/fetchers/defillama-rwa.ts`) - RWA by chain
- [ ] Create `/api/cron/fetch` route
- [ ] Create `/api/admin/fetch` route (manual trigger)
- [ ] Implement JWT auth middleware

### Phase 3: Frontend
- [ ] Remove localStorage logic
- [ ] Add Supabase client
- [ ] Update dashboard to read from Supabase
- [ ] Implement new visualizations (sparklines, bar charts)
- [ ] Add social links to header (YouTube, Telegram icons)

### Phase 4: New Features
- [ ] Create `/calendar` page
- [ ] Create `/admin` page
- [ ] Implement Telegram OTP flow
- [ ] Add Supabase Realtime chat
- [ ] Implement random meme name generator

### Phase 5: Deploy
- [ ] Configure Vercel cron job
- [ ] Test Day 1 historical fetch
- [ ] Verify all API integrations
- [ ] Deploy to production

---

## 10. File Structure (New)

```
/app
  /api
    /cron
      /fetch
        route.ts          # Daily cron job
    /admin
      /fetch
        route.ts          # Manual fetch trigger
      /rwa-upload
        route.ts          # Parse & store rwa.xyz CSV
      /calendar
        route.ts          # Calendar CRUD
    /auth
      /telegram
        route.ts          # OTP verification
  /admin
    page.tsx              # Admin panel
  /calendar
    page.tsx              # Public calendar
  /about
    page.tsx              # Channel info
  layout.tsx
  page.tsx                # Dashboard (landing)

/components
  /ui
    DataTable.tsx
    Sparkline.tsx         # NEW
    BarChart.tsx          # NEW
    Gauge.tsx             # NEW
    ChatWidget.tsx        # NEW
    Calendar.tsx          # NEW
  Header.tsx              # Update: add social links

/lib
  supabase.ts             # NEW: Supabase client
  auth.ts                 # NEW: JWT helpers
  telegram.ts             # NEW: Bot API
  fetchers/
    etherscan.ts          # NEW: ETH total supply
    ultrasound.ts         # NEW: ETH daily burn/issuance
    dune.ts               # NEW: ETF holdings
    farside.ts            # NEW: ETF flows (Puppeteer scraper)
    coingecko.ts          # Keep
    defillama.ts          # Update: add RWA, treasuries
    alternative.ts        # Keep
    yahoo-finance.ts      # Keep (macro)
    binance.ts            # Keep
  types.ts
  utils.ts
```

---

## 11. Test Scripts (Existing)

These scripts were created during planning and can be used as reference:

| Script | Purpose | Status |
|--------|---------|--------|
| `scripts/test-farside-scraper.ts` | Puppeteer ETF flow scraper | ✅ Working |
| `scripts/test-dune-api.ts` | Dune API query testing | ✅ Query 3944634 works |
| `scripts/test-defillama-rwa.ts` | RWA data from DeFiLlama | ✅ Working |
| `scripts/test-defillama-dat.ts` | DAT treasuries data | ✅ Working |

---

## 12. Open Questions (To Decide Later)

1. **Macro display:** How/whether to show DXY, Gold, S&P, NASDAQ
2. **Sparkline vs bar chart:** Final decision per metric
3. **Dark mode:** Implementation timeline
4. **Chat moderation:** Rate limiting, word filters
5. **Calendar sources:** Which auto-populate APIs to use
