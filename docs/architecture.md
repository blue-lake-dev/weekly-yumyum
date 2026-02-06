# Architecture Guide

> Architecture decisions and best practices for YUMYUM Dashboard

---

## Current Architecture

```
app/
  api/                    ← Controller layer (API routes)
    v1/                   ← Public endpoints
    admin/                ← Protected endpoints
    cron/                 ← Scheduled jobs

lib/
  fetchers/               ← Service layer (external APIs)
    coingecko.ts
    defillama.ts
    binance.ts
    farside.ts
    solana.ts
    ...
    aggregator.ts         ← Orchestrates daily cron job
  supabase.ts             ← Database client
  database.types.ts       ← DB schema types
  utils/                  ← Shared utilities
```

---

## Frontend Architecture

### Component Structure (Grouped by Type)

```
components/
  ui/                 ← Reusable primitives
    StatPill.tsx
    Skeleton.tsx
  sections/           ← Dashboard sections
    Ticker.tsx
    QuickStats.tsx
    TodaysCoin.tsx
    YumyumComment.tsx
    ChainTabs.tsx
    MoreTabs.tsx
    Derivatives.tsx
    RwaSection.tsx
  layout/             ← Page chrome
    Header.tsx
    Footer.tsx
  providers/          ← React context providers
    QueryProvider.tsx
  ErrorBoundary.tsx   ← Error handling for Suspense

lib/
  api/
    fetchers.ts       ← Shared fetch functions + query keys
  hooks/              ← TanStack Query hooks
    use-ticker.ts
    use-quick-stats.ts
    use-chain-data.ts
    ...
  get-query-client.ts ← Server-side QueryClient singleton
```

### Data Fetching: Streaming Hydration Pattern

We use **TanStack Query v5** with Next.js App Router for optimal performance:

```
┌─────────────────────────────────────────────────────────────────┐
│ Server (app/page.tsx)                                           │
│                                                                 │
│  1. getQueryClient() ← Singleton per request (React cache)      │
│  2. await prefetch(critical) ← Ticker, QuickStats (blocking)    │
│  3. prefetch(non-critical) ← ChainTabs, etc. (non-blocking)     │
│  4. dehydrate() → serialize state (resolved + pending)          │
│  5. Send HTML with HydrationBoundary                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Client (components/Dashboard.tsx)                               │
│                                                                 │
│  Critical sections: useQuery() → instant data (hydrated)        │
│  Streaming sections: useSuspenseQuery() → suspend until ready   │
│  Suspense boundaries: show Skeleton while pending               │
│  ErrorBoundary: catch and display errors gracefully             │
└─────────────────────────────────────────────────────────────────┘
```

### Blocking vs Streaming Data

| Type | Sections | Behavior |
|------|----------|----------|
| **Blocking** | Ticker, QuickStats | `await prefetch()` — Page waits, data instant |
| **Streaming** | TodaysCoin, YumyumComment, ChainTabs, MoreTabs | `prefetch()` (no await) — Shows skeleton, streams in |

### QueryClient Configuration

**Server-side** (`lib/get-query-client.ts`):
- Uses React `cache()` for request-level deduplication
- New client per request (prevents memory leaks)
- Supports dehydrating pending queries

**Client-side** (`components/providers/QueryProvider.tsx`):
- Singleton pattern (reuses same client across renders)
- `staleTime: 60s` prevents immediate refetch after hydration

### Suspense + Error Boundaries

```tsx
<ErrorBoundary fallback={<ErrorMessage />}>
  <Suspense fallback={<Skeleton />}>
    <ChainTabs />  {/* Uses useSuspenseQuery */}
  </Suspense>
</ErrorBoundary>
```

- `useSuspenseQuery` — Suspends component until data ready
- `<Suspense>` — Shows fallback while suspended
- `<ErrorBoundary>` — Catches errors, prevents crash

### Why This Pattern?

| Approach | First Paint | UX | Complexity |
|----------|-------------|-----|------------|
| Await all (blocking) | 🔴 Slow | 🔴 Wait for slowest API | Low |
| Client-only fetch | 🟢 Fast | 🟡 Layout shift, spinners | Low |
| **Streaming hydration** | 🟢 Fast | 🟢 Smooth, progressive | Medium |

---

## Backend Design Principles

### 1. Fetchers = Service Layer (External APIs)

Each fetcher file groups all functions for a single data source:
- Shared auth/headers
- Rate limiting
- Error handling
- Type definitions

```typescript
// lib/fetchers/coingecko.ts
export async function fetchTickerPrices() { ... }
export async function fetchGainersLosers() { ... }
export async function fetchPriceSparkline() { ... }
```

### 2. API Routes = Controller Layer

Routes handle HTTP concerns only:
- Request parsing
- Response formatting
- Caching headers
- Error responses

Business logic stays in fetchers.

### 3. Minimal Storage

Only store what can't be fetched live:
- ETF flows (Farside updates once daily after market close)

Everything else is fetched on-demand with cache headers.

---

## Evolution Strategy

| Stage | Pattern | Trigger |
|-------|---------|---------|
| **Now** | Fetchers + direct Supabase | Solo dev, <5 entities |
| **Growth** | Add `lib/db/` layer | Same query in 3+ places |
| **Scale** | Repository + Service + DI | Team growth, testing needs |

### When to Add `lib/db/` (Repository Layer)

Add when you notice:
- Same Supabase query duplicated in 3+ API routes
- Complex joins/filters that are hard to read inline
- Need to mock database for testing

**Example structure (future):**
```
lib/
  db/
    metrics.ts      ← getMetricsByDate(), upsertMetrics()
    summaries.ts    ← getDailySummary(), createSummary()
```

---

## File Naming Convention

### Fetchers: `{source}.ts`

| File | Data Source |
|------|-------------|
| `coingecko.ts` | CoinGecko API (prices, supply, Mayer Multiple, company holdings) |
| `defillama.ts` | DeFiLlama API |
| `binance.ts` | Binance Futures API |
| `farside.ts` | Farside.co.uk (scraper) |
| `solana.ts` | Solana RPC + Dune |
| `etherscan.ts` | Etherscan API |
| `ultrasound.ts` | ultrasound.money API |
| `alternative.ts` | Alternative.me (F&G) |
| `coinmarketcap.ts` | CoinMarketCap API |
| `dune.ts` | Dune Analytics API |
| `claude.ts` | Anthropic Claude API |
| `mempool.ts` | Mempool.space API (BTC mempool stats, fees) |
| `blockchain-com.ts` | Blockchain.com API (BTC hashrate) |
| `macromicro.ts` | MacroMicro scraper (BTC mining cost) |

### Special Files

| File | Purpose |
|------|---------|
| `aggregator.ts` | Daily cron job orchestrator |
| `browser.ts` | Puppeteer launcher utility |
| `rwa-xyz.ts` | CSV parser for rwa.xyz data |

---

## Formatting

### API: Raw Values Only

**APIs must always return raw values.** Formatting is done on the client.

```
✓ API returns: { "stakingRatio": 30.469463527189 }
✗ API returns: { "stakingRatio": "30.5%" }
```

This allows clients to format values as needed and avoids coupling API responses to display logic.

### Client: Use Shared Formatters

**All number/value formatting must use `lib/utils/format.ts`.**

Do NOT use inline formatting like `.toFixed()`, `.toLocaleString()`, or manual K/M/B conversions in components. Always import and use the shared formatters:

| Function | Use Case |
|----------|----------|
| `formatEthAmount()` | ETH amounts (120.69M) |
| `formatPercent()` | Percentages (30.5%, +2.85%) |
| `formatCompactNumber()` | Generic numbers (K/M/B/T) |
| `formatUsd()` | USD with compact notation ($1.5B) |
| `formatFlow()` | ETF flows with sign (+$234M) |

This ensures consistent formatting across the dashboard and makes it easy to adjust formatting rules globally.

---

## References

- [Modern Full Stack Application Architecture Using Next.js 15+](https://softwaremill.com/modern-full-stack-application-architecture-using-next-js-15/)
- [The Ultimate Guide to Software Architecture in Next.js](https://dev.to/shayan_saed/the-ultimate-guide-to-software-architecture-in-nextjs-from-monolith-to-microservices-i2c)
- [Next.js Service Layer Pattern (GitHub)](https://github.com/ugurkellecioglu/nextjs-service-layer-pattern)
- [SaaS Architecture Patterns with Next.js](https://vladimirsiedykh.com/blog/saas-architecture-patterns-nextjs)
- [Clean Architecture with Next.js](https://dev.to/dan1618/clean-architecture-with-nextjs-43cg)
