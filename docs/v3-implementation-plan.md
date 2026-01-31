# V3 Dashboard Implementation Plan

> Daily market checker for Korean crypto community
> Multi-chain: BTC, ETH (default), SOL

## Goal
Build the complete V3 dashboard with:
1. All 6 sections (Ticker, Quick Stats, 오늘의 코인, 얌얌의 한마디, Chain Tabs, 더보기)
2. Quick Stats pill-style design (from v3-ref-1.png)
3. Multi-chain support (BTC, ETH, SOL)
4. New backend infrastructure (fetchers, APIs, cron)
5. Database schema migration (cleanup V2, add V3 keys)

---

## Core Philosophy

```
❌ Compete with data sites (CoinGecko, TradingView)
✅ Korean crypto community's daily routine
```

**Why users come daily:**
1. "What pumped today?" → 오늘의 코인 (FOMO)
2. "What does YUMYUM say?" → 얌얌의 한마디
3. "How are the majors?" → Chain Tabs (BTC/ETH/SOL)

---

## 1. Supabase Schema Changes

### 1.1 NEW Table: `daily_summaries`

```sql
-- V3 Migration: Add daily_summaries table
CREATE TABLE daily_summaries (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_summaries_date ON daily_summaries(date DESC);

-- RLS: public read, service role write
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read summaries"
  ON daily_summaries FOR SELECT
  USING (true);

CREATE POLICY "Service write summaries"
  ON daily_summaries FOR ALL
  TO service_role
  USING (true);
```

### 1.2 Cleanup Old Metric Rows

```sql
-- V3 Migration: Delete deprecated metric keys
-- These are no longer stored in V3 (fetched live or not needed)

DELETE FROM metrics WHERE key IN (
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

-- Verify: Only V3 keys remain
SELECT DISTINCT key FROM metrics ORDER BY key;
-- Expected: btc_price, eth_price, eth_burn, eth_issuance, etf_flow_btc, etf_flow_eth
```

### 1.3 Update `database.types.ts`

**V3 METRIC_KEYS (replace existing):**
```typescript
export const METRIC_KEYS_V3 = {
  // Prices (for 7d charts)
  btc_price: "btc_price",
  eth_price: "eth_price",
  sol_price: "sol_price",       // NEW

  // ETH inflation (stored daily)
  eth_burn: "eth_burn",
  eth_issuance: "eth_issuance",

  // Note: SOL fees + inflation rate are fetched LIVE, not stored

  // ETF Flows (for 7d charts)
  etf_flow_btc: "etf_flow_btc",
  etf_flow_eth: "etf_flow_eth",
  etf_flow_sol: "etf_flow_sol", // NEW
} as const;
```

**Add DailySummaryRow type:**
```typescript
export interface DailySummaryRow {
  id: number;
  date: string;
  summary: string;
  created_at: string;
}
```

---

## 2. V3 Page Layout (All 6 Sections)

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER (YUMYUM + nav + social links)                                │
├─────────────────────────────────────────────────────────────────────┤
│ ❶ TICKER - Real-time prices (BTC, ETH, SOL + expandable top 10)    │
├─────────────────────────────────────────────────────────────────────┤
│ ❷ QUICK STATS - Pill-style cards (F&G, BTC.D, Stables, ETF flows)  │
├─────────────────────────────────────────────────────────────────────┤
│ ❸ 오늘의 코인 - Top gainers/losers (expandable)                     │
├─────────────────────────────────────────────────────────────────────┤
│ ❹ 얌얌의 한마디 - AI daily summary                                  │
├─────────────────────────────────────────────────────────────────────┤
│ ❺ CHAIN TABS - [BTC] [ETH ← default] [SOL]                         │
│    └── Chain-specific: price chart, supply, inflation, holdings    │
├─────────────────────────────────────────────────────────────────────┤
│ ❻ 더보기 - [파생상품] [RWA] tabs                                    │
├─────────────────────────────────────────────────────────────────────┤
│ FOOTER                                                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Section ❶: Ticker

### Component: `components/v3/Ticker.tsx`

**Display:**
- Default: Top 3 (BTC, ETH, SOL) with price + 24h change
- Expanded: Top 10 by market cap
- Toggle: [더보기 ▼] / [접기 ▲]

**Data:**
- Source: Binance WebSocket (real-time)
- Fallback: REST API if WebSocket fails
- No storage

**Props:**
```typescript
interface TickerProps {
  prices: Array<{
    symbol: string;      // "BTC", "ETH", "SOL"
    price: number;
    change24h: number;   // percentage
  }>;
  expanded?: boolean;
  onToggle?: () => void;
}
```

**Hook:** `use-v3-ticker.ts` - manages WebSocket connection

---

## 4. Section ❷: Quick Stats (Pill Style)

### Component: `components/v3/QuickStats.tsx`

**Display:**
- 6 pill-style cards (from v3-ref-1.png)
- Responsive: wrap on mobile

**Pills:**
| # | Label | Icon | Value | Source |
|---|-------|------|-------|--------|
| 1 | F&G | 😨/😀 | 26 "공포" | Alternative.me |
| 2 | BTC.D | ₿ | 57.3% | CoinGecko |
| 3 | Stables | 💵 | $307B (+0.8%) | DeFiLlama |
| 4 | BTC ETF | ₿ | -$5.4M | Supabase |
| 5 | ETH ETF | Ξ | +$0.8M | Supabase |
| 6 | SOL ETF | ◎ | +$12.3M | Supabase |

**Sub-component:** `components/ui/StatPill.tsx`
```typescript
interface StatPillProps {
  icon?: string;
  label: string;
  value: string | number;
  subLabel?: string;         // "공포", "탐욕"
  change?: number | null;
  changeType?: 'percent' | 'flow';
}
```

**Pill Styling (Tailwind):**
```
rounded-full bg-white border border-[#E5E7EB] px-3 py-1.5
flex items-center gap-2 shadow-sm
```

**F&G Label Logic:**
- 0-25: 😨 "극단적 공포"
- 26-45: 😟 "공포"
- 46-55: 😐 "중립"
- 56-75: 😊 "탐욕"
- 76-100: 🤑 "극단적 탐욕"

**Hook:** `use-v3-quick-stats.ts`

---

## 5. Section ❸: 오늘의 코인

### Component: `components/v3/TodaysCoin.tsx`

**Display:**
- Default: 3 gainers + 3 losers
- Expanded: 10-20 each
- Toggle: [더보기 ▼] / [접기 ▲]

**Format:**
```
🔥 WLD +11.2% │ PAXG +5.4% │ XAUt +5.3%
📉 DASH -9.2% │ XTZ -7.6% │ IP -7.0%
```

**Data:**
- Source: CoinGecko `/coins/markets`
- Filter: Top 300 by market cap
- Cache: 15 min
- No storage

**Props:**
```typescript
interface TodaysCoinProps {
  gainers: Array<{ symbol: string; change: number }>;
  losers: Array<{ symbol: string; change: number }>;
  expanded?: boolean;
  onToggle?: () => void;
}
```

**Hook:** `use-v3-gainers-losers.ts`

---

## 6. Section ❹: 얌얌의 한마디

### Component: `components/v3/YumyumComment.tsx`

**Display:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [🐕] "BTC 도미 57% 돌파. 알트 약세 지속. SOL만 혼자 달리는 중.   │
│      ETF 자금 빠지고 있으니 주의."                               │
└─────────────────────────────────────────────────────────────────┘
```

**Data:**
- Source: Claude API (Haiku)
- Generated: Daily cron
- Storage: `daily_summaries` table
- Cost: ~$0.01-0.03/day

**Props:**
```typescript
interface YumyumCommentProps {
  summary: string;
  date: string;
}
```

**Prompt Template (for claude-summary.ts):**
```
Given today's crypto market data:
- BTC: ${btc_price} (${btc_change}%), Dominance: ${btc_d}%
- ETH: ${eth_price} (${eth_change}%)
- SOL: ${sol_price} (${sol_change}%)
- Fear & Greed: ${fg_value} (${fg_label})
- ETF Flows: BTC ${btc_etf}, ETH ${eth_etf}, SOL ${sol_etf}
- Top Gainer: ${top_gainer} +${gainer_pct}%

Write a 2-3 sentence Korean market summary for crypto traders.
Rules: Factual, concise, no emojis, no price predictions, casual tone (반말 OK)
```

**Hook:** `use-v3-summary.ts`

---

## 7. Section ❺: Chain Tabs

### Component: `components/v3/ChainTabs.tsx`

**Tabs:** [BTC] [ETH ← default] [SOL]

#### ETH Tab Content:
```
┌─────────────────────────────────────────────────────────────────────┐
│ 이더리움 현재가: $2,950.89 -2.32%                                   │
│ 7일 고점: $3,120 │ 7일 저점: $2,890                                 │
│ [═══════════ 7-DAY AREA CHART ═══════════]                          │
├─────────────────────────────────────────────────────────────────────┤
│ 총 공급량: 120.69M ETH │ 스테이킹: 33.8M (28%) │ TVL: $70.03B       │
├─────────────────────────────────────────────────────────────────────┤
│ 인플레이션 현황                                                     │
│ 7일 순발행: -2,145 ETH (deflationary 🔥)                            │
│ 현재 속도: -306 ETH/day │ 연간 예측: -0.09%                         │
├─────────────────────────────────────────────────────────────────────┤
│ 스테이블코인: $161.3B (+0.8%) │ 기관: ETF 5.10M + DAT 6.01M         │
├─────────────────────────────────────────────────────────────────────┤
│ ETH ETF 자금흐름 [═══════ 7-DAY BAR CHART ═══════]                  │
└─────────────────────────────────────────────────────────────────────┘
```

#### SOL Tab Content:
- Similar structure to ETH
- Shows: 24h Fees (Solana.FM) + Inflation Rate (Solana RPC)
- Note: SOL is always inflationary (issuance >> burn), so no burn/issuance display

#### BTC Tab Content:
- No inflation section (fixed supply)
- No TVL (no native DeFi)
- Halving countdown: Current block reward → next reward, progress bar

**Data Sources:**
| Data | ETH | SOL | BTC |
|------|-----|-----|-----|
| Price + Chart | Supabase (7d) | Supabase (7d) | Supabase (7d) |
| Supply | Etherscan | Solana RPC | CoinGecko |
| Staking | Beacon | Solana RPC | N/A |
| TVL | DeFiLlama | DeFiLlama | N/A |
| Inflation | ultrasound.money (burn/issuance) | Solana RPC (rate) + Solana.FM (fees) | N/A |
| Stablecoins | DeFiLlama | DeFiLlama | N/A |
| ETF Flow | Supabase (7d) | Supabase (7d) | Supabase (7d) |
| Holdings | Farside + DeFiLlama | Farside + DeFiLlama | Farside + DeFiLlama |

**Hook:** `use-v3-chain-data.ts`

---

## 8. Section ❻: 더보기 (Tabs)

### Component: `components/v3/MoreTabs.tsx`

**Tabs:** [파생상품] [RWA]

#### 파생상품 Tab:
```
┌─────────────────────────────────────────────────────────────────────┐
│         롱/숏 비율                                    펀딩비 (8h)    │
│ BTC   [🐂████████████░░░░░░🐻] 58%/42%              +0.012%        │
│ ETH   [🐂███████████░░░░░░░🐻] 54%/46%              +0.008%        │
│ SOL   [🐂██████░░░░░░░░░░░░🐻] 32%/68%              -0.005%        │
└─────────────────────────────────────────────────────────────────────┘
```

**Data:**
- Source: Binance Futures API
- Long/Short: 5 min cache
- Funding Rate: 15 min cache
- No storage

#### RWA Tab:
```
┌─────────────────────────────────────────────────────────────────────┐
│ RWA 총액: $14.26B (스테이블코인 제외)                               │
│                                                                     │
│ 체인별: Ethereum $12.9B │ Solana $0.8B                             │
│                                                                     │
│ 카테고리별:                                                         │
│ US Treasury ████████████████████ $8.9B (38%)                       │
│ Commodities ████████████ $4.5B (19%)                               │
│ Private Credit ██████ $2.8B (12%)                                  │
│ Others ██████████ $2.0B (31%)                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Data:**
- RWA by Chain: DeFiLlama (15 min cache)
- RWA by Category: rwa.xyz CSV (manual upload)
- No storage

**Hook:** `use-v3-derivatives.ts`, `use-v3-rwa.ts`

---

## 9. Backend Integration

### 9.1 Complete Data Strategy (v3-plan-final.md Section 4)

#### ❌ NO STORAGE - Real-time (WebSocket)
| Data | Source | Fetcher |
|------|--------|---------|
| Top 10 Prices | Binance WebSocket | `binance-ws.ts` (NEW) |
| 24h Change % | Binance WebSocket | `binance-ws.ts` (NEW) |

#### ❌ NO STORAGE - Short Cache (5-15 min)
| Data | Source | Cache | Fetcher |
|------|--------|-------|---------|
| Fear & Greed | Alternative.me | 15 min | ✅ `alternative.ts` |
| BTC Dominance | CoinGecko `/global` | 15 min | ✅ `coingecko.ts` |
| Stablecoin Total | DeFiLlama | 15 min | ✅ `defillama.ts` |
| Long/Short Ratio | Binance Futures | 5 min | `binance-futures.ts` (NEW) |
| Funding Rate | Binance Futures | 15 min | `binance-futures.ts` (NEW) |
| Gainers/Losers | CoinGecko | 15 min | `coingecko.ts` (ADD) |
| RWA by Chain | DeFiLlama | 15 min | ✅ `defillama-rwa.ts` |

#### ❌ NO STORAGE - Daily Fetch Only
| Data | Source | Fetcher |
|------|--------|---------|
| ETH Supply | Etherscan | ✅ `etherscan.ts` |
| ETH Staking | Beacon | `etherscan.ts` (ADD) |
| SOL Supply/Staking | Solana RPC | `solana.ts` (NEW) |
| BTC Circulating | CoinGecko | ✅ `coingecko.ts` |
| ETH/SOL TVL | DeFiLlama | ✅ `defillama.ts` |
| ETF Holdings | Farside | ✅ `farside.ts` |
| DAT Holdings | DeFiLlama | ✅ `defillama-dat-scraper.ts` |

#### ✅ STORAGE - Daily Store (Supabase) - 9 metrics/day
| Key | Source | Fetcher | Status |
|-----|--------|---------|--------|
| `btc_price` | CoinGecko | ✅ `coingecko.ts` | Keep |
| `eth_price` | CoinGecko | ✅ `coingecko.ts` | Keep |
| `sol_price` | CoinGecko | ✅ `coingecko.ts` | Done |
| `eth_burn` | ultrasound.money | ✅ `ultrasound.ts` | Keep |
| `eth_issuance` | ultrasound.money | ✅ `ultrasound.ts` | Keep |
| `etf_flow_btc` | Farside | ✅ `farside.ts` | Keep |
| `etf_flow_eth` | Farside | ✅ `farside.ts` | Keep |
| `etf_flow_sol` | Farside | ✅ `farside.ts` | Done |
| `daily_summary` | Claude API | `claude-summary.ts` (DEFERRED) | Needs credits |

#### ❌ NO STORAGE - SOL Live Data
| Data | Source | Fetcher |
|------|--------|---------|
| SOL Daily Fees | Dune API (query 6625740) | ✅ `solana.ts` |
| SOL Inflation Rate | Solana RPC | ✅ `solana.ts` |

---

### 9.2 New Fetchers to Create

| File | Purpose | API | Status |
|------|---------|-----|--------|
| `lib/fetchers/binance-ws.ts` | Real-time prices | `wss://stream.binance.com` | TODO |
| `lib/fetchers/binance-futures.ts` | Long/Short, Funding | Binance Futures REST | ✅ Done |
| `lib/fetchers/solana.ts` | SOL supply, staking, fees, inflation | Solana RPC + Solana.FM | ✅ Done |
| `lib/fetchers/claude-summary.ts` | Daily AI summary | Anthropic API | ⏸️ Deferred |

### 9.3 Existing Fetchers to Update

| File | Changes |
|------|---------|
| `coingecko.ts` | Add `fetchSolPrice()`, `fetchGainersLosers()` |
| `farside.ts` | Add SOL ETF scraping (`/sol/` page) |
| `etherscan.ts` | Add ETH staking (Beacon chain) |

### 9.4 New API Routes

| Route | Method | Purpose | Cache |
|-------|--------|---------|-------|
| `/api/v3/ticker` | GET | WebSocket proxy or REST fallback | Real-time |
| `/api/v3/quick-stats` | GET | F&G, BTC.D, Stables, ETF flows | 15 min |
| `/api/v3/gainers-losers` | GET | Top movers | 15 min |
| `/api/v3/derivatives` | GET | Long/Short, Funding | 5 min |
| `/api/v3/chain/[chain]` | GET | Chain-specific data (BTC/ETH/SOL) | Mixed |
| `/api/v3/summary` | GET | Today's AI summary | Daily |

### 9.5 V3 Aggregator (Cron Job)

**File: `lib/fetchers/v3-aggregator.ts`** (NEW - replaces v2-aggregator)

Stores only 9 metrics/day (SOL fees/inflation fetched live):
```typescript
async function fetchAndStoreV3Metrics() {
  // Prices (CoinGecko)
  await store('btc_price', ...);
  await store('eth_price', ...);
  await store('sol_price', ...);

  // ETH inflation (ultrasound.money)
  await store('eth_burn', ...);
  await store('eth_issuance', ...);

  // ETF flows (Farside)
  await store('etf_flow_btc', ...);
  await store('etf_flow_eth', ...);
  await store('etf_flow_sol', ...);

  // AI summary (Claude) - DEFERRED until credits added
  // await storeSummary(summary);
}
```

### 9.6 New Hooks

| Hook | Section | Data |
|------|---------|------|
| `use-v3-ticker.ts` | ❶ Ticker | Real-time prices (WebSocket) |
| `use-v3-quick-stats.ts` | ❷ Quick Stats | F&G, BTC.D, Stables, ETF flows |
| `use-v3-gainers-losers.ts` | ❸ 오늘의 코인 | Top movers |
| `use-v3-summary.ts` | ❹ 얌얌의 한마디 | AI daily summary |
| `use-v3-chain-data.ts` | ❺ Chain Tabs | Chain-specific metrics |
| `use-v3-derivatives.ts` | ❻ 파생상품 | Long/Short, Funding |
| `use-v3-rwa.ts` | ❻ RWA | RWA by chain/category |

### 9.7 API Sources & Costs

| Source | Data | Cost | Status |
|--------|------|------|--------|
| Binance WebSocket | Live prices (top 10) | Free | TODO |
| Binance Futures | Long/Short, Funding | Free | ✅ Done |
| CoinGecko | BTC.D, markets, prices | Free | ✅ Done |
| Alternative.me | Fear & Greed | Free | ✅ Done |
| DeFiLlama | TVL, Stables, RWA, DAT | Free | ✅ Done |
| Etherscan | ETH supply | Free | ✅ Done |
| ultrasound.money | ETH burn/issuance | Free | ✅ Done |
| Solana RPC | SOL supply, staking, inflation rate | Free | ✅ Done |
| Dune API | SOL daily fees (query 6625740) | Free (with key) | ✅ Done |
| Farside | ETF data (BTC, ETH, SOL) | Free (scraper) | ✅ Done |
| Claude API | AI summary | ~$0.01/day | ⏸️ Deferred |
| rwa.xyz | RWA by category | Free (CSV) | TODO |

### 9.8 Backfill (Run Once)

```typescript
async function backfillOnce() {
  // Price: CoinGecko has 7d history
  // ETF Flow: Farside has date table
  // Burn/Issuance: No API - build from Day 1
}
```

---

## 10. Implementation Checklist

### Phase 0: Database Migration
- [x] 1. Run `daily_summaries` table creation SQL
- [x] 2. Run cleanup SQL to delete deprecated metrics
- [x] 3. Update `database.types.ts` with V3 keys

### Phase 1: Backend - Core Infrastructure
- [x] 4. Update `farside.ts` - Add SOL ETF scraping
- [x] 5. Update `coingecko.ts` - Add SOL price, gainers/losers
- [x] 6. Create `solana.ts` - SOL supply/staking/fees/inflation fetcher
- [x] 7. Create `binance-futures.ts` - Long/Short, Funding
- [ ] 8. Create `claude-summary.ts` - AI summary generator (DEFERRED)
- [x] 9. Create `v3-aggregator.ts` - New cron job (9 metrics/day)

### Phase 2: Backend - API Routes
- [ ] 11. Create `/api/v3/quick-stats/route.ts`
- [ ] 12. Create `/api/v3/gainers-losers/route.ts`
- [ ] 13. Create `/api/v3/derivatives/route.ts`
- [ ] 14. Create `/api/v3/chain/[chain]/route.ts`
- [ ] 15. Create `/api/v3/summary/route.ts`
- [ ] 16. Update `/api/cron/fetch/route.ts` - Use v3-aggregator

### Phase 3: Backend - Real-time (Optional - can defer)
- [ ] 17. Create `binance-ws.ts` - WebSocket client
- [ ] 18. Create `/api/v3/ticker/route.ts` - REST fallback

### Phase 4: Frontend - Components (by section)
- [ ] 19. Create `StatPill.tsx` - reusable pill component
- [ ] 20. Create `Ticker.tsx` - ❶ real-time prices
- [ ] 21. Create `QuickStats.tsx` - ❷ pill-style stats
- [ ] 22. Create `TodaysCoin.tsx` - ❸ gainers/losers
- [ ] 23. Create `YumyumComment.tsx` - ❹ AI summary
- [ ] 24. Create `ChainTabs.tsx` - ❺ BTC/ETH/SOL tabs
- [ ] 25. Create `MoreTabs.tsx` + `Derivatives.tsx` + `RwaSection.tsx` - ❻ 더보기

### Phase 5: Frontend - Hooks & Page
- [ ] 26. Create `use-v3-ticker.ts` - ❶
- [ ] 27. Create `use-v3-quick-stats.ts` - ❷
- [ ] 28. Create `use-v3-gainers-losers.ts` - ❸
- [ ] 29. Create `use-v3-summary.ts` - ❹
- [ ] 30. Create `use-v3-chain-data.ts` - ❺
- [ ] 31. Create `use-v3-derivatives.ts` + `use-v3-rwa.ts` - ❻
- [ ] 32. Create `/app/dashboard-v3/page.tsx` - assemble all sections

### Phase 6: Polish
- [ ] 33. Style refinement based on feedback
- [ ] 34. Responsive testing
- [ ] 35. Error states & loading skeletons

---

## Files Checklist

### Database & Types
- [x] Create `supabase/migrations/20260131000000_v3_schema.sql`
- [x] Update `lib/database.types.ts`

### Fetchers (Backend)
- [x] Update `lib/fetchers/farside.ts` - Add SOL ETF
- [x] Update `lib/fetchers/coingecko.ts` - Add SOL price, gainers/losers
- [ ] Update `lib/fetchers/etherscan.ts` - Add ETH staking
- [x] Create `lib/fetchers/solana.ts` - SOL supply/staking/fees (Dune)/inflation
- [x] Create `lib/fetchers/binance-futures.ts` - Derivatives data
- [ ] Create `lib/fetchers/binance-ws.ts` - Real-time prices
- [ ] Create `lib/fetchers/claude-summary.ts` - AI summary (DEFERRED)
- [x] Create `lib/fetchers/v3-aggregator.ts` - V3 cron job
- [x] Delete `lib/fetchers/solana-fm.ts` - Merged into solana.ts

### API Routes
- [ ] Create `app/api/v3/quick-stats/route.ts`
- [ ] Create `app/api/v3/gainers-losers/route.ts`
- [ ] Create `app/api/v3/derivatives/route.ts`
- [ ] Create `app/api/v3/chain/[chain]/route.ts`
- [ ] Create `app/api/v3/summary/route.ts`
- [ ] Create `app/api/v3/ticker/route.ts`
- [ ] Update `app/api/cron/fetch/route.ts`

### Hooks
- [ ] Create `lib/hooks/use-v3-ticker.ts` - ❶ Ticker
- [ ] Create `lib/hooks/use-v3-quick-stats.ts` - ❷ Quick Stats
- [ ] Create `lib/hooks/use-v3-gainers-losers.ts` - ❸ 오늘의 코인
- [ ] Create `lib/hooks/use-v3-summary.ts` - ❹ 얌얌의 한마디
- [ ] Create `lib/hooks/use-v3-chain-data.ts` - ❺ Chain Tabs
- [ ] Create `lib/hooks/use-v3-derivatives.ts` - ❻ 파생상품
- [ ] Create `lib/hooks/use-v3-rwa.ts` - ❻ RWA

### Components
- [ ] Create `components/ui/StatPill.tsx` - Reusable pill
- [ ] Create `components/v3/Ticker.tsx` - ❶ Ticker
- [ ] Create `components/v3/QuickStats.tsx` - ❷ Quick Stats
- [ ] Create `components/v3/TodaysCoin.tsx` - ❸ 오늘의 코인
- [ ] Create `components/v3/YumyumComment.tsx` - ❹ 얌얌의 한마디
- [ ] Create `components/v3/ChainTabs.tsx` - ❺ Chain Tabs
- [ ] Create `components/v3/MoreTabs.tsx` - ❻ 더보기 container
- [ ] Create `components/v3/Derivatives.tsx` - ❻ 파생상품
- [ ] Create `components/v3/RwaSection.tsx` - ❻ RWA
- [ ] Update `components/ui/index.ts` - Export StatPill

### Pages
- [ ] Create `app/dashboard-v3/page.tsx`

---

## 11. Verification Checklist

### Database
- [ ] Verify `daily_summaries` table exists
- [ ] Verify old metrics deleted (only V3 keys remain)
- [ ] Verify cron stores 9 metrics/day (8 without AI summary)

### Backend APIs
- [ ] `curl /api/v3/ticker` - returns top 10 prices
- [ ] `curl /api/v3/quick-stats` - returns F&G, BTC.D, Stables, ETF flows
- [ ] `curl /api/v3/gainers-losers` - returns top 20 movers
- [ ] `curl /api/v3/summary` - returns AI summary
- [ ] `curl /api/v3/chain/eth` - returns ETH metrics
- [ ] `curl /api/v3/chain/sol` - returns SOL metrics
- [ ] `curl /api/v3/chain/btc` - returns BTC metrics
- [ ] `curl /api/v3/derivatives` - returns Long/Short, Funding

### Frontend - All 6 Sections
- [ ] ❶ Ticker: prices update, expand/collapse works
- [ ] ❷ Quick Stats: pills render with correct values/colors, responsive wrap
- [ ] ❸ 오늘의 코인: gainers green, losers red, expand/collapse works
- [ ] ❹ 얌얌의 한마디: AI summary displays with mascot
- [ ] ❺ Chain Tabs: tabs switch, charts render, data loads per chain
- [ ] ❻ 더보기: derivatives + RWA tabs work

### Responsive
- [ ] Test at 375px (mobile)
- [ ] Test at 768px (tablet)
- [ ] Test at 1024px (desktop)

---

## Changelog

- **2026-01-31**: Switched SOL fees from Solana.FM (down) to Dune API (query 6625740)
- **2026-01-31**: Removed sol_burn/sol_issuance (fetch live instead), merged solana-fm.ts into solana.ts
- **2026-01-31**: Merged v3-plan-final.md into implementation plan
- **2026-01-30**: V3 Final spec created
