# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

서울 강동구 **삼익그린2차** → 동작구 **사당우성3단지** 이사 의사결정을 위한 개인용 부동산 분석 대시보드. 백엔드 없음, 단일 HTML 파일 2개로 구성.

```
compare.html   입지 비교 대시보드 (A vs B 단지, ~1200줄)
finance.html   재정 계산기 (매도→매수→주담대→현금흐름, ~980줄)
```

## 개발 환경

- 별도 빌드·패키지 매니저 없음. 파일을 편집하면 즉시 반영.
- 미리보기 서버: `http://localhost:5500` (Claude Preview 또는 VS Code Live Server)
- 탭 네비게이션: `compare.html` ↔ `finance.html` 상단 탭으로 연결

## compare.html 구조

### 상단 상수 (line ~143–151)
```js
const KAKAO_REST_API_KEY = "...";   // 카카오 REST API
const MOLIT_API_KEY      = "...";   // 국토부 실거래가 (URL-encoded)
const NEIS_API_KEY       = "...";   // 학교알리미
const SEOUL_AIR_API_KEY  = "...";   // 서울시 대기환경
const A = { name:'삼익그린2차',   lat:37.5526, lng:127.1485, lawdCd:'11740', aptKw:'삼익그린2차' };
const B = { name:'사당우성3단지', lat:37.4899, lng:126.9759, lawdCd:'11590', aptKw:'우성3' };
```

### 섹션 순서
1. 위치 지도 (Leaflet + OpenStreetMap — 카카오 정적맵 CORS 이슈로 대체)
2. 단지 기본정보 (하드코딩)
3. 교통 비교 (하드코딩)
4. 주차·전기차 (하드코딩)
5. 반경 1km 시설 (카카오 카테고리 API, 14개 병렬 요청)
6. 평면도 비교 (하드코딩)
7. 실거래가 추이 (국토부 RTMS, corsproxy.io 경유)
8. 학군 비교 (NEIS + 하드코딩)
9. 직주근접성·가족 접근성 (하드코딩)
10. 치안 (샘플 데이터 — 경찰청 API 엔드포인트 미확인)
11. 대기환경 (서울시 실시간 PM2.5)
12. 투자가치 비교 (하드코딩)
13. AI 분석 (Claude API 직접 호출 — `anthropic-dangerous-direct-browser-access: true` 헤더 사용)
14. 종합점수 카드

### API 호출 패턴
- 카카오 시설검색: `KakaoAK` 헤더, 브라우저 직접 호출 가능
- 국토부 실거래가: CORS 차단 → `corsproxy.io/?url=` 경유, XML 파싱 후 `parseMolitXml()`로 아파트명·전용면적 필터
- 서울시 대기: HTTP 엔드포인트 → 브라우저 혼합콘텐츠 차단 가능, 샘플 폴백 있음
- Claude API: `fetch('https://api.anthropic.com/v1/messages')`, 사용자가 API 키 입력

### 섹션 태그 관례
```html
<span class="tag tag-live">실데이터</span>    <!-- API 성공 -->
<span class="tag tag-sample">샘플데이터</span> <!-- 폴백 -->
<span class="tag tag-hard">하드코딩</span>     <!-- 정적 데이터 -->
```

## finance.html 구조

### 계산 흐름 (calc() 함수, 단방향)
```
S1 매도  →  saleGross (세후 수령예정, 부채 차감 전)
S2 매수  →  buyCostBase (순수 매수비용, 영유비·주담대 제외)
S3 주담대 필요액 산출
         →  debtTotal (선택 부채 합계)
         →  availCash = saleGross - debtTotal
         →  daycareIncluded = 분기수 × 789만원
         →  minLoan = (buyCostBase + daycareIncluded) - availCash
         →  monthlyPayment (원리금균등)
S4 주담대 한도 검증 (LTV / DSR)
         →  DSR 기존부채: 체크박스 무관, 항상 전액 포함 (대출신청 시점 기준)
         →  현금흐름 기타부채: 체크박스 연동 (실제 상환 여부 반영)
S5 영유비 운용  →  분기별 파킹통장 이자 vs 주담대 이자 비교
S6 월 현금흐름  →  영유기간 중 / 영유 후 대비
S7 절세·투자   →  연금저축·IRP·ISA 세액공제
S8 리모델링    →  분담금·이주비 → 투자수익률
```

### 핵심 설계 원칙
- 모든 입력: `<input oninput="calc()">` → 값 변경 시 전체 재계산
- 부채 상환 체크박스: **S3 가용자금·최소주담대**에만 영향. DSR(S4)은 항상 상환 전 전액 기준.
- 영유비 포함 분기수·분기금액 입력은 S3에만 있음 (S5 영유비 운용 섹션은 S3 값 참조)
- 공동명의 토글: 양도세를 인당 50% 분리 계산 후 합산

### 주요 계산 함수
```js
calcBrokerageFee(price)          // 2025년 서울 중개보수 (부가세 포함)
calcTransferTax(taxBase)         // 양도세 구간세율
calcMonthlyPayment(p, r, years)  // 원리금균등 월납입
calcLoanFromMonthly(mp, r, years) // DSR 역산 대출한도
```

## 하드코딩 데이터 업데이트 시 주의사항

- **삼익그린2차 재건축**: 정밀안전진단 진행 상황 변경 시 `compare.html` 단지기본정보 카드 수정
- **사당우성3단지 리모델링**: 이주·준공 일정 변경 시 `.remodel` 블록 및 투자가치 표 수정
- **법정동 코드**: `lawdCd` — 강동구 `11740`, 동작구 `11590` (국토부 API 필터)
- **실거래 아파트명 키워드**: `aptKw` — `'삼익그린2차'`, `'우성3'` (XML `<아파트>` 태그 부분일치)
