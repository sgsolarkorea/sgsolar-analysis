import type { SolarInstallCategory } from "@/data/solarConfig";

/** 신·재생에너지 공급인증제 별표2 — 소수점 넷째 자리 절사 */
export function truncateRecWeight(weight: number): number {
  return Math.floor(weight * 10_000) / 10_000;
}

const THRESHOLD_100_KW = 100;
const THRESHOLD_3000_KW = 3_000;

function truncateRecWeightToTwoDecimals(weight: number): number {
  return Math.floor(weight * 100) / 100;
}

/** 일반부지(토지형) REC 가중치 — 100kW 단위 상한 용량 기준 */
export function resolveLandRecWeight(capacityKw: number): { weight: number; reason: string } {
  if (capacityKw <= 0) {
    return { weight: 0, reason: "용량 없음" };
  }
  if (capacityKw < THRESHOLD_100_KW) {
    return { weight: 1.2, reason: "100kW 미만 (1.2)" };
  }

  const hundredKwBlocks = Math.max(2, Math.ceil(capacityKw / 100));
  const referenceCapacityKw = hundredKwBlocks * 100;
  const raw = (1.2 + (hundredKwBlocks - 1) * 1.0) / hundredKwBlocks;
  const weight = truncateRecWeightToTwoDecimals(raw);
  return {
    weight,
    reason: `${referenceCapacityKw}kW 기준 100kW 단위 상한 가중치 ((1.2 + ${hundredKwBlocks - 1}×1.0) ÷ ${hundredKwBlocks})`,
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
