import { modulePowerW } from "@/data/solarConfig";
import type { InstallTypeOption } from "@/data/resultUx";
import { isHouseholdInstallType } from "@/lib/solar/householdSavings";

/** 640W 모듈 = 0.64kW */
export const MODULE_KW = modulePowerW / 1000;

export function formatUnifiedCapacityKw(kw: number): string {
  if (kw <= 0 || !Number.isFinite(kw)) return "0kW";
  const rounded = Math.round(kw * 100) / 100;
  return `${rounded.toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}kW`;
}

export interface TargetCapacityResult {
  rawCapacityKw: number;
  targetModuleCount: number;
  capacityKw: number;
}

/** 면적 기준 이론 kW → FLOOR(이론kW÷0.64) 목표 모듈수 → 최종 kW = 모듈수×0.64 */
export function resolveTargetCapacity(
  installType: InstallTypeOption,
  baseAreaSqm: number,
  areaPerKw: number,
): TargetCapacityResult {
  if (baseAreaSqm <= 0 || areaPerKw <= 0) {
    return { rawCapacityKw: 0, targetModuleCount: 0, capacityKw: 0 };
  }

  const rawCapacityKw = baseAreaSqm / areaPerKw;

  if (isHouseholdInstallType(installType)) {
    const floorModules = Math.floor(rawCapacityKw / MODULE_KW);
    let targetModuleCount: number;
    if (floorModules <= 5) targetModuleCount = 5;
    else if (floorModules <= 10) targetModuleCount = 10;
    else targetModuleCount = 15;

    const capacityKw = Math.round(targetModuleCount * MODULE_KW * 100) / 100;
    return { rawCapacityKw, targetModuleCount, capacityKw };
  }

  const targetModuleCount = Math.floor(rawCapacityKw / MODULE_KW);
  const capacityKw = Math.round(targetModuleCount * MODULE_KW * 100) / 100;
  return { rawCapacityKw, targetModuleCount, capacityKw };
}

/** A = 면적(areaPerKw) 기준 용량, B = layout 배치 기준 용량 */
export type CapacityLimitingFactor = "area" | "layout";

/**
 * Phase 3 최종 용량 정책.
 * - 건물형: A-only (layout B는 diagnostics 전용, 대표 용량·수익에 미반영)
 * - 토지형: min(A,B) — layout 제약이 크므로 B 반영
 */
export type CapacityResolutionPolicy = "building_area_only" | "land_min_area_layout";

export function resolveCapacityResolutionPolicy(
  installType: InstallTypeOption,
): CapacityResolutionPolicy {
  return installType === "토지형" ? "land_min_area_layout" : "building_area_only";
}

export function usesBuildingAreaOnlyCapacity(installType: InstallTypeOption): boolean {
  return resolveCapacityResolutionPolicy(installType) === "building_area_only";
}

function roundCapacityKw(kw: number): number {
  return Math.round(kw * 100) / 100;
}

function modulesFromKw(kw: number): number {
  return Math.floor(kw / MODULE_KW);
}

export interface ResolveFinalCapacityInput {
  installType: InstallTypeOption;
  /** A — roof/land usable area ÷ areaPerKw → floor modules */
  areaBasedCapacityKw: number;
  /** B — layout engine placed capacity (diagnostics) */
  layoutCapacityKw?: number | null;
}

export interface ResolveFinalCapacityResult {
  policy: CapacityResolutionPolicy;
  areaBasedCapacityKw: number;
  layoutCapacityKw: number | null;
  finalCapacityKw: number;
  finalModuleCount: number;
  /** 건물형: 항상 area (B는 diagnostics). 토지형: min(A,B) 기준 */
  capacityLimitingFactor: CapacityLimitingFactor;
}

/**
 * 최종 용량 정책 분기.
 * UI 대표 용량(calculateSolarMetrics)은 건물형에서 이미 A-only이며,
 * 토지형 Phase 3 연동·layout diagnostics에서 이 함수를 사용합니다.
 */
export function resolveFinalCapacity(
  input: ResolveFinalCapacityInput,
): ResolveFinalCapacityResult {
  const policy = resolveCapacityResolutionPolicy(input.installType);
  const areaKw = roundCapacityKw(Math.max(0, input.areaBasedCapacityKw));
  const layoutKw =
    input.layoutCapacityKw != null && input.layoutCapacityKw > 0
      ? roundCapacityKw(input.layoutCapacityKw)
      : null;

  if (policy === "building_area_only") {
    const finalModuleCount = modulesFromKw(areaKw);
    return {
      policy,
      areaBasedCapacityKw: areaKw,
      layoutCapacityKw: layoutKw,
      finalCapacityKw: roundCapacityKw(finalModuleCount * MODULE_KW),
      finalModuleCount,
      capacityLimitingFactor: "area",
    };
  }

  const rawFinalKw = layoutKw != null ? Math.min(areaKw, layoutKw) : areaKw;
  const finalModuleCount = modulesFromKw(rawFinalKw);
  const finalCapacityKw = roundCapacityKw(finalModuleCount * MODULE_KW);
  const limitingFactor: CapacityLimitingFactor =
    layoutKw != null && layoutKw < areaKw ? "layout" : "area";

  return {
    policy,
    areaBasedCapacityKw: areaKw,
    layoutCapacityKw: layoutKw,
    finalCapacityKw,
    finalModuleCount,
    capacityLimitingFactor: limitingFactor,
  };
}
