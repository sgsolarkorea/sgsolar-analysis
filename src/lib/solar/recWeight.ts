import type { SolarInstallCategory } from "@/data/solarConfig";

/** 신·재생에너지 공급인증제 별표2 — 소수점 넷째 자리 절사 */
export function truncateRecWeight(weight: number): number {
  return Math.floor(weight * 10_000) / 10_000;
}

const LAND_UNDER_100_KW = 99.999;
const LAND_MID_TIER_KW = 2_900.001; // 3,000 - 99.999
const THRESHOLD_100_KW = 100;
const THRESHOLD_3000_KW = 3_000;

/** 일반부지(토지형) REC 가중치 — 복합 구간 평균 */
export function resolveLandRecWeight(capacityKw: number): { weight: number; reason: string } {
  if (capacityKw <= 0) {
    return { weight: 0, reason: "용량 없음" };
  }
  if (capacityKw < THRESHOLD_100_KW) {
    return { weight: 1.2, reason: "100kW 미만 (1.2)" };
  }
  if (capacityKw <= THRESHOLD_3000_KW) {
    const raw =
      (LAND_UNDER_100_KW * 1.2 + (capacityKw - LAND_UNDER_100_KW) * 1.0) / capacityKw;
    const weight = truncateRecWeight(raw);
    return {
      weight,
      reason: `100~3,000kW 복합가중 (99.999×1.2 + 초과×1.0) ÷ ${capacityKw}kW`,
    };
  }
  const raw =
    (LAND_UNDER_100_KW * 1.2 + LAND_MID_TIER_KW * 1.0 + (capacityKw - THRESHOLD_3000_KW) * 0.8) /
    capacityKw;
  const weight = truncateRecWeight(raw);
  return {
    weight,
    reason: `3,000kW 초과 복합가중 (99.999×1.2 + 2,900.001×1.0 + 초과×0.8) ÷ ${capacityKw}kW`,
  };
}

/** 건축물 등 기존 시설물 이용 REC 가중치 */
export function resolveBuildingRecWeight(capacityKw: number): { weight: number; reason: string } {
  if (capacityKw <= 0) {
    return { weight: 0, reason: "용량 없음" };
  }
  if (capacityKw <= THRESHOLD_3000_KW) {
    return { weight: 1.5, reason: "3,000kW 이하 (1.5)" };
  }
  const raw = (THRESHOLD_3000_KW * 1.5 + (capacityKw - THRESHOLD_3000_KW) * 1.0) / capacityKw;
  const weight = truncateRecWeight(raw);
  return {
    weight,
    reason: `3,000kW 초과 복합가중 (3,000×1.5 + 초과×1.0) ÷ ${capacityKw}kW`,
  };
}

function isBuildingCategory(category: SolarInstallCategory): boolean {
  return (
    category === "roof" ||
    category === "barn" ||
    category === "factory" ||
    category === "commercial" ||
    category === "unknown"
  );
}

export function resolveRecWeight(
  category: SolarInstallCategory,
  capacityKw: number,
): { weight: number; reason: string } {
  if (isBuildingCategory(category)) {
    return resolveBuildingRecWeight(capacityKw);
  }
  return resolveLandRecWeight(capacityKw);
}

/** @deprecated 구간 단순 조회 (수정 전 비교용) */
export function resolveLegacyLandRecWeight(capacityKw: number): number {
  const tiers = [
    { max: 99, weight: 1.2 },
    { max: 199, weight: 1.1 },
    { max: 299, weight: 1.06 },
    { max: 399, weight: 1.05 },
    { max: Infinity, weight: 1.0 },
  ];
  return tiers.find((t) => capacityKw <= t.max)?.weight ?? 1.0;
}
