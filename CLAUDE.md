# CLAUDE.md - YUMYUM Weekly Dashboard

## 프로젝트 개요

**프로젝트명:** YUMYUM Weekly Dashboard  
**목적:** 크립토 시장 주간 지표 대시보드 (팀 내부용, 3명)  
**채널:** 얌얌코인 유튜브/텔레그램 채널의 주간 시황 콘텐츠 제작 지원

## 기술 스택

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS
- **Data Fetching:** TypeScript API Routes → 외부 API 호출
- **Storage:** Vercel KV (Redis 기반 key-value 스토리지)
- **Hosting:** Vercel (무료 tier)

## 디자인 가이드

- **스타일:** Notion 스타일 기반, 대시보드 밀도 (여백 최소화, 정보 밀도 높게)
- **모드:** 라이트 모드 only
- **폰트:** Inter (영문) + Pretendard (한글)
- **숫자:** tabular-nums (고정폭)
- **테이블:** border 없이, hover 시 배경색 변경, stripe 패턴, compact row height
- **컬러 코딩:** 상승 🟢, 하락 🔴, 중립 ⚪
- **로고:** 좌상단에 `yumyumcoin_single_banner.webp` (40~48px), full 버전: `yumyumcoin_full_banner.webp`

## 데이터 구조

### Section 1: 암호화폐 시장 (crypto_market)
| 지표 | 키 | 소스 | 메서드 |
|------|-----|------|--------|
| BTC Price | btc_price | Binance | API |
| ETH Price | eth_price | Binance | API |
| BTC Dominance | btc_dominance | CoinGecko | API |
| BTC/Gold | btc_gold_ratio | 계산 | BTC ÷ Gold |
| ETH/BTC | eth_btc_ratio | 계산 | ETH ÷ BTC |
| Fear & Greed | fear_greed | Alternative.me | API |
| Realized Vol 7D | vol_7d | Yahoo Finance | 계산 |
| Realized Vol 30D | vol_30d | Yahoo Finance | 계산 |
| MSTR | mstr | Yahoo Finance | MSTR |
| BMNR | bmnr | Yahoo Finance | BMNR |
| CME Gap | cme_gap | Yahoo Finance | BTC=F 계산 |

### Section 2: 자금흐름 (fund_flow)
| 지표 | 키 | 소스 | 메서드 |
|------|-----|------|--------|
| BTC ETF Net Inflow | btc_etf_flow | Manual | DeFiLlama URL |
| ETH ETF Net Inflow | eth_etf_flow | Manual | DeFiLlama URL |
| Stablecoin Supply | stablecoin_supply | DeFiLlama | API |
| ┗ Ethereum | stablecoin_by_chain.ethereum | DeFiLlama | API |
| ┗ Tron | stablecoin_by_chain.tron | DeFiLlama | API |
| ┗ BSC | stablecoin_by_chain.bsc | DeFiLlama | API |
| CEX Net Flow BTC | cex_flow_btc | Manual | Coinglass URL |
| CEX Net Flow ETH | cex_flow_eth | Manual | Coinglass URL |
| Miner Breakeven | miner_breakeven | Manual | MacroMicro URL |
| DeFi Total Borrow | defi_total_borrow | DeFiLlama | API |
| ┗ Top 3 Protocols | defi_top_protocols | DeFiLlama | API |
| BTC Open Interest | btc_oi | Manual | Coinglass URL |
| Long/Short Ratio | long_short_ratio | Manual | Coinglass URL |
| Funding Rate (BTC) | funding_rate | Binance | API |

### Section 3: 매크로 (macro)
| 지표 | 키 | 소스 | 메서드 |
|------|-----|------|--------|
| CPI | cpi | Manual | Investing.com URL |
| PPI | ppi | Manual | Investing.com URL |
| Non-farm Payrolls | nfp | Manual | Investing.com URL |
| Unemployment Rate | unemployment | Manual | Investing.com URL |
| FedWatch Rate | fedwatch_rate | Manual | CME URL |
| SOFR | sofr | Manual | NY Fed URL |
| DXY | dxy | Yahoo Finance | DX-Y.NYB |
| US 10Y | us_10y | Yahoo Finance | ^TNX |
| Gold | gold | Yahoo Finance | GC=F |
| S&P 500 | sp500 | Yahoo Finance | ^GSPC |
| NASDAQ | nasdaq | Yahoo Finance | ^IXIC |
| S&P 500 / NASDAQ | sp500_nasdaq_ratio | 계산 | S&P ÷ NASDAQ |

### JSON 스키마 예시
```json
{
  "updated_at": "2026-01-12T09:30:00+09:00",
  "crypto_market": {
    "btc_price": { "current": 94567, "previous": 91234, "change_pct": 3.65 },
    "eth_price": { "current": 3456, "previous": 3234, "change_pct": 6.86 },
    ...
  },
  "fund_flow": { ... },
  "macro": { ... }
}
```

---

## 개발 계획 (Phase별)

### Phase 1: 프로젝트 셋업
**목표:** Next.js 프로젝트 초기화 및 기본 구조 생성

**작업 내용:**
1. Next.js 15 + TypeScript + Tailwind CSS 프로젝트 생성
2. 폴더 구조 설정
   ```
   /app
     /api
       /fetch-data
         route.ts      (데이터 새로고침 API)
       /data
         route.ts      (데이터 조회 API)
       /update-manual
         route.ts      (수동 필드 업데이트 API)
     /dashboard
       page.tsx
     layout.tsx
     page.tsx (게이트 페이지 - 나중에)
   /components
     /ui
       DataTable.tsx
       SectionHeader.tsx
       ActionButtons.tsx
     Header.tsx
   /lib
     types.ts
     utils.ts
     fetchers/         (데이터 소스별 fetcher 함수)
       binance.ts
       coingecko.ts
       defillama.ts
       yahoo-finance.ts
       ...
   /public
     yumyumcoin_single_banner.webp
     yumyumcoin_full_banner.webp
   ```
3. Tailwind 설정 (tabular-nums, 컬러 등)
4. 샘플 JSON 데이터 생성

**완료 기준:**
- [ ] `npm run dev` 실행 시 빈 페이지 정상 로드
- [ ] Tailwind 스타일 적용 확인
- [ ] 샘플 JSON 파일 존재

---

### Phase 2: UI 컴포넌트 개발
**목표:** 재사용 가능한 UI 컴포넌트 개발

**작업 내용:**
1. `Header.tsx` - 로고 + 타이틀 + 업데이트 시간
2. `SectionHeader.tsx` - 이모지 + 섹션 제목
3. `DataTable.tsx` - 지표 테이블 (지표명, 이전값, 현재값, 변화율)
4. `ActionButtons.tsx` - 새로고침, Excel, 텔레그램 복사 버튼
5. `ChangeIndicator.tsx` - 🟢🔴⚪ + 퍼센트 표시

**컴포넌트 Props 설계:**
```typescript
// DataTable
interface DataTableProps {
  data: {
    label: string;
    current: number | string;
    previous?: number | string;
    change_pct?: number;
    format?: 'currency' | 'percent' | 'number';
  }[];
}

// SectionHeader
interface SectionHeaderProps {
  emoji: string;
  title: string;
}
```

**완료 기준:**
- [ ] 각 컴포넌트 독립적으로 렌더링 확인
- [ ] 샘플 데이터로 테이블 표시 확인
- [ ] 이모지 컬러 코딩 정상 동작

---

### Phase 3: 대시보드 페이지 조립
**목표:** 컴포넌트 조합하여 대시보드 완성

**작업 내용:**
1. `/dashboard/page.tsx` 레이아웃 구성
2. JSON 파일에서 데이터 로드
3. 섹션별 테이블 렌더링
   - 📊 암호화폐 시장
   - 💰 자금흐름
   - 🌍 매크로
4. 반응형 처리 (모바일에서도 테이블 가독성)

**완료 기준:**
- [ ] 3개 섹션 모두 정상 렌더링
- [ ] 숫자 포맷팅 정상 (통화, 퍼센트 등)
- [ ] 모바일에서 가로 스크롤 또는 적절한 레이아웃

---

### Phase 4: Export 기능 구현
**목표:** Excel 다운로드 및 텔레그램 복사 기능

**작업 내용:**
1. Excel Export
   - `xlsx` 라이브러리 사용
   - 파일명: `yumyum_YYYY-MM-DD.xlsx`
   - 섹션별 시트 또는 단일 시트
2. 텔레그램 복사
   - 마크다운 포맷으로 클립보드 복사
   - 포맷 예시:
     ```
     📊 *YUMYUM Weekly* (2026-01-12)
     
     *암호화폐 시장*
     • BTC: $94,567 (🟢+3.6%)
     • ETH: $3,456 (🟢+6.8%)
     ...
     ```
3. 새로고침 버튼 (JSON 재로드)

**완료 기준:**
- [ ] Excel 다운로드 정상 동작
- [ ] 클립보드 복사 후 텔레그램 붙여넣기 확인
- [ ] 새로고침 시 데이터 리로드

---

### Phase 5: 데이터 수집 API (TypeScript)
**목표:** 대시보드에서 버튼 클릭으로 실시간 데이터 수집

**아키텍처:**
```
Dashboard → 🔄 클릭 → /api/fetch-data → 외부 API 호출 → Vercel KV 저장
Dashboard → 페이지 로드 → /api/data → Vercel KV 조회 → 표시
Dashboard → ✏️ 수동 입력 → /api/update-manual → Vercel KV 업데이트
```

**작업 내용:**
1. Vercel KV 설정
   - `@vercel/kv` 패키지 설치
   - Vercel 프로젝트에서 KV 스토리지 생성
   - 환경변수 설정 (KV_REST_API_URL, KV_REST_API_TOKEN)

2. API Routes 구현
   - `/api/data` (GET): KV에서 데이터 조회
   - `/api/fetch-data` (POST): 외부 API 호출 → KV 저장
   - `/api/update-manual` (PATCH): 수동 필드 업데이트

3. Fetcher 함수 구현 (`/lib/fetchers/`)
   - `binance.ts`: BTC/ETH 가격, Long/Short, Funding Rate
   - `coingecko.ts`: BTC Dominance
   - `alternative.ts`: Fear & Greed Index
   - `yahoo-finance.ts`: 주식/지수 (NASDAQ, MSTR, DXY, Gold 등)
   - `defillama.ts`: ETF Flow, Stablecoin Supply, Aave
   - `coinglass.ts`: BTC OI, CEX Flow

4. 에러 처리
   - API 실패 시 `null` 반환 + 에러 상태 저장
   - 대시보드에서 `⚠️ 조회실패` 표시
   - Excel 내보내기 시 에러 필드는 빈 셀

5. 수동 입력 필드
   - Miner Breakeven, FedWatch Rate
   - 대시보드에서 직접 편집 가능 (✏️ 아이콘)
   - `/api/update-manual`로 KV 업데이트

**완료 기준:**
- [ ] 🔄 버튼 클릭 시 모든 API 데이터 새로고침
- [ ] 에러 발생 시 ⚠️ 표시, 다른 필드는 정상 표시
- [ ] 수동 필드 편집 및 저장 동작
- [ ] Vercel KV에 데이터 정상 저장/조회

---

### Phase 6: 배포
**목표:** Vercel 배포 + KV 스토리지 연결

**작업 내용:**
1. Vercel 프로젝트 연결
2. Vercel KV 스토리지 생성 및 연결
3. 환경변수 설정 (KV_REST_API_URL, KV_REST_API_TOKEN)
4. 배포 확인

**운영 흐름:**
```
1. 대시보드 접속
2. 🔄 새로고침 버튼 클릭 → 최신 데이터 fetch
3. 수동 필드 편집 (필요시)
4. 📥 Excel 다운로드 → GDrive 아카이빙
```

**완료 기준:**
- [ ] Vercel 배포 후 대시보드 접근 가능
- [ ] Vercel KV 연결 및 데이터 저장/조회 동작
- [ ] 🔄 버튼으로 실시간 데이터 새로고침 동작

---

### Phase 7 (나중에): 인증 및 추가 기능
**목표:** Telegram OTP 인증, 히스토리 등

**작업 내용 (추후):**
- Telegram Bot OTP 인증
- 데이터 히스토리 저장 (Vercel Postgres 또는 JSON 누적)
- 차트 시각화 (필요 시)

---

## 코딩 규칙

1. **TypeScript:** strict 모드, any 사용 금지
2. **컴포넌트:** 함수형 컴포넌트, Props 인터페이스 명시
3. **스타일:** Tailwind만 사용, inline style 금지
4. **네이밍:**
   - 컴포넌트: PascalCase
   - 함수/변수: camelCase
   - 파일: kebab-case (컴포넌트 제외)
5. **API Routes:**
   - 에러 핸들링 필수 (try-catch)
   - 적절한 HTTP 상태 코드 반환
   - 타입 안전한 응답

## 참고 자료

- 데이터 소스 문서: 이 대화 내 "Final API Sources" 참조

---

## 현재 진행 상태

- [x] Phase 1: 프로젝트 셋업
- [x] Phase 2: UI 컴포넌트 개발
- [x] Phase 3: 대시보드 페이지 조립
- [ ] Phase 4: Export 기능 구현
- [x] Phase 5: 데이터 수집 API (TypeScript)
- [ ] Phase 6: 자동화 및 배포
- [ ] Phase 7: 인증 및 추가 기능 (나중에)
