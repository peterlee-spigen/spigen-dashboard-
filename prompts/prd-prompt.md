# PRD 작성 프롬프트

## [Situation] 내 상황은 이래

슈피겐 독일 법인(Amazon.de 셀러)의 광고·판매·재고·트래픽 데이터 8종을 보유 중입니다.

- **광고**: SP(Sponsored Products), SB(Sponsored Brands), SD(Sponsored Display) 캠페인 일별 데이터
- **판매**: 주문 내역, 상품 리스팅, FBA 재고
- **트래픽**: ASIN별 세션·페이지뷰·Buy Box %·전환율
- **외부 채널 어트리뷰션**: Google Ads, Instagram, Facebook 14일 귀속 데이터

데이터는 `data/` 폴더에 CSV/XLSX로 있고, 통화는 EUR입니다. 기술 스택은 Next.js 16 + TypeScript + Tailwind입니다.

## [Task] 해야하는 일은 이거야

위 8종 데이터를 통합 분석하는 **시각화 대시보드의 PRD**를 작성해 주세요.

## [Intent] 이 일을 해야하는 이유는 이 것 때문이야

현재 셀러는 Amazon Seller Central의 개별 리포트를 일일이 확인해야 해서, 광고 유형·외부 채널을 가로질러 ROAS를 비교하거나 예산 배분을 결정하기 어렵습니다. 하나의 대시보드에서 통합 분석해 의사결정 속도를 높이는 게 목표입니다.

## [Concerns] 이 일을 할 때 이런 부분들이 우려스러워

- 8개 데이터 소스의 조인 키(ASIN/SKU/campaignId)가 일관되지 않을 수 있음
- SP/SB/SD 광고 지표 정의가 달라 단순 합산이 어려움 (예: SP는 7/14/30d 윈도우, Attribution은 14d 고정)
- New-to-Brand, Brand Halo 같은 고급 지표를 어떻게 노출할지
- 1차 출시 범위를 어디까지 자를지

## [Calibration]

더 나은 작업을 위해 제가 더 많은 맥락을 제공하거나 무언가를 업로드해야 한다고 생각되면 알려주고, AskUserQuestion, WebSearch 등 도움이 될 만한 도구가 있다면 액세스 가능한 모든 도구를 사용해 주세요.
