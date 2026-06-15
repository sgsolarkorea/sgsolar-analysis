/**
 * SG SOLAR 태양광 입지검토 — 계산 기준 설정
 * 모든 용량·수익·시공비 계산은 이 파일의 값을 참조합니다.
 */

export type SolarInstallCategory =
  | "roof"
  | "land"
  | "barn"
  | "factory"
  | "commercial"
  | "unknown";

/** 현재 기준 모듈 출력 (W) */
export const modulePowerW = 640;

/** SMP fallback 단가 (원/kWh) — MARKET_DATA_URL 실패 시 사용 */
export const smpPrice = 112;

/** REC fallback 단가 (원/MWh, 1 REC = 1,000 kWh) — MARKET_DATA_URL 실패 시 사용 */
export const recPrice = 65_000;

/** kW당 연간 발전량 (kWh/kW·년) */
export const yearlyGenerationPerKw = 1_291;

/** 설치유형별 1kW당 필요 면적 (㎡/kW) — SG SOLAR 실무 기준 */
export const constructionCostByType = {
  /** 기본 시공 단가 (원/kW) — 구조보강·토목·한전인입 등 별도 */
  baseCostPerKw: 850_000,
  areaPerKw: {
    roof: 8.72,
    land: 8.94,
    barn: 8.72,
    factory: 8.72,
    commercial: 8.72,
    unknown: 8.72,
  } satisfies Record<SolarInstallCategory, number>,
} as const;

/** REC 가중치 — 용량 구간 (토지형) */
export interface RecWeightTier {
  maxCapacityKw: number;
  weight: number;
  label: string;
}

export const recWeightTable = {
  /** 건물 활용형(지붕·축사·공장·상가) REC 가중치 */
  buildingWeight: 1.5,
  buildingReason: "건축물 활용 설비 기준",
  /** 토지형 용량 구간별 가중치 */
  landTiers: [
    { maxCapacityKw: 99, weight: 1.2, label: "99kW 이하" },
    { maxCapacityKw: 199, weight: 1.1, label: "199kW 구간" },
    { maxCapacityKw: 299, weight: 1.06, label: "299kW 구간" },
    { maxCapacityKw: 399, weight: 1.05, label: "399kW 구간" },
    { maxCapacityKw: Infinity, weight: 1.0, label: "400kW 초과" },
  ] satisfies RecWeightTier[],
} as const;

/** 월별 발전량 분배 비율 (1~12월, 합계 = 1) */
export const monthlyGenerationWeights = [
  0.064, 0.071, 0.084, 0.087, 0.092, 0.082, 0.076, 0.079, 0.077, 0.074, 0.069, 0.062,
] as const;

export const disclaimer = {
  capacity:
    "실제 설치용량은 구조검토, 음영, 통로, 소방이격거리, 안전거리, 모듈배치, 인허가 조건에 따라 달라질 수 있습니다.",
  market:
    "시장단가는 매일 변동되며 실제 거래금액은 계약조건 및 가중치에 따라 달라질 수 있습니다.",
  construction:
    "예상 시공비는 참고용이며 현장 실사 후 최종 확정됩니다. 구조보강, 토목공사, 한전 인입, 감리, 안전관리, 구조검토, 기타 현장 특이사항은 별도입니다.",
  revenue:
    "본 수익성 분석은 참고용이며 실제 발전량, REC 가격, SMP 가격, 가중치, 금융조건에 따라 달라질 수 있습니다.",
  recUnit:
    "REC 단가는 원/MWh(1 REC = 1,000 kWh 발전량) 기준이며, REC 수익 = 연간발전량(kWh) ÷ 1,000 × REC단가(원/MWh) × REC가중치",
} as const;
