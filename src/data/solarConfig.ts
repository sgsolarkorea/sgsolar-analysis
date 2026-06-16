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
export const recPrice = 71_800;

/** kW당 연간 발전량 (kWh/kW·년) */
export const yearlyGenerationPerKw = 1_291;

/** 설치유형별 1kW당 필요 면적 (㎡/kW) — SG SOLAR 실무 기준 */
export const areaPerKwByType = {
  roof: 8.72,
  land: 8.94,
  barn: 8.72,
  factory: 8.72,
  commercial: 8.72,
  unknown: 8.72,
} satisfies Record<SolarInstallCategory, number>;

/** 용량 구간별 시공 단가 (원/kW) — 건물형·토지형 동일 적용 */
export interface ConstructionCostTier {
  maxCapacityKw: number;
  costPerKw: number;
}

export const constructionCostTiers: ConstructionCostTier[] = [
  { maxCapacityKw: 60, costPerKw: 1_400_000 },
  { maxCapacityKw: 80, costPerKw: 1_300_000 },
  { maxCapacityKw: 90, costPerKw: 1_200_000 },
  { maxCapacityKw: 99, costPerKw: 1_000_000 },
  { maxCapacityKw: Infinity, costPerKw: 850_000 },
];

export function resolveConstructionCostPerKw(capacityKw: number): number {
  const tier =
    constructionCostTiers.find((t) => capacityKw <= t.maxCapacityKw) ??
    constructionCostTiers[constructionCostTiers.length - 1];
  return tier.costPerKw;
}

/** @deprecated areaPerKwByType / resolveConstructionCostPerKw 사용 */
export const constructionCostByType = {
  baseCostPerKw: 850_000,
  areaPerKw: areaPerKwByType,
} as const;

/** @deprecated 구간 단순 조회 — 수정 전 레거시 */
export interface RecWeightTier {
  maxCapacityKw: number;
  weight: number;
  label: string;
}

/** @deprecated resolveRecWeight (src/lib/solar/recWeight.ts) — 고시 복합가중치 공식 사용 */
export const recWeightTable = {
  /** 건물 활용형 — 3,000kW 이하 1.5, 초과 시 복합가중 */
  buildingWeight: 1.5,
  buildingReason: "건축물 활용 설비 기준 (별표2)",
  /** @deprecated 구간 단순 조회 — 수정 전 레거시 */
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
    "실제 설치용량은 구조검토, 음영, 통로, 소방·안전거리, 모듈배치, 인허가 조건에 따라 달라질 수 있습니다.",
  market:
    "시장단가는 매일 변동되며 실제 거래금액은 계약조건 및 가중치에 따라 달라질 수 있습니다.",
  construction:
    "예상 시공비는 참고용이며 현장 실사 후 최종 확정됩니다.",
  constructionExtra:
    "구조보강, 토목공사, 한전 인입, 감리, 안전관리, 구조검토 비용 발생 시 별도입니다.",
  revenue:
    "본 수익성 분석은 참고용이며 실제 발전량, REC 가격, SMP 가격, 가중치, 금융조건에 따라 달라질 수 있습니다.",
  recUnit:
    "REC 단가는 원/MWh(1 REC = 1,000 kWh) 기준. REC 수익 = 연간발전량(kWh) ÷ 1,000 × REC단가 × REC가중치",
} as const;
