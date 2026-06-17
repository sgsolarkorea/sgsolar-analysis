import { modulePowerW } from "@/data/solarConfig";
import { isHouseholdInstallType } from "@/lib/solar/householdSavings";

/** 예상 모듈 가배치도 — 모듈·배치 기준값 */
export const moduleLayoutConfig = {
  modulePowerW,
  moduleAreaSqm: 2.795,
  /** 지도 위 모듈 크기 — 건물·필지 대비 자연스러운 축척 */
  visualScale: 0.72,
  /** 세로형 패널 — 가로:세로 ≈ 1:2.3 */
  moduleShortM: 1.134,
  moduleLongM: 2.61,
  tiers: 2,
  tierGapM: 0.05,
  /** 통판형: 모듈 간격 없음 — 밀착 */
  flushColGapM: 0,
  /** 통판형: 행 간격 없음 */
  flushRowGapM: 0,
  /** 지붕 setback (m) */
  roofSetbackM: 0.6,
  /** 토지 setback (m) */
  landSetbackM: 1.2,
  /** 행당 기본 모듈 수 */
  defaultModulesPerRow: 11,
  roofRowThresholdKw: 50,
  landRowThresholdKw: 100,
  land: {
    rowSpacingM: 3,
    tiltDeg: 15,
  },
  roof: {
    rowSpacingM: 2.45,
    tiltDeg: 12,
  },
  colors: {
    module: "#1e293b",
    moduleFrame: "#0f172a",
    moduleCell: "#475569",
    moduleHighlight: "rgba(148, 163, 184, 0.4)",
    boundary: "#f59e0b",
    boundaryFill: "rgba(245, 158, 11, 0.42)",
  },
  disclaimer:
    "본 배치도는 자동 산정된 참고용 가배치도입니다. 실제 설계 시 음영, 구조물, 경사도, 이격거리 및 인허가 조건에 따라 변경될 수 있습니다.",
} as const;

export type ModuleLayoutInstallKind = "land" | "roof";
export type ModuleLayoutMode = "flush" | "row";

export function resolveModuleLayoutKind(installType: string): ModuleLayoutInstallKind {
  return installType === "토지형" ? "land" : "roof";
}

export function resolveModuleLayoutMode(
  installType: string,
  capacityKw: number,
): ModuleLayoutMode {
  if (isHouseholdInstallType(installType)) return "flush";
  if (installType === "지붕형") {
    return capacityKw < moduleLayoutConfig.roofRowThresholdKw ? "flush" : "row";
  }
  if (installType === "토지형") {
    return capacityKw < moduleLayoutConfig.landRowThresholdKw ? "flush" : "row";
  }
  return "flush";
}

export interface VisualModuleDimensions {
  widthM: number;
  heightM: number;
  colGapM: number;
  rowGapM: number;
}

export function getVisualModuleDimensions(mode: ModuleLayoutMode): VisualModuleDimensions {
  const scale = moduleLayoutConfig.visualScale;
  if (mode === "flush") {
    return {
      widthM: moduleLayoutConfig.moduleShortM * scale,
      heightM: moduleLayoutConfig.moduleLongM * scale,
      colGapM: 0,
      rowGapM: 0,
    };
  }
  return {
    widthM: moduleLayoutConfig.moduleShortM * scale,
    heightM: moduleLayoutConfig.moduleLongM * scale,
    colGapM: 0,
    rowGapM: 0,
  };
}

/** Row 모드 행간 이격 (m) — 실제 미터 단위 */
export function getVisualRowSpacingM(
  kind: ModuleLayoutInstallKind,
  mode: ModuleLayoutMode,
): number {
  if (mode !== "row") return 0;
  return moduleLayoutConfig[kind].rowSpacingM;
}
