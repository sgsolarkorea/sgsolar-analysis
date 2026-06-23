/** Shared constants for regulatory DB pipeline scripts (Step 6.5). */

export const REGULATORY_SIDO_LIST = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전라북도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

export const SOURCE_TYPES = [
  "ordinance",
  "guideline",
  "permit_rule",
  "solar_policy",
  "notice",
  "unknown",
];

export const SOURCE_STATUSES = [
  "not_started",
  "source_found",
  "parsing",
  "parsed",
  "verified",
  "rejected",
];

export const REVIEW_STATUSES = [
  "not_started",
  "source_found",
  "parsing",
  "parsed",
  "verified",
  "rejected",
];

export const CONFIDENCE_LEVELS = [
  "verified",
  "ordinance_based",
  "needs_verification",
  "common_fallback",
];

export const COMMON_FALLBACK_DISTANCES = {
  residential: 200,
  road: 100,
  river: 100,
  school: 100,
  cultural: 100,
};

export function regionKey(sido, sigungu) {
  return `${sido}|${sigungu}`;
}

export function defaultOrdinanceName(sigungu) {
  if (sigungu.endsWith("군")) {
    return `${sigungu} 군계획 조례`;
  }
  if (sigungu.endsWith("구") && !sigungu.endsWith("특별자치시")) {
    return `${sigungu} 도시계획 조례`;
  }
  if (sigungu.endsWith("시")) {
    return `${sigungu} 도시계획 조례`;
  }
  return `${sigungu} 도시계획 조례`;
}

export function defaultSolarAppendixName() {
  return "[별표] 태양광 발전시설 허가기준";
}

export function defaultSourceSkeleton(sigungu, sido) {
  const ordinanceName =
    sido === "세종특별자치시"
      ? "세종특별자치시 도시계획 조례"
      : defaultOrdinanceName(sigungu);

  const sources = [
    {
      type: "ordinance",
      name: ordinanceName,
      appendix: defaultSolarAppendixName(),
      sourceUrl: "",
      status: "not_started",
    },
  ];

  if (sigungu.endsWith("시") && !["세종특별자치시"].includes(sigungu)) {
    sources.push({
      type: "guideline",
      name: `${sigungu} 개발행위허가 운영지침`,
      sourceUrl: "",
      status: "not_started",
    });
  }

  return sources;
}

export function defaultSetbackSkeleton(sigungu, sido) {
  return {
    municipalityLabel: sigungu,
    sido,
    sigungu,
    source: "지자체 조례 확인 필요",
    sourceUrl: "",
    lastUpdated: null,
    verifiedAt: null,
    reviewStatus: "not_started",
    confidence: "needs_verification",
    distances: { ...COMMON_FALLBACK_DISTANCES },
    notes: "",
  };
}
