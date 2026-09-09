# 산길 가이드 — 등산 pSEO

한국 100대명산(산림청 지정)의 등산코스·소요시간·난이도·교통·계절 정보를 산마다 한 페이지로
자동 생성하는 정적 사이트. 광고(구글 애드센스) + 제휴(쿠팡 파트너스, 숙박)로 수익화한다.

- 데이터: 산림청 국립자연휴양림관리소 · 숲나들e 100대명산 정보 (data.go.kr/data/15112801, 이용허락범위 제한 없음)
- 프레임워크: Astro (정적 빌드), 클라이언트 JS는 애드센스 스크립트뿐
- 페이지 수: 105 (홈 + 목록 + 100산 + about/privacy + sitemap/rss/robots)

## 구조

```
data/raw/100대명산_산림청_20250421.csv   원본 데이터 (커밋됨)
scripts/build-data.mjs                    CSV -> src/data/mountains.json 정규화
src/data/gear.json                        쿠팡 장비 추천 슬롯 (수동 편집)
src/consts.mjs                            사이트/수익화 설정 (env 로 주입)
src/pages/san/[slug].astro                산별 상세 페이지 템플릿
src/components/                           AdSlot / CoupangGear / LodgingBlock / CourseTable
```

## 로컬 실행

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # dist/ 생성 (npm run data 가 선행됨)
```

## 수익화 슬롯 (환경변수)

값이 없으면 자리표시자만 렌더된다. Vercel 프로젝트 환경변수에 넣는다.

| 변수 | 용도 |
|------|------|
| `SITE_URL` | 배포 도메인 (예: `https://산이름.com`). canonical/sitemap 에 사용 |
| `PUBLIC_ADSENSE_CLIENT` | 애드센스 승인 후 `ca-pub-…` |
| `PUBLIC_ADSENSE_SLOT_INARTICLE` | 본문 광고 단위 슬롯 ID |
| `PUBLIC_ADSENSE_SLOT_FOOTER` | 하단 광고 단위 슬롯 ID |
| `PUBLIC_COUPANG_TAG` | 쿠팡 파트너스 트래킹 ID (`AF…`) |
| `PUBLIC_LODGING_PARTNER` | 숙박 제휴 파라미터 (`key=value`), 없으면 일반 검색 링크 |

`src/data/gear.json` 의 `url` 을 쿠팡 파트너스 대시보드에서 만든 실제 딥링크로 바꾸면
전환 추적이 정확해진다. 지금은 쿠팡 검색결과 링크가 기본값.

## 배포 (Vercel)

1. 이 폴더를 GitHub 저장소로 push
2. vercel.com → New Project → 저장소 선택 → Framework: Astro 자동 인식 → Deploy
3. 배포 후 도메인 확인, 환경변수 `SITE_URL` 을 그 도메인으로 설정하고 재배포
4. Google Search Console 에 도메인 등록 → `sitemap.xml` 제출

## 수익화 진행 순서

1. **쿠팡 파트너스 먼저 신청** (`partners.coupang.com`). 승인 빠름. 승인 후 `PUBLIC_COUPANG_TAG` 설정.
2. 사이트 배포 + Search Console 색인 요청. 색인·순위 형성에 수개월.
3. 실제 방문자가 쌓이면 **구글 애드센스 신청**. about/privacy 페이지는 이미 있음.
   승인 후 `PUBLIC_ADSENSE_*` 설정.
4. 숙박 제휴(여기어때 파트너스 / 아고다) 가입 후 `PUBLIC_LODGING_PARTNER` 설정.

## 품질 관리 (얇은 콘텐츠 방어)

- 현재 모든 페이지는 고유 프로즈 600자 이상 + 코스표 1~4개 + 교통/계절/내부링크를 갖는다.
- 색인이 잘 되는 상위 10~20개 산은 **직접 다녀온 실측 코멘트**(들머리 찾기, 주차 만차 시간대,
  실제 소요시간 편차, 화장실/식수 위치)를 문단으로 추가할 것. pSEO 페이지가 검색에서 살아남는
  핵심은 이 고유 정보다.
- 안전 정보(거리·소요시간·난이도)는 원본을 왜곡 없이 사용. `notice` 박스로 현장 확인 안내.

## 확장 (품질 확인 후)

- `[산] × [계절]` 페이지: 100산 × 4계절 = 400페이지
- `[산] × [난이도/초보]` 페이지
- 데이터 소스 추가: 전국등산로표준데이터(2,919건, data.go.kr/data/15029184)로 국립공원 외 산 확대
