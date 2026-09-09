// 사이트 전역 설정. 배포 전 값만 채우면 된다.
export const SITE = {
  // 실제 도메인으로 교체 (Vercel 배포 후 자동 도메인 or 커스텀 도메인)
  url: process.env.SITE_URL || "https://hiking-pseo.vercel.app",
  name: "산길 가이드",
  title: "산길 가이드 — 한국 100대명산 등산코스 완벽 정리",
  description:
    "산림청 공식 데이터 기반. 한국 100대명산의 등산코스, 소요시간, 난이도, 교통·주차, 계절별 추천 시기를 산마다 정리했습니다.",
  locale: "ko_KR",
  author: "산길 가이드",
};

// 수익화 슬롯 — 값이 없으면 자리표시자(placeholder)만 렌더된다.
export const MONETIZE = {
  // 구글 애드센스 퍼블리셔 ID (계정: kwakdaeheon1@gmail.com)
  adsenseClient: process.env.PUBLIC_ADSENSE_CLIENT || "ca-pub-7247491098661239",
  // 애드센스 광고 단위 슬롯 ID (선택)
  adSlotInArticle: process.env.PUBLIC_ADSENSE_SLOT_INARTICLE || "",
  adSlotFooter: process.env.PUBLIC_ADSENSE_SLOT_FOOTER || "",
  // 쿠팡 파트너스 트래킹 ID. 링크에 ?lptag= 로 부착. (공개 제휴 태그라 코드에 둬도 무방)
  coupangTag: process.env.PUBLIC_COUPANG_TAG || "AF1526344",
  // 숙박 제휴 (여기어때/아고다 등) 파트너 파라미터. 없으면 일반 검색 링크.
  lodgingPartner: process.env.PUBLIC_LODGING_PARTNER || "",
};

// 쿠팡 파트너스 필수 고지 문구
export const COUPANG_DISCLOSURE =
  "이 페이지의 상품 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";
