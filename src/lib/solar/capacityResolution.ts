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
