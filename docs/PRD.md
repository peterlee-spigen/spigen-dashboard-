# Spigen DE 통합 광고·판매 대시보드 PRD

**작성일**: 2026-05-12  
**버전**: 0.1 (초안)  
**대상 독자**: 개발팀, 마케팅 운영팀  
**통화**: EUR (유로)

---

## 1. 배경 및 목적

슈피겐 독일 법인(Amazon.de 셀러)은 현재 Seller Central의 8개 개별 리포트를 각각 수동으로 확인한다. SP·SB·SD 광고 유형과 Google Ads·Instagram·Facebook 외부 채널의 ROAS를 가로질러 비교하거나, 재고·트래픽·전환 데이터를 한 화면에서 보는 방법이 없다.

**목표**: 8종 데이터 소스를 단일 대시보드로 통합해 **채널 간 ROAS 비교**, **예산 배분 의사결정**, **재고 위험 감지**를 당일 데이터 기준으로 수행할 수 있도록 한다.

---

## 2. 데이터 소스 현황

### 2.1 소스별 스키마 요약

| # | 파일 | 날짜 포맷 | 핵심 조인 키 | 주요 지표 |
|---|------|-----------|-------------|-----------|
| 1 | `spCampaigns` | `YYYY-MM-DD` | `campaignId`, `date` | spend, impressions, clicks, sales(1/7/14/30d), purchases, ROAS |
| 2 | `sbCampaigns` | `YYYY-MM-DD` | `campaignId`, `date` | cost, clicks, salesClicks, newToBrandSales, detailPageViews, VCPM·CPC |
| 3 | `sdCampaigns` | `YYYY-MM-DD` | `campaignId`, `date` | cost, clicks, salesClicks(CPC)/impressionsViews(VCPM), cumulativeReach, newToBrand |
| 4 | `attribution` | `YYYYMMDD` ⚠️ | `campaignId`, `productAsin`, `publisher` | attributedSales14d, attributedPurchases14d, brandHalo*, newToBrand* |
| 5 | `order` | ISO 8601 | `asin`, `sku`, `amazon-order-id` | item-price, quantity, ship-country |
| 6 | `listing` | 수동 기준일 | `asin1`, `seller-sku` | price, status, fulfillment-channel |
| 7 | `inventory` | `YYYYMMDD` | `asin`, `sku` | afn-fulfillable-quantity, afn-total-quantity, afn-reserved-quantity |
| 8 | `traffic` | `YYYYMMDD` | `(Child) ASIN` | sessions, page views, buy box %, unit session % (전환율) |

### 2.2 조인 키 불일치 및 해소 전략

**문제**

- 날짜 포맷이 3가지(`YYYY-MM-DD`, `YYYYMMDD`, ISO 8601)로 혼재 → 수집 파이프라인에서 `YYYY-MM-DD`로 정규화
- Attribution의 날짜 컬럼명이 `date`이지만 값은 `20260301` 형식
- Traffic은 `(Parent) ASIN` + `(Child) ASIN` 쌍으로 제공 → Child ASIN을 Product 조인 키로 사용
- Listing의 ASIN 컬럼명이 `asin1`이고 `asin2`, `asin3`도 존재 → `asin1`을 기본 키로 사용

**조인 키 계층**

```
Product 레벨: ASIN  (traffic.child_asin = attribution.productAsin = inventory.asin = listing.asin1 = order.asin)
Variant 레벨: SKU   (order.sku = inventory.sku = listing.seller-sku)
Campaign 레벨: campaignId  (spCampaigns = sbCampaigns = sdCampaigns = attribution.campaignId)
```

### 2.3 Attribution 윈도우 불일치

| 광고 유형 | 귀속 윈도우 |
|-----------|------------|
| SP | 1d / 7d / 14d / 30d (클릭 기반) |
| SB | 클릭 기반 salesClicks (단일 윈도우) |
| SD | 클릭(CPC) + 노출(VCPM) 분리 |
| Attribution (외부 채널) | **14d 고정** (Google/Instagram/Facebook) |

→ 채널 간 비교 시 **SP 14d 윈도우**를 기준으로 통일. 나머지 윈도우는 드릴다운 탭에서 노출.  
→ SP 14d와 Attribution 14d를 합산할 때 **이중 계산(double-count) 위험**이 있으므로, 두 수치를 별도 행으로 병치하고 합산 지표는 제공하지 않는다.

---

## 3. 사용자 및 목표

### 3.1 주요 사용자

- **광고 매니저**: 채널별 ROAS·CPC·CTR을 일별로 비교, 예산 조정 의사결정
- **이커머스 매니저**: 매출·전환율·Buy Box 점유율 모니터링, 재고 위험 감지
- **경영진**: 주간·월간 요약 KPI 확인

### 3.2 핵심 사용자 스토리 (1차 출시 범위)

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| U1 | 광고 매니저 | SP·SB·SD·외부채널 ROAS를 같은 기간 같은 화면에서 비교하고 싶다 | 채널 예산 배분을 주간 단위로 조정할 수 있다 |
| U2 | 광고 매니저 | ASIN별로 어떤 캠페인이 판매에 기여하는지 보고 싶다 | 비효율 캠페인을 일시정지하거나 입찰가를 올릴 수 있다 |
| U3 | 이커머스 매니저 | 재고 수량이 적은 ASIN을 즉시 식별하고 싶다 | 품절 전에 FBA 보충 발주를 낼 수 있다 |
| U4 | 이커머스 매니저 | Buy Box 점유율이 낮은 ASIN을 트래픽·전환율과 함께 보고 싶다 | 가격 또는 재고 문제를 원인별로 구분할 수 있다 |
| U5 | 경영진 | 주간 총매출, 총광고비, 전체 ROAS를 한 화면에서 보고 싶다 | 사업 현황을 빠르게 파악할 수 있다 |

---

## 4. 기능 명세

### 4.1 전역 필터 (모든 화면 공통)

- **날짜 범위**: 오늘 / 최근 7일 / 최근 14일 / 최근 30일 / 직접 입력
- **광고 유형**: SP / SB / SD / 외부채널 (멀티 선택)
- **캠페인 상태**: ENABLED / PAUSED / 전체
- **ASIN 검색**: 자유 텍스트 (ASIN 또는 상품명)

### 4.2 화면 구성

#### Screen 1: Executive Summary (홈)

**목적**: 전체 사업 KPI를 한눈에 파악

**KPI 카드 (상단)**

| 지표 | 계산 | 비고 |
|------|------|------|
| 총매출 | orders.item-price 합계 | 선택 기간, EUR |
| 총광고비 | SP.spend + SB.cost + SD.cost | EUR |
| 통합 ROAS | (SP.sales14d + SB.salesClicks + SD.salesClicks) / 총광고비 | SP 14d 기준, Attribution 별도 표기 |
| 총 클릭 | SP.clicks + SB.clicks + SD.clicks | |
| 평균 CTR | 총클릭 / 총노출 | |
| Buy Box 평균 | traffic.FeaturedOffer(BuyBox)% 가중평균 | 세션 수 가중 |

**추세 차트**: 일별 매출 vs 광고비 (이중 Y축 라인 차트)

**채널별 ROAS 바 차트**: SP · SB · SD · Google Ads · Instagram · Facebook (Attribution 14d)

---

#### Screen 2: 광고 성과 분석

**목적**: 광고 유형·캠페인·ASIN별 성과 비교

**2-A: 채널 비교 뷰**

- 테이블: 광고유형 | 노출 | 클릭 | CTR | 광고비 | 귀속매출 | ROAS | CPC
- SP: 1d/7d/14d/30d 탭 전환 가능. 기본 14d
- SB/SD: 클릭 귀속 기본 노출(VCPM) 토글
- Attribution: 14d 고정, publisher(Google Ads/Instagram/Facebook) 행 분리

> ⚠️ SP 14d와 Attribution 14d를 합산하지 않음. 각 행에 "(SP)", "(Attribution)" 레이블 표시

**2-B: 캠페인 드릴다운**

- 선택한 광고 유형의 캠페인 목록 테이블
- 컬럼: 캠페인명 | 상태 | 예산(EUR) | 예산 유형 | 광고비 | ROAS | 클릭 | Top-of-Search 노출 점유율
- 정렬: ROAS 내림차순 기본

**2-C: ASIN별 광고 기여 (Attribution 중심)**

- Attribution 데이터 기준: productAsin × publisher 조합
- 컬럼: ASIN | 상품명 | publisher | attributedSales14d | attributedPurchases14d | Brand Halo 매출 | NTB 매출 | NTB 구매 건수
- Brand Halo / NTB 컬럼은 툴팁으로 정의 설명 제공

---

#### Screen 3: 상품 성과 분석

**목적**: ASIN·SKU 단위 매출·트래픽·전환 통합 뷰

**3-A: ASIN 종합 테이블**

컬럼:

| 컬럼 | 소스 | 비고 |
|------|------|------|
| ASIN / 상품명 | listing | asin1, item-name |
| 현재가 (EUR) | listing | price |
| FBA 가용재고 | inventory | afn-fulfillable-quantity |
| 재고 위험 | 산출 | afn-fulfillable-quantity < 임계값 → 🔴 표시 |
| 세션 (총) | traffic | Sessions - Total |
| 페이지뷰 | traffic | Page Views - Total |
| Buy Box % | traffic | Featured Offer (Buy Box) Percentage |
| 전환율 | traffic | Unit session percentage |
| 주문 수 | orders | quantity 합계 |
| 매출 (EUR) | orders | item-price 합계 |

정렬 기본: 매출 내림차순

**3-B: ASIN 상세 (드릴다운)**

ASIN 클릭 시 모달 또는 슬라이드오버:
- 매출 추세 (일별 라인 차트, orders 기준)
- 세션 · 전환율 추세 (일별, traffic 기준)
- 연결된 캠페인 목록 (SP/SB/SD, Attribution)
- 재고 추이 (inventory report_date 기준)
- 배송 국가 분포 (orders.ship-country, 파이 차트)

---

#### Screen 4: 재고 관리

**목적**: FBA 재고 위험 ASIN 조기 감지

**재고 요약 카드**

- 전체 SKU 수 | 가용 재고 0 SKU 수 | 입고 예정 SKU 수

**재고 테이블**

| 컬럼 | 소스 |
|------|------|
| SKU / ASIN / 상품명 | inventory |
| 현재가 (EUR) | inventory.your-price |
| 가용 (afn-fulfillable) | inventory |
| 예약됨 (afn-reserved) | inventory |
| 입고 중 (working+shipped+receiving) | inventory |
| 총재고 (afn-total) | inventory |
| 상태 | listing.status |
| 위험도 | 산출 (가용/7일 판매량 < N일치 → 위험) |

위험도 임계값: 1차 출시에서 하드코딩(예: 14일치). 2차에서 셀러 설정 가능하게 변경.

---

#### Screen 5: 트래픽 분석

**목적**: 세션·페이지뷰·Buy Box 추세 모니터링

- 일별 총 세션 / 페이지뷰 추세 (라인 차트)
- Buy Box % 분포 히스토그램 (ASIN별)
- Buy Box < 80% ASIN 목록 (클릭 시 ASIN 상세로 이동)
- 모바일 앱 vs 브라우저 세션 비율 (스택 바 차트)

---

### 4.3 고급 지표 처리

**New-to-Brand (NTB)**

- 출처: SB (`newToBrandSales`, `newToBrandPurchases`, `newToBrandPurchasesPercentage`), SD (`newToBrandSales`), Attribution (`attributedNewToBrandSales14d`)
- 1차 출시: Screen 2-C의 Attribution 테이블에만 노출
- 2차 출시: SB/SD NTB 지표 추가, 채널 간 NTB ROAS 비교

**Brand Halo**

- 출처: Attribution (`brandHaloAttributedSales14d`, `brandHaloAttributedPurchases14d`, `brandHaloNewToBrandSales14d`)
- 1차 출시: Screen 2-C 테이블 컬럼으로 노출 + 툴팁 정의 제공
- 정의 툴팁: "Brand Halo는 광고된 상품이 아닌 동일 브랜드 다른 상품의 구매에 귀속된 매출입니다."

**VCPM (SD) 전환 처리**

- SD는 CPC(`clicks` 기반)와 VCPM(`impressionsViews` 기반) 두 cost type이 혼재
- ROAS 계산 시 CPC는 `salesClicks`, VCPM은 `salesPromotedClicks` 사용
- 테이블에 costType 컬럼 노출, 사용자가 필터링 가능

---

## 5. 데이터 파이프라인 요구사항

### 5.1 날짜 정규화

```
spCampaigns.date       "2026-03-01"    → Date("2026-03-01")
sbCampaigns.date       "2026-03-01"    → Date("2026-03-01")
sdCampaigns.date       "2026-03-01"    → Date("2026-03-01")
attribution.date       "20260301"      → Date("2026-03-01")  ← 파싱 필요
inventory.report_date  "20260301"      → Date("2026-03-01")  ← 파싱 필요
traffic.report_date    "20260301"      → Date("2026-03-01")  ← 파싱 필요
order.purchase-date    ISO 8601        → Date (UTC 기준 절사)
```

### 5.2 ASIN 정규화

- `listing.asin1`을 기본 ASIN 키로 사용
- `listing.asin2`, `asin3`은 alias 테이블로 관리 (2차 출시)
- `traffic.(Child) ASIN`이 기준 조인 키, `(Parent) ASIN`은 참조용

### 5.3 데이터 로딩 방식 (1차 출시)

- CSV/XLSX 파일 업로드 → 서버에서 파싱 → 인메모리 또는 SQLite 저장
- 새 파일 업로드 시 동일 날짜 데이터 덮어쓰기
- 파일 형식 검증: 필수 컬럼 존재 여부 체크 후 오류 메시지 반환

### 5.4 파생 지표 계산

```
ROAS (SP)       = sales14d / spend          (spend > 0 조건)
ROAS (SB)       = salesClicks / cost
ROAS (SD·CPC)   = salesClicks / cost
ROAS (Attribution) = attributedSales14d / (광고비는 별도 매핑 필요 — 1차 미지원)
CTR             = clicks / impressions * 100
CPC             = cost / clicks
전환율          = unitsSoldClicks14d / clicks  (SP 기준)
재고 위험일수   = afn-fulfillable-quantity / (최근 7일 판매량 / 7)
```

> Attribution ROAS는 외부 채널 광고비가 현재 데이터셋에 없어 1차 출시에서 **매출만 표시**, ROAS 계산 미지원. 2차에서 광고비 수기 입력 또는 API 연동 추가.

---

## 6. 기술 스택 및 아키텍처

- **프레임워크**: Next.js 16 (App Router) + TypeScript
- **스타일**: Tailwind CSS (다크·라이트 모드 대응)
- **차트**: Recharts 또는 Tremor (라이선스 확인 후 선택)
- **데이터 처리**: `papaparse` (CSV), `xlsx` (XLSX 파싱)
- **상태 관리**: Zustand (전역 필터 상태)
- **저장**: 1차는 서버 메모리 / Route Handler 캐시, 2차에서 DB 연동

---

## 7. 출시 범위 및 로드맵

### Phase 1 (1차 출시) — 4주

| 우선순위 | 기능 | 포함 여부 |
|---------|------|----------|
| 필수 | Executive Summary 화면 | ✅ |
| 필수 | 광고 채널별 ROAS 비교 (SP/SB/SD/Attribution) | ✅ |
| 필수 | ASIN 종합 테이블 (매출·재고·트래픽) | ✅ |
| 필수 | 재고 위험 ASIN 목록 | ✅ |
| 필수 | CSV/XLSX 파일 업로드 | ✅ |
| 필수 | 날짜 범위 필터 | ✅ |
| 제외 | Attribution ROAS (외부 채널 광고비 미보유) | ❌ |
| 제외 | SB/SD NTB 채널 간 비교 | ❌ |
| 제외 | 재고 위험 임계값 설정 UI | ❌ |
| 제외 | 배송 국가 분포 차트 | ❌ |
| 제외 | asin2/asin3 alias 처리 | ❌ |

### Phase 2 — 추후

- Attribution ROAS (외부 채널 광고비 수기 입력)
- NTB · Brand Halo 채널 간 비교 대시보드
- 재고 위험 임계값 사용자 설정
- DB 연동 (데이터 영속성)
- 자동 파일 수집 (Seller Central API 연동)
- 알림 (재고 임계값 초과 시 이메일/슬랙)

---

## 8. 미결 사항 및 위험

| # | 항목 | 위험도 | 해소 방법 |
|---|------|--------|----------|
| R1 | Attribution의 campaignId가 SP/SB/SD campaignId와 일치하지 않는 경우 | 높음 | 실데이터로 매핑 검증 필요. 불일치 시 캠페인명 매핑 테이블 수동 관리 |
| R2 | SP 14d 귀속 매출 + Attribution 14d 귀속 매출 이중 계산 | 높음 | 합산 지표 미제공, 병치 표시로 결정 |
| R3 | SD의 VCPM 캠페인: 클릭 없이 노출만으로 전환 귀속 → ROAS 과대 가능 | 중간 | costType 필터 제공, 사용자가 CPC만 선택 가능하게 |
| R4 | 외부 채널(Attribution) 광고비 데이터 부재 → ROAS 계산 불가 | 중간 | 1차에서 매출만 표시, Phase 2에서 수기 입력 |
| R5 | 파일 업로드 시 컬럼명 변경(Seller Central UI 업데이트) → 파싱 실패 | 낮음 | 컬럼명 매핑 설정 파일(JSON) 분리, 오류 메시지 명확화 |
| R6 | listing.asin2/asin3 별칭 ASIN이 traffic/inventory에서 기본 키로 쓰이는 경우 | 낮음 | Phase 2에서 alias 처리. 1차에서는 asin1 기준으로만 조인 |

---

## 9. 성공 지표

| 지표 | 목표 |
|------|------|
| 대시보드 로딩 시간 | 초기 렌더 < 2초 (LCP), 필터 변경 후 업데이트 < 500ms |
| 데이터 커버리지 | 업로드된 ASIN 중 traffic·inventory·orders 3종 조인 성공률 ≥ 90% |
| 사용 전환 | 광고 매니저가 Seller Central 없이 대시보드만으로 주간 예산 조정 의사결정 가능 |
| 재고 감지 | 품절 ASIN을 발생 72시간 전 대시보드에서 식별 가능 |

---

## 10. 부록: 지표 정의 용어집

| 용어 | 정의 |
|------|------|
| **ROAS** | Return on Ad Spend. 광고비 1EUR당 귀속 매출 |
| **Top-of-Search 노출 점유율** | SP `topOfSearchImpressionShare`. 검색 상단 노출 중 자사 캠페인 비율 |
| **New-to-Brand (NTB)** | 과거 12개월 내 해당 브랜드 첫 구매 고객의 주문 |
| **Brand Halo** | 광고된 ASIN이 아닌 동일 브랜드 다른 ASIN에 귀속된 구매 |
| **Buy Box %** | 해당 ASIN의 구매 버튼을 자사 셀러가 점유한 비율 |
| **Unit Session %** | 세션 대비 주문 수 비율 (Amazon 기준 전환율) |
| **afn-fulfillable-quantity** | Amazon FBA 창고에서 즉시 출고 가능한 수량 |
| **Attribution 14d** | 광고 클릭 후 14일 내 발생한 구매를 해당 채널에 귀속하는 방식 |
| **VCPM** | Viewable CPM. 노출 1,000회 기준 과금 (SD에서 사용) |
