import { modulePowerW } from "@/data/solarConfig";

/** 가배치·setback 정책 상수 — Phase 1+ */
export const layoutPolicy = {
  /** 건물 footprint 끝선 안쪽 이격 (m) */
  roofEdgeSetbackM: 0.5,
  /** 건물형 모듈 fitting — polygon 경계 허용치 (m), production B 산정 */
  roofEdgeToleranceM: 0.1,
  /** 지적(cadastral) 라인 안쪽 완충구간 (m) — 토지형/노지형 */
  parcelBoundarySetbackM: 3.0,
  /** 모듈 2단 어레이(dual_array) 그룹 간 유지관리 통로 (m) — 토지·건물 공통 */
  dualArraySetAisleM: 2.4,
  /** @alias dualArraySetAisleM — 건물형 2단 어레이 그룹 간 통로 */
  roofDualArraySetAisleM: 2.4,
  /** 건물형 모듈 연속 어레이 row 간격 (m) — dual 그룹 내부·≥30kW 참고 */
  roofContinuousRowGapM: 0.25,
  /** diagnostics용 여유 배치 row gap (m) */
  roofContinuousRowGapReferenceM: 0.25,
  /** 30kW 미만 roof continuous row gap 후보 (m) — max-fill 비교 */
  roofContinuousRowGapCandidatesM: [0, 0.05, 0.25] as const,
  /** continuous → dual_array 분기 기준 (kW) — 연속 어레이 sim 결과 기준 (Phase 2) */
  arrayModeThresholdKw: 30,
  /** 2단 어레이 그룹 내부 1줄↔2줄 간격 (m) */
  innerTierGapM: 0.05,
  /** narrow zone local width 1차 threshold (m) — diagnostics·필터 공통 */
  narrowZoneMinWidthM: 6,
  /** narrow zone grid 해상도 (m) */
  narrowZoneGridCellSizeM: 2,
  /** main component retained area ratio 하한 — 과소 산정 방지 */
  narrowZoneMinRetainedAreaRatio: 0.85,
  /** 토지형 narrow zone 정책 적용 여부 */
  narrowZonePolicyEnabled: true,
} as const;

/** 예상 모듈 가배치도 — 모듈·배치 기준값 */
export const moduleLayoutConfig = {
  modulePowerW,
  moduleAreaSqm: 2.795,
  /** 지도/SVG 표시용 축척 — 토지형 */
  visualScale: 0.72,
  /** 지도/SVG 표시용 축척 — 건물형 (배치 fitting 미적용) */
  roofRenderScale: 0.66,
  /** 실제 모듈 규격 (m) — 배치·용량 산정 fitting 기준 */
  moduleShortM: 1.134,
  moduleLongM: 2.465,
  tiers: 2,
  tierGapM: layoutPolicy.innerTierGapM,
  /** 통판형: 모듈 간격 없음 — 밀착 */
  flushColGapM: 0,
  /** 통판형: 행 간격 없음 */
  flushRowGapM: 0,
  roofEdgeSetbackM: layoutPolicy.roofEdgeSetbackM,
  roofEdgeToleranceM: layoutPolicy.roofEdgeToleranceM,
  parcelBoundarySetbackM: layoutPolicy.parcelBoundarySetbackM,
  dualArraySetAisleM: layoutPolicy.dualArraySetAisleM,
  roofDualArraySetAisleM: layoutPolicy.roofDualArraySetAisleM,
  roofContinuousRowGapM: layoutPolicy.roofContinuousRowGapM,
  roofContinuousRowGapReferenceM: layoutPolicy.roofContinuousRowGapReferenceM,
  roofContinuousRowGapCandidatesM: layoutPolicy.roofContinuousRowGapCandidatesM,
  arrayModeThresholdKw: layoutPolicy.arrayModeThresholdKw,
  /** @deprecated use roofEdgeSetbackM */
  roofSetbackM: layoutPolicy.roofEdgeSetbackM,
  /** @deprecated use parcelBoundarySetbackM — 토지 layout path에서 사용 금지 */
  landSetbackM: layoutPolicy.parcelBoundarySetbackM,
  /** 행당 기본 모듈 수 */
  defaultModulesPerRow: 11,
  /** @deprecated Phase 2에서 arrayModeThresholdKw + simulation으로 대체 */
  roofRowThresholdKw: 50,
  /** @deprecated Phase 2에서 arrayModeThresholdKw + simulation으로 대체 */
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
export type ModuleLayoutMode = "continuous_array" | "dual_array";

export function resolveModuleLayoutKind(installType: string): ModuleLayoutInstallKind {
  return installType === "토지형" ? "land" : "roof";
}

/** @deprecated Phase 2 — layoutMode는 simulation 결과로 결정 */
export function resolveModuleLayoutMode(
  _installType: string,
  _capacityKw: number,
): ModuleLayoutMode {
  return "continuous_array";
}

export interface VisualModuleDimensions {
  widthM: number;
  heightM: number;
  colGapM: number;
  rowGapM: number;
  renderScale: number;
}

/** 배치 fitting·placedModuleCount 산정용 — scale 미적용 실제 규격 */
export function getActualModuleDimensions(
  orientation: "portrait" | "landscape" = "portrait",
): { widthM: number; heightM: number } {
  return orientation === "portrait"
    ? {
        widthM: moduleLayoutConfig.moduleShortM,
        heightM: moduleLayoutConfig.moduleLongM,
      }
    : {
        widthM: moduleLayoutConfig.moduleLongM,
        heightM: moduleLayoutConfig.moduleShortM,
      };
}

/** 지도/SVG 렌더링용 — scale 적용 (placedModuleCount 산정 금지) */
export function getRenderModuleDimensions(
  kind: ModuleLayoutInstallKind,
  mode: ModuleLayoutMode,
  orientation: "portrait" | "landscape" = "portrait",
): VisualModuleDimensions {
  const renderScale =
    kind === "roof" ? moduleLayoutConfig.roofRenderScale : moduleLayoutConfig.visualScale;
  const actual = getActualModuleDimensions(orientation);
  return {
    widthM: actual.widthM * renderScale,
    heightM: actual.heightM * renderScale,
    colGapM: 0,
    rowGapM: mode === "continuous_array" ? 0 : 0,
    renderScale,
  };
}

export function getVisualModuleDimensions(
  mode: ModuleLayoutMode,
  kind: ModuleLayoutInstallKind = "land",
): VisualModuleDimensions {
  return getRenderModuleDimensions(kind, mode);
}

/** @deprecated Phase 2 — row gap는 layoutPolicy 사용 */
export function getVisualRowSpacingM(
  kind: ModuleLayoutInstallKind,
  _mode: ModuleLayoutMode,
): number {
  return moduleLayoutConfig[kind].rowSpacingM;
}
