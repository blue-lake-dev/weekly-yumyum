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
- Source: CoinGecko REST API (1 min cache)
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

**Hook:** `use-ticker.ts` - fetches from `/api/v1/ticker`

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

**Hook:** `use-quick-stats.ts`

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

**Hook:** `use-gainers-losers.ts`

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

**Prompt Template (for claude.ts):**
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

**Hook:** `use-summary.ts`

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

**Hook:** `use-chain-data.ts`

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

**Hook:** `use-derivatives.ts`, `use-rwa.ts`

---

## 9. Backend Integration

### 9.1 Complete Data Strategy

#### ❌ NO STORAGE - Short Cache (1-15 min)
| Data | Source | Cache | Fetcher |
|------|--------|-------|---------|
| Top 3 Prices | CoinGecko | 1 min | ✅ `coingecko.ts` |
| Fear & Greed | Alternative.me | 15 min | ✅ `alternative.ts` |
| BTC Dominance | CoinMarketCap | 15 min | ✅ `coinmarketcap.ts` |
| Stablecoin Total | DeFiLlama | 15 min | ✅ `defillama.ts` |
| Long/Short Ratio | Binance Futures | 5 min | ✅ `binance.ts` |
| Funding Rate | Binance Futures | 15 min | ✅ `binance.ts` |
| Gainers/Losers | CoinGecko | 15 min | ✅ `coingecko.ts` |
| RWA by Chain | DeFiLlama | 15 min | ✅ `defillama.ts` |

#### ❌ NO STORAGE - Daily Fetch Only
| Data | Source | Fetcher |
|------|--------|---------|
| ETH Supply | Etherscan | ✅ `etherscan.ts` |
| ETH Staking | Beacon | `etherscan.ts` (TODO) |
| SOL Supply/Staking | Solana RPC | ✅ `solana.ts` |
| BTC Circulating | CoinGecko | ✅ `coingecko.ts` |
| ETH/SOL TVL | DeFiLlama | ✅ `defillama.ts` |
| ETF Holdings | Farside | ✅ `farside.ts` |
| SOL Daily Fees | Dune API | ✅ `solana.ts` |
| SOL Inflation Rate | Solana RPC | ✅ `solana.ts` |

#### ✅ STORAGE - Daily Store (Supabase) - 3 metrics/day
| Key | Source | Fetcher | Status |
|-----|--------|---------|--------|
| `etf_flow_btc` | Farside | ✅ `farside.ts` | ✅ Done |
| `etf_flow_eth` | Farside | ✅ `farside.ts` | ✅ Done |
| `etf_flow_sol` | Farside | ✅ `farside.ts` | ✅ Done |

> **Note:** Prices, burn/issuance, and other metrics are fetched live. Only ETF flows are stored (Farside updates once daily after market close).

---

### 9.2 Fetcher Files (Source-Based Naming)

| File | Purpose | Status |
|------|---------|--------|
| `lib/fetchers/coingecko.ts` | Prices, dominance, gainers/losers, supply | ✅ Done |
| `lib/fetchers/coinmarketcap.ts` | BTC/ETH dominance | ✅ Done |
| `lib/fetchers/binance.ts` | Long/Short, Funding | ✅ Done |
| `lib/fetchers/defillama.ts` | TVL, Stablecoins, RWA | ✅ Done |
| `lib/fetchers/farside.ts` | ETF flows + holdings (BTC, ETH, SOL) | ✅ Done |
| `lib/fetchers/solana.ts` | SOL supply, staking, fees, inflation | ✅ Done |
| `lib/fetchers/etherscan.ts` | ETH supply | ✅ Done |
| `lib/fetchers/ultrasound.ts` | ETH burn data | ✅ Done |
| `lib/fetchers/alternative.ts` | Fear & Greed | ✅ Done |
| `lib/fetchers/dune.ts` | ETF holdings (Dune queries) | ✅ Done |
| `lib/fetchers/claude.ts` | AI summary | ⏸️ Deferred |
| `lib/fetchers/aggregator.ts` | Daily cron orchestrator | ✅ Done |

### 9.3 Pending Fetcher Updates

| File | Changes | Status |
|------|---------|--------|
| `etherscan.ts` | Add ETH staking (Beacon chain) | TODO |

### 9.4 API Routes

| Route | Method | Purpose | Cache | Status |
|-------|--------|---------|-------|--------|
| `/api/v1/ticker` | GET | BTC/ETH/SOL prices | 1 min | ✅ Done |
| `/api/v1/quick-stats` | GET | F&G, BTC.D, Stables, ETF flows | 15 min | ✅ Done |
| `/api/v1/gainers-losers` | GET | Top movers | 15 min | ✅ Done |
| `/api/v1/derivatives` | GET | Long/Short, Funding | 5 min | ✅ Done |
| `/api/v1/chain/[chain]` | GET | Chain-specific data (BTC/ETH/SOL) | 15 min | ✅ Done |
| `/api/v1/summary` | GET | Today's AI summary | Daily | ✅ Done (dummy) |
| `/api/cron/fetch` | GET | Daily cron job | - | ✅ Done |
| `/api/admin/fetch` | POST | Manual trigger | - | ✅ Done |
| `/api/admin/backfill` | POST | Historical backfill | - | ✅ Done |

### 9.5 Aggregator (Cron Job)

**File: `lib/fetchers/aggregator.ts`**

Stores only 3 ETF flow metrics daily. Everything else is fetched live:
```typescript
async function fetchAndStoreMetrics() {
  // ETF flows (Farside) - only metrics stored
  await store('etf_flow_btc', ...);
  await store('etf_flow_eth', ...);
  await store('etf_flow_sol', ...);
}
```

### 9.6 Frontend Data Fetching (Streaming Hydration)

**Pattern:** TanStack Query v5 + Next.js App Router + Suspense

```
Server (page.tsx)                    Client (Dashboard.tsx)
─────────────────                    ─────────────────────
await prefetch(critical)      →      useQuery() → instant data
prefetch(non-critical)        →      useSuspenseQuery() → suspend/stream
dehydrate(queryClient)        →      HydrationBoundary
```

**Blocking (await) — Above the Fold:**
| Hook | Section | Query Type |
|------|---------|------------|
| `use-ticker.ts` | ❶ Ticker | `useQuery` |
| `use-quick-stats.ts` | ❷ Quick Stats | `useQuery` |

**Streaming (no await) — Progressive Load:**
| Hook | Section | Query Type |
|------|---------|------------|
| `use-gainers-losers.ts` | ❸ 오늘의 코인 | `useSuspenseQuery` |
| `use-summary.ts` | ❹ 얌얌의 한마디 | `useSuspenseQuery` |
| `use-chain-data.ts` | ❺ Chain Tabs | `useSuspenseQuery` |
| `use-derivatives.ts` | ❻ 파생상품 | `useSuspenseQuery` |
| `use-rwa.ts` | ❻ RWA | `useSuspenseQuery` |

**Auto-Refresh (Polling):**

Hooks use `refetchInterval` to auto-refresh data while the page is open:

| Hook | `staleTime` | `refetchInterval` | Notes |
|------|-------------|-------------------|-------|
| `use-ticker.ts` | 1 min | 1 min | Prices change constantly |
| `use-quick-stats.ts` | 15 min | 30 min | F&G updates ~8h, ETF flows daily |
| `use-gainers-losers.ts` | 15 min | 15 min | Top movers shift throughout day |
| `use-derivatives.ts` | 5 min | 5 min | L/S ratio changes frequently |
| `use-summary.ts` | 1 hour | - | Daily summary, no polling |
| `use-chain-data.ts` | 15 min | - | No polling (manual tab switch) |
| `use-rwa.ts` | 15 min | - | Disabled until endpoint ready |

**Key Files:**
- `lib/get-query-client.ts` — Server singleton with React `cache()`
- `lib/api/fetchers.ts` — Shared fetch functions + query keys
- `components/providers/QueryProvider.tsx` — Client singleton
- `components/ErrorBoundary.tsx` — Error handling for Suspense

### 9.7 API Sources & Costs

| Source | Data | Cost | Status |
|--------|------|------|--------|
| CoinGecko | Prices, markets, supply | Free | ✅ Done |
| CoinMarketCap | BTC/ETH dominance | Free | ✅ Done |
| Binance Futures | Long/Short, Funding | Free | ✅ Done |
| Alternative.me | Fear & Greed | Free | ✅ Done |
| DeFiLlama | TVL, Stables, RWA | Free | ✅ Done |
| Etherscan | ETH supply | Free | ✅ Done |
| ultrasound.money | ETH burn | Free | ✅ Done |
| Solana RPC | SOL supply, staking, inflation | Free | ✅ Done |
| Dune API | SOL fees, ETF holdings | Free (with key) | ✅ Done |
| Farside | ETF flows (scraper) | Free | ✅ Done |
| Claude API | AI summary | ~$0.01/day | ⏸️ Deferred |
| rwa.xyz | RWA by category (CSV) | Free | TODO |

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

### Phase 1: Backend - Fetchers
- [x] 4. Create `farside.ts` - ETF flows + holdings (BTC, ETH, SOL)
- [x] 5. Create `coingecko.ts` - Prices, gainers/losers, supply
- [x] 6. Create `solana.ts` - SOL supply/staking/fees/inflation
- [x] 7. Create `binance.ts` - Long/Short, Funding
- [x] 8. Create `defillama.ts` - TVL, Stablecoins, RWA
- [x] 9. Create `aggregator.ts` - Daily cron job (3 ETF flow metrics)
- [ ] 10. Create `claude.ts` - AI summary (DEFERRED)

### Phase 2: Backend - API Routes
- [x] 11. Create `/api/v1/ticker/route.ts`
- [x] 12. Create `/api/v1/quick-stats/route.ts`
- [x] 13. Create `/api/v1/gainers-losers/route.ts`
- [x] 14. Create `/api/v1/derivatives/route.ts`
- [x] 15. Create `/api/v1/chain/[chain]/route.ts`
- [x] 16. Create `/api/v1/summary/route.ts`
- [x] 17. Update `/api/cron/fetch/route.ts` - Uses aggregator

### Phase 3: Frontend - Cleanup & Components

**Frontend Architecture: Grouped by Type**
```
components/
  ui/              # Reusable primitives
  sections/        # Dashboard sections
  layout/          # Page chrome (Header, Footer)
lib/hooks/         # Data fetching hooks
```

**Cleanup (delete legacy V1 components):**
- [x] 18. Delete `components/Header.tsx`
- [x] 19. Delete `components/ui/ChangeIndicator.tsx`
- [x] 20. Delete `components/ui/DataTable.tsx`
- [x] 21. Delete `components/ui/SectionHeader.tsx`
- [x] 22. Delete `components/ui/ActionButtons.tsx`

**Components:**
- [x] 23. Create `components/ui/StatPill.tsx` - pill component (per v3-ref-1.png)
- [x] 24. Create `components/ui/Skeleton.tsx` - loading placeholder
- [x] 25. Create `components/layout/Header.tsx` - logo + nav + social
- [x] 26. Create `components/layout/Footer.tsx` - credits + timestamp
- [x] 27. Create `components/sections/Ticker.tsx` - ❶ prices
- [x] 28. Create `components/sections/QuickStats.tsx` - ❷ pill-style stats
- [x] 29. Create `components/sections/TodaysCoin.tsx` - ❸ gainers/losers
- [x] 30. Create `components/sections/YumyumComment.tsx` - ❹ AI summary
- [x] 31. Create `components/sections/ChainTabs.tsx` - ❺ BTC/ETH/SOL tabs
- [x] 32. Create `components/sections/MoreTabs.tsx` - ❻ 더보기 container
- [x] 33. Create `components/sections/Derivatives.tsx` - ❻ 파생상품
- [x] 34. Create `components/sections/RwaSection.tsx` - ❻ RWA

### Phase 4: Frontend - Hooks & Page
- [x] 35. Create `lib/hooks/use-ticker.ts` - ❶
- [x] 36. Create `lib/hooks/use-quick-stats.ts` - ❷
- [x] 37. Create `lib/hooks/use-gainers-losers.ts` - ❸
- [x] 38. Create `lib/hooks/use-summary.ts` - ❹
- [x] 39. Create `lib/hooks/use-chain-data.ts` - ❺
- [x] 40. Create `lib/hooks/use-derivatives.ts` - ❻
- [x] 41. Create `lib/hooks/use-rwa.ts` - ❻
- [x] 42. Update `app/page.tsx` - assemble all sections (home = dashboard)

### Phase 5: Polish
- [x] 43. Style refinement based on feedback
- [ ] 44. Responsive testing
- [x] 45. Error states & loading skeletons

---

## Files Checklist

### Database & Types
- [x] Create `supabase/migrations/20260131000000_v3_schema.sql`
- [x] Update `lib/database.types.ts`

### Fetchers (Backend) - Source-Based Naming
- [x] `lib/fetchers/coingecko.ts` - Prices, gainers/losers, supply
- [x] `lib/fetchers/coinmarketcap.ts` - BTC/ETH dominance
- [x] `lib/fetchers/binance.ts` - Derivatives (Long/Short, Funding)
- [x] `lib/fetchers/defillama.ts` - TVL, Stablecoins, RWA
- [x] `lib/fetchers/farside.ts` - ETF flows + holdings
- [x] `lib/fetchers/solana.ts` - Supply, staking, fees, inflation
- [x] `lib/fetchers/etherscan.ts` - ETH supply
- [x] `lib/fetchers/ultrasound.ts` - ETH burn
- [x] `lib/fetchers/alternative.ts` - Fear & Greed
- [x] `lib/fetchers/dune.ts` - ETF holdings (Dune queries)
- [x] `lib/fetchers/aggregator.ts` - Daily cron orchestrator
- [ ] `lib/fetchers/claude.ts` - AI summary (DEFERRED)

### API Routes
- [x] `app/api/v1/ticker/route.ts`
- [x] `app/api/v1/quick-stats/route.ts`
- [x] `app/api/v1/gainers-losers/route.ts`
- [x] `app/api/v1/derivatives/route.ts`
- [x] `app/api/v1/chain/[chain]/route.ts`
- [x] `app/api/v1/summary/route.ts`
- [x] `app/api/cron/fetch/route.ts`
- [x] `app/api/admin/fetch/route.ts`
- [x] `app/api/admin/backfill/route.ts`

### Hooks
- [x] `lib/hooks/use-ticker.ts` - ❶ Ticker
- [x] `lib/hooks/use-quick-stats.ts` - ❷ Quick Stats
- [x] `lib/hooks/use-gainers-losers.ts` - ❸ 오늘의 코인
- [x] `lib/hooks/use-summary.ts` - ❹ 얌얌의 한마디
- [x] `lib/hooks/use-chain-data.ts` - ❺ Chain Tabs
- [x] `lib/hooks/use-derivatives.ts` - ❻ 파생상품
- [x] `lib/hooks/use-rwa.ts` - ❻ RWA

### Components - UI (Primitives)
- [x] `components/ui/StatPill.tsx` - Reusable pill (per v3-ref-1.png)
- [x] `components/ui/Skeleton.tsx` - Loading placeholder

### Components - Layout
- [x] `components/layout/Header.tsx` - Logo + nav + social
- [x] `components/layout/Footer.tsx` - Credits + timestamp

### Components - Sections (per v3-design-cand-1.png)
- [x] `components/sections/Ticker.tsx` - ❶ Ticker
- [x] `components/sections/QuickStats.tsx` - ❷ Quick Stats
- [x] `components/sections/TodaysCoin.tsx` - ❸ 오늘의 코인
- [x] `components/sections/YumyumComment.tsx` - ❹ 얌얌의 한마디
- [x] `components/sections/ChainTabs.tsx` - ❺ Chain Tabs
- [x] `components/sections/MoreTabs.tsx` - ❻ 더보기 container
- [x] `components/sections/Derivatives.tsx` - ❻ 파생상품
- [x] `components/sections/RwaSection.tsx` - ❻ RWA

### Pages
- [x] `app/page.tsx` - Home = Dashboard (no separate route)

---

## 11. Verification Checklist

### Database
- [x] Verify `daily_summaries` table exists
- [x] Verify old metrics deleted (only ETF flow keys remain)
- [x] Verify cron stores 3 metrics/day (ETF flows only)

### Backend APIs
- [ ] `curl /api/v1/ticker` - returns BTC/ETH/SOL prices
- [ ] `curl /api/v1/quick-stats` - returns F&G, BTC.D, Stables, ETF flows
- [ ] `curl /api/v1/gainers-losers` - returns top movers
- [ ] `curl /api/v1/summary` - returns AI summary (dummy for now)
- [ ] `curl /api/v1/chain/eth` - returns ETH metrics
- [ ] `curl /api/v1/chain/sol` - returns SOL metrics
- [ ] `curl /api/v1/chain/btc` - returns BTC metrics
- [ ] `curl /api/v1/derivatives` - returns Long/Short, Funding

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

- **2026-02-02**: Header polish - added pixel mascots (doge, pepe, robot), Admin button, fixed YouTube URL
- **2026-02-02**: QuickStats polish - simplified StatPill component, added valueColor prop for ETF flows
- **2026-02-02**: Fixed ETF flows to fetch latest available data (not just today) for weekends
- **2026-02-02**: Fixed number formatting - ticker prices (0/2/4 decimals by range), stablecoins ($XXX.XXB), ETF flows (sign + color)
- **2026-02-02**: Fixed hydration mismatch in Footer (suppressHydrationWarning)
- **2026-02-02**: Fixed gainers/losers API error handling (return empty arrays instead of throwing)
- **2026-02-02**: Cleanup - removed unused formatNumber, BASE_URL; use shared formatters from utils/format.ts
- **2026-02-01**: Added auto-refresh polling (`refetchInterval`) to ticker (1m), gainers/losers (15m), quick stats (30m), derivatives (5m)
- **2026-02-01**: Completed all frontend components and hooks (Phase 3 & 4)
- **2026-02-01**: Adopted streaming hydration pattern (TanStack Query v5 + Suspense)
- **2026-02-01**: Split data fetching: blocking (Ticker, QuickStats) vs streaming (rest)
- **2026-02-01**: Added `lib/api/fetchers.ts` for shared fetch functions + query keys
- **2026-02-01**: Added `lib/get-query-client.ts` for server-side QueryClient singleton
- **2026-02-01**: Updated `docs/architecture.md` with frontend data fetching architecture
- **2026-02-01**: Frontend architecture decision - grouped by type (`ui/`, `sections/`, `layout/`)
- **2026-02-01**: Changed dashboard route from `/dashboard-v3` to `/` (home = dashboard)
- **2026-02-01**: Added legacy component cleanup to Phase 3
- **2026-02-01**: Renamed fetchers to source-based naming (`{source}.ts`)
- **2026-02-01**: Renamed `v3-aggregator.ts` → `aggregator.ts`, function to `fetchAndStoreMetrics()`
- **2026-02-01**: Merged `defillama-rwa.ts` into `defillama.ts`
- **2026-02-01**: Updated API routes path from `/api/v3/` to `/api/v1/`
- **2026-02-01**: Reduced stored metrics from 9 to 3 (ETF flows only)
- **2026-02-01**: Removed unused lending functions from defillama.ts
- **2026-02-01**: Removed `LendingProtocol` type from types.ts
- **2026-02-01**: Created `docs/architecture.md` with backend structure guide
- **2026-01-31**: Switched SOL fees from Solana.FM (down) to Dune API (query 6625740)
- **2026-01-31**: Removed sol_burn/sol_issuance (fetch live instead), merged solana-fm.ts into solana.ts
- **2026-01-31**: Merged v3-plan-final.md into implementation plan
- **2026-01-30**: V3 Final spec created
