import { getFieldValue, parseAreaSqm } from "@/lib/solar/calculate";
import type { InstallTypeOption } from "@/data/resultUx";
import type { InfoField } from "@/types/siteReview";
import type { InfoDataSource } from "@/lib/api/infoFallbacks";

export interface SolarCalculationDebug {
  address?: string;
  buildingArea: number | null;
  landArea: number | null;
  defaultInstallType: InstallTypeOption | string;
  estimatedCapacity: string;
  calculatedCapacityKw: number;
  source: string;
  buildingUse?: string;
  buildingAreaRaw?: string;
  landAreaRaw?: string;
  buildingDataSource?: InfoDataSource;
  landDataSource?: InfoDataSource;
  pnu?: string | null;
  pnuSource?: "vworld" | "kakao-jibun-fallback" | "none";
  usedSampleFallback?: boolean;
}

export function logSolarCalculationDebug(payload: SolarCalculationDebug): void {
  const usedSampleFallback =
    payload.buildingDataSource === "sampleData" || payload.landDataSource === "sampleData";

  console.info(
    "[SolarCalc]",
    JSON.stringify({
      buildingArea: payload.buildingArea,
      landArea: payload.landArea,
      defaultInstallType: payload.defaultInstallType,
      estimatedCapacity: payload.estimatedCapacity,
      calculatedCapacityKw: payload.calculatedCapacityKw,
      source: payload.source,
      buildingDataSource: payload.buildingDataSource ?? "unknown",
      landDataSource: payload.landDataSource ?? "unknown",
      usedSampleFallback,
      ...(payload.address ? { address: payload.address } : {}),
      ...(payload.buildingUse ? { buildingUse: payload.buildingUse } : {}),
      ...(payload.buildingAreaRaw ? { buildingAreaRaw: payload.buildingAreaRaw } : {}),
      ...(payload.landAreaRaw ? { landAreaRaw: payload.landAreaRaw } : {}),
      ...(payload.pnu ? { pnu: payload.pnu } : {}),
      ...(payload.pnuSource ? { pnuSource: payload.pnuSource } : {}),
    }),
  );
}

export function extractAreasForDebug(landInfo: InfoField[], buildingInfo: InfoField[]) {
  return {
    buildingArea: parseAreaSqm(getFieldValue(buildingInfo, "건축면적")),
    landArea: parseAreaSqm(getFieldValue(landInfo, "면적")),
    buildingUse: getFieldValue(buildingInfo, "건물 용도"),
    buildingAreaRaw: getFieldValue(buildingInfo, "건축면적"),
    landAreaRaw: getFieldValue(landInfo, "면적"),
  };
}
