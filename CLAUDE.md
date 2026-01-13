# CLAUDE.md - YUMYUM Weekly Dashboard

## 프로젝트 개요

**프로젝트명:** YUMYUM Weekly Dashboard  
**목적:** 크립토 시장 주간 지표 대시보드 (팀 내부용, 3명)  
**채널:** 얌얌코인 유튜브/텔레그램 채널의 주간 시황 콘텐츠 제작 지원

## 기술 스택

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS
- **Data Fetching:** Python 스크립트 → JSON 파일 → Next.js 읽기
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
| Realized Vol 7D | vol_7d | yfinance | 계산 |
| Realized Vol 30D | vol_30d | yfinance | 계산 |
| NASDAQ | nasdaq | yfinance | ^IXIC |
| MSTR | mstr | yfinance | MSTR |
| BMNR | bmnr | yfinance | BMNR |
| CME Gap | cme_gap | yfinance | BTC=F 계산 |

### Section 2: 자금흐름 (fund_flow)
| 지표 | 키 | 소스 | 메서드 |
|------|-----|------|--------|
| BTC ETF Net Inflow | btc_etf_flow | DeFiLlama | API |
| ETH ETF Net Inflow | eth_etf_flow | DeFiLlama | API |
| Stablecoin Supply | stablecoin_supply | DeFiLlama | API |
| Stablecoin by Chain | stablecoin_by_chain | DeFiLlama | API |
| CEX Net Flow BTC | cex_flow_btc | Coinglass | Scrape/Manual |
| CEX Net Flow ETH | cex_flow_eth | Coinglass | Scrape/Manual |
| Miner Breakeven | miner_breakeven | MacroMicro | Manual |
| Aave Total Borrow | aave_borrow | DeFiLlama | API |
| BTC Open Interest | btc_oi | Coinglass | API (Free) |
| Long/Short Ratio | long_short_ratio | Binance | API |
| Funding Rate | funding_rate | Binance | API |

### Section 3: 매크로 (macro)
| 지표 | 키 | 소스 | 메서드 |
|------|-----|------|--------|
| DXY | dxy | yfinance | DX-Y.NYB |
| US 10Y | us_10y | yfinance | ^TNX |
| Gold | gold | yfinance | GC=F |
| S&P 500 | sp500 | yfinance | ^GSPC |
| FedWatch | fedwatch_rate | CME | Manual |

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
     /dashboard
       page.tsx
     layout.tsx
     page.tsx (게이트 페이지 - 나중에)
   /components
     /ui
       DataTable.tsx
       SectionHeader.tsx
       ActionButtons.tsx
       UpdateTime.tsx
     Header.tsx
   /lib
     types.ts
     utils.ts
   /data
     latest.json (샘플 데이터)
   /public
     yumyumcoin_single_banner.webp
     yumyumcoin_full_banner.webp
   /scripts (Python)
     fetch_data.py
     requirements.txt
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

### Phase 5: Python 데이터 수집 스크립트
**목표:** 실제 API에서 데이터 수집하는 Python 스크립트

**작업 내용:**
1. `requirements.txt` 작성
   ```
   yfinance
   requests
   pandas
   numpy
   python-dotenv
   ```
2. `fetch_data.py` 구현
   - 섹션별 함수 분리
   - 에러 핸들링 (API 실패 시 이전 값 유지)
   - JSON 출력
3. 수동 입력 필드 처리 (Miner Breakeven, FedWatch 등)

**API 호출 순서:**
```python
def main():
    data = {
        "updated_at": datetime.now().isoformat(),
        "crypto_market": fetch_crypto_market(),
        "fund_flow": fetch_fund_flow(),
        "macro": fetch_macro()
    }
    save_json(data)
```

**완료 기준:**
- [ ] `python fetch_data.py` 실행 시 `latest.json` 생성
- [ ] 모든 자동화 가능 지표 정상 수집
- [ ] 에러 발생 시 graceful 처리

---

### Phase 6: 배포
**목표:** Vercel 배포

**작업 내용:**
1. Vercel 프로젝트 연결
2. 환경변수 설정 (필요 시)
3. 배포 확인

**운영 흐름:**
```
1. 로컬에서 python scripts/fetch_data.py 실행
2. data/latest.json 업데이트 확인
3. git commit & push
4. Vercel 자동 배포
5. 대시보드에서 Excel 다운로드 → GDrive 아카이빙
```

**완료 기준:**
- [ ] Vercel 배포 후 대시보드 접근 가능
- [ ] 로컬 스크립트 실행 → push → 반영 확인

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
5. **Python:** 
   - Type hints 사용
   - 함수별 docstring
   - Black formatter

## 참고 자료

- 데이터 소스 문서: 이 대화 내 "Final API Sources" 참조

---

## 현재 진행 상태

- [x] Phase 1: 프로젝트 셋업
- [x] Phase 2: UI 컴포넌트 개발
- [x] Phase 3: 대시보드 페이지 조립
- [ ] Phase 4: Export 기능 구현
- [ ] Phase 5: Python 데이터 수집 스크립트
- [ ] Phase 6: 자동화 및 배포
- [ ] Phase 7: 인증 및 추가 기능 (나중에)
