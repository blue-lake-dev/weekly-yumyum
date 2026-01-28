# V2 Dashboard Implementation Plan

> Implementation guide for rebuilding the dashboard following the new UI/UX design

**Reference Design:** `/docs/yumyum-board-cand-1.png`

---

## Overview

| Item | Value |
|------|-------|
| Route | `/dashboard-v2` (later replaces `/dashboard`) |
| Charting Library | Recharts |
| Data | Mock data first, then wire to fetchers |
| Assets | ✅ Complete (10 pixel art PNGs in `/public/assets/pixels/`) |

---

## Assets Required

### Pixel Art Assets (10 total) ✅ COMPLETE

Location: `/public/assets/pixels/`

| # | Filename | Description | Used In | Size |
|---|----------|-------------|---------|------|
| 1 | `doge.png` | Pixel Doge face (shiba) | Header mascot | 32px |
| 2 | `pepe.png` | Pixel Pepe (blue shirt) | Header mascot, BTC 도미넌스 card | 32px, 40px |
| 3 | `robot.png` | Pixel Robot (gray, yellow eyes) | Header mascot | 32px |
| 4 | `ethereum-original.png` | ETH diamond (black/gray) | ETH Price card, 공급량 card | 64px, 32px |
| 5 | `ethereum.png` | ETH in blue circle | ETH/BTC 비율 card | 24px |
| 6 | `bank.png` | Pixel bank with columns | RWA 총액 card | 48px |
| 7 | `doge-suit.png` | Doge in business suit | (unused - removed) | - |
| 8 | `bitcoin.png` | Orange BTC coin | 비트코인 현재가 card, ETH/BTC 비율 card | 40px, 24px |
| 9 | `usdt.png` | Green Tether logo | 스테이블코인 시가총액 card | 24px |
| 10 | `usdc.png` | Blue USDC logo | 스테이블코인 시가총액 card | 24px |

### Asset Usage Mapping

| Location | Asset(s) | Size | Notes |
|----------|----------|------|-------|
| Header (left) | logo-full.png + doge + pepe + robot | 120x36, 32px each | Logo image + mascots |
| ETH Price card | ethereum-original | 64px | Top-right corner |
| 공급량 card | (none) | - | Sparkline only |
| RWA 총액 card | bank | 80px | Center or right |
| ETH ETF 자금흐름 card | (none) | - | Chart only, no icon |
| 비트코인 현재가 card | bitcoin | 56px | Orange BTC |
| BTC 도미넌스 card | pepe | 56px | Green Pepe |
| 공포 탐욕 지수 card | (none) | - | 4-segment gauge |
| ETH/BTC 비율 card | bitcoin + ethereum | 40px each | Overlapping |
| 스테이블코인 시가총액 card | usdt + usdc | 40px each | Overlapping |

### Asset Specifications

- Format: PNG with transparent background
- Style: Pixel art, consistent across all icons
- Status: ✅ All assets provided and ready

---

## Typography

### Fonts

| Font | File | Usage |
|------|------|-------|
| **DNFBitBitv2** | `/public/assets/fonts/DNFBitBitv2.woff2` | Logo, section titles, card titles |
| **Inter** | Google Fonts / next/font | Numbers, body text, navigation |
| **Pretendard** | Google Fonts / next/font | Korean body text, labels |

### Hybrid Approach

| Element | Font | Weight |
|---------|------|--------|
| Logo "YUMYUM" | DNFBitBitv2 | - |
| Section titles (ETH, RWA, ETF, MARKET) | DNFBitBitv2 | - |
| Card titles (이더리움 현재가, 공급량) | DNFBitBitv2 | - |
| Large numbers ($3,456, 54.2%) | Inter | Bold, tabular-nums |
| Small labels, body text | Inter / Pretendard | Regular |
| Navigation, footer | Inter / Pretendard | Medium |

### CSS Setup

```css
@font-face {
  font-family: 'DNFBitBit';
  src: url('/assets/fonts/DNFBitBitv2.woff2') format('woff2');
  font-display: swap;
}
```

---

## Color Palette

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Primary | `#E7F60E` | `--color-primary` | Accent, chart fills, active states |
| Primary Light | `#F4FB67` | `--color-primary-light` | Hover states |
| Primary 15% | `#E7F60E26` | `--color-primary-15` | Area chart fills |
| Secondary | `#0D9488` | `--color-secondary` | Secondary charts (teal) |
| Tertiary | `#6366F1` | `--color-tertiary` | Tertiary accents (indigo) |
| Text Primary | `#171717` | `--color-text` | Headlines, values |
| Text Secondary | `#6B7280` | `--color-text-muted` | Labels, captions |
| Up/Positive | `#16A34A` | `--color-up` | Price increase |
| Down/Negative | `#DC2626` | `--color-down` | Price decrease |
| Border | `#E5E7EB` | `--color-border` | Card borders |
| Surface | `#FAFAFA` | `--color-surface` | Card backgrounds |
| Background | `#FFFFFF` | `--color-bg` | Page background |

---

## Page Structure

```
/dashboard-v2
│
├── Header (sticky)
│   ├── Logo: "YUMYUM" (bold text)
│   ├── Pixel mascots: doge, pepe, robot
│   ├── Nav: 시장지표 (active), 일정 •2, About
│   ├── Social: YouTube (red), Telegram (blue)
│   └── Admin button (lime bg)
│
├── ETH Section
│   ├── Row 1: ETH Price card (full width, area chart, pixel ETH)
│   ├── Row 2: 공급량 | 총 예치량 (50/50, sparklines)
│   └── Row 3: 소각 vs 발행 (full width, grouped bar)
│
├── RWA Section
│   ├── Row 1: RWA 총액 | 체인별 RWA (50/50, pixel building)
│   └── Row 2: 카테고리별 RWA (full width, horizontal bars)
│
├── ETF Section
│   ├── Row 1: ETH ETF 자금흐름 | ETH 보유량 (50/50, pixel doge-suit)
│   └── Row 2: BTC ETF 자금흐름 (full width, bar chart)
│
├── Market Section
│   ├── Row 1: 5 metric cards (pixel icons each)
│   │   ├── 비트코인 현재가 (bitcoin.png)
│   │   ├── BTC 도미넌스 (pepe.png)
│   │   ├── 공포 탐욕 지수 (gauge only, NO icon)
│   │   ├── ETH/BTC 비율 (bitcoin.png + ethereum.png)
│   │   └── 스테이블코인 시가총액 (usdt.png + usdc.png)
│   └── Row 2: 체인별 스테이블코인 (segmented bar)
│
└── Footer
    ├── Copyright: © 2026 얌얌코인
    ├── Data sources
    ├── Last updated timestamp
    └── Chat bubble (floating, bottom-right)
```

---

## Components Structure

```
components/v2/
├── V2Header.tsx              ✅ created
├── V2Footer.tsx
├── V2Page.tsx
│
├── sections/
│   ├── EthSection.tsx
│   ├── RwaSection.tsx
│   ├── EtfSection.tsx
│   └── MarketSection.tsx
│
├── cards/
│   ├── PriceAreaCard.tsx     # ETH price + area chart + icon
│   ├── StatCard.tsx          # Supply, TVL (with sparkline)
│   ├── RwaTotalCard.tsx      # RWA total with icon
│   ├── HorizontalBarCard.tsx # RWA by chain/category, ETH holdings
│   ├── EtfFlowCard.tsx       # Bar chart + inflow/outflow
│   ├── MetricCard.tsx        # Market section cards
│   └── SegmentedBarStrip.tsx # Stablecoin by chain
│
└── charts/
    ├── AreaChart.tsx
    ├── Sparkline.tsx
    ├── GroupedBarChart.tsx   # Burn vs Issuance
    ├── HorizontalBar.tsx
    ├── VerticalBarChart.tsx  # ETF flows
    ├── GaugeChart.tsx        # Fear & Greed
    └── SegmentedBar.tsx
```

---

## Charts Specification

| Chart | Component | Data Shape | Colors |
|-------|-----------|------------|--------|
| ETH Price | `AreaChart` | `[{date, price}]` | Line: `#B8C20A`, Fill: `#E7F60E` (solid) |
| Supply | `AreaChart` (sparkline) | `[{day, value}]` | Line/Fill: `#0D9488` (teal, 20% opacity) |
| TVL | `AreaChart` (sparkline) | `[{day, value}]` | Line/Fill: `#6366F1` (indigo, 20% opacity) |
| Burn vs Issuance | `GroupedBarChart` | `[{date, burn, issuance}]` | Burn: `#E7F60E`, Issuance: `#9CA3AF` |
| RWA by Chain | `HorizontalBar` | `[{name, value, pct}]` | Gradient from `#E7F60E` |
| RWA by Category | `HorizontalBar` | `[{name, value, pct}]` | `#E7F60E` |
| ETH ETF Flow | `VerticalBarChart` | `[{date, value}]` | Pos: `#E7F60E`, Neg: `#DC2626` |
| ETH Holdings | `HorizontalBar` | `[{name, value, pct}]` | `#E7F60E`, `#0D9488`, `#6366F1`, `#9CA3AF` |
| BTC ETF Flow | `VerticalBarChart` | `[{date, net, fund1, fund2}]` | Multi-color legend |
| Fear & Greed | `GaugeChart` | `{value: 0-100}` | Red→Orange→Lime→Green |
| Stablecoin Chain | `SegmentedBar` | `[{name, value, pct}]` | `#E7F60E`, `#0D9488`, `#6366F1`, `#9CA3AF`, `#D1D5DB` |

---

## Build Steps

### Phase 1: Aesthetic Preview ✅ COMPLETE
- [x] Receive pixel art assets from user ✅
- [x] Create static preview page with assets ✅
- [x] Header with logo, mascots, nav, social icons ✅
- [x] ETH Section with mock data ✅
  - [x] ETH Price card (AreaChart, solid lime fill)
  - [x] Supply card (sparkline with fill, teal)
  - [x] TVL card (sparkline with fill, indigo)
  - [x] Burn vs Issuance card (grouped BarChart)
- [x] RWA Section ✅
  - [x] RWA Total card with bank icon
  - [x] Chain breakdown (horizontal bars)
  - [x] Category breakdown (horizontal bars with background)
- [x] ETF Section ✅
  - [x] ETH ETF Flow card (bar chart + doge-suit)
  - [x] ETH Holdings card (horizontal bars)
  - [x] BTC ETF Flow card (bar chart)
- [x] Market Section ✅
  - [x] 5 metric cards (BTC price, dominance, fear/greed gauge, ETH/BTC, stablecoin)
  - [x] Stablecoin by chain (segmented bar)
- [x] Footer with data sources ✅
- [x] Floating chat bubble with toggle panel ✅

### Phase 2: Chart Components
- [ ] Install Recharts (`npm install recharts`)
- [ ] Build `AreaChart.tsx`
- [ ] Build `Sparkline.tsx`
- [ ] Build `GroupedBarChart.tsx`
- [ ] Build `HorizontalBar.tsx`
- [ ] Build `VerticalBarChart.tsx`
- [ ] Build `GaugeChart.tsx`
- [ ] Build `SegmentedBar.tsx`

### Phase 3: Card Components
- [ ] Build `PriceAreaCard.tsx`
- [ ] Build `StatCard.tsx`
- [ ] Build `RwaTotalCard.tsx`
- [ ] Build `HorizontalBarCard.tsx`
- [ ] Build `EtfFlowCard.tsx`
- [ ] Build `MetricCard.tsx`
- [ ] Build `SegmentedBarStrip.tsx`

### Phase 4: Section Assembly
- [ ] Build `EthSection.tsx`
- [ ] Build `RwaSection.tsx`
- [ ] Build `EtfSection.tsx`
- [ ] Build `MarketSection.tsx`

### Phase 5: Page Assembly
- [ ] Create `/app/dashboard-v2/page.tsx`
- [ ] Assemble all sections
- [ ] Add `V2Footer.tsx`
- [ ] Test responsive behavior

### Phase 6: Data Integration
- [ ] Create mock data files
- [ ] Wire to existing fetchers (`/lib/fetchers/`)
- [ ] Add loading states
- [ ] Add error handling

### Phase 7: Polish
- [ ] Add hover interactions
- [ ] Add tooltips to charts
- [ ] Add animations/transitions
- [ ] Test on mobile

### Phase 8: Migration
- [ ] Replace `/dashboard` with V2
- [ ] Update redirects
- [ ] Remove old components

---

## Dependencies

```json
{
  "recharts": "^2.x"
}
```

Install command:
```bash
npm install recharts
```

---

## File Locations

| Type | Path |
|------|------|
| Assets | `/public/assets/pixels/` |
| Components | `/components/v2/` |
| Page | `/app/dashboard-v2/page.tsx` |
| Reference Image | `/docs/yumyum-board-cand-1.png` |
| This Plan | `/docs/v2-dashboard-implementation.md` |
