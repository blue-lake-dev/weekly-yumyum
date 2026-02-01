# Architecture Guide

> Backend architecture decisions and best practices for YUMYUM Dashboard

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

## Design Principles

### 1. Fetchers = Service Layer

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
| `coingecko.ts` | CoinGecko API |
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

### Special Files

| File | Purpose |
|------|---------|
| `aggregator.ts` | Daily cron job orchestrator |
| `browser.ts` | Puppeteer launcher utility |
| `rwa-xyz.ts` | CSV parser for rwa.xyz data |

---

## References

- [Modern Full Stack Application Architecture Using Next.js 15+](https://softwaremill.com/modern-full-stack-application-architecture-using-next-js-15/)
- [The Ultimate Guide to Software Architecture in Next.js](https://dev.to/shayan_saed/the-ultimate-guide-to-software-architecture-in-nextjs-from-monolith-to-microservices-i2c)
- [Next.js Service Layer Pattern (GitHub)](https://github.com/ugurkellecioglu/nextjs-service-layer-pattern)
- [SaaS Architecture Patterns with Next.js](https://vladimirsiedykh.com/blog/saas-architecture-patterns-nextjs)
- [Clean Architecture with Next.js](https://dev.to/dan1618/clean-architecture-with-nextjs-43cg)
