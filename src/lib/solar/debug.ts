import { getFieldValue, parseAreaSqm } from "@/lib/solar/calculate";
import type { InstallTypeOption } from "@/data/resultUx";
import type { InfoField } from "@/types/siteReview";

export interface SolarCalculationDebug {
  address?: string;
  buildingArea: number | null;
  landArea: number | null;
  defaultInstallType: InstallTypeOption | string;
  calculatedCapacityKw: number;
  source: string;
  buildingUse?: string;
  usedSampleFallback?: boolean;
}

export function logSolarCalculationDebug(payload: SolarCalculationDebug): void {
  console.info(
    "[SolarCalc]",
    JSON.stringify({
      buildingArea: payload.buildingArea,
      landArea: payload.landArea,
      defaultInstallType: payload.defaultInstallType,
      calculatedCapacityKw: payload.calculatedCapacityKw,
      source: payload.source,
      ...(payload.address ? { address: payload.address } : {}),
      ...(payload.buildingUse ? { buildingUse: payload.buildingUse } : {}),
      ...(payload.usedSampleFallback != null
        ? { usedSampleFallback: payload.usedSampleFallback }
        : {}),
    }),
  );
}

export function extractAreasForDebug(landInfo: InfoField[], buildingInfo: InfoField[]) {
  return {
    buildingArea: parseAreaSqm(getFieldValue(buildingInfo, "건축면적")),
    landArea: parseAreaSqm(getFieldValue(landInfo, "면적")),
    buildingUse: getFieldValue(buildingInfo, "건물 용도"),
  };
}
