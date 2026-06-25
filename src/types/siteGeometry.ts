import type { InstallTypeOption } from "@/data/resultUx";
import type { LatLngPoint, ModuleLayoutPolygonSource } from "@/types/moduleLayout";

export type CapacityBasis = "land" | "buildingRoof";
export type LayoutBoundarySource =
  | "cadastral"
  | "cadastral-merged"
  | "building"
  | "roof"
  | "virtual";

export type NarrowZoneReason =
  | "disabled"
  | "not_applied_insufficient_polygon"
  | "not_applied_retained_area_guard"
  | "not_applied_no_narrow_exclusion"
  | "main_component_selected"
  | "narrow_width_filtered";

export interface NarrowZoneDiagnostics {
  narrowZonePolicyApplied: boolean;
  unionComponentCount: number;
  usableComponentCount: number;
  selectedComponentAreaSqm: number;
  excludedComponentAreaSqm: number;
  excludedNarrowAreaSqm: number;
  narrowZoneReason: NarrowZoneReason;
  estimatedMinWidthM?: number;
  minLocalWidthM?: number;
  narrowWidthThresholdM: number;
  setbackUsableAreaSqm: number;
}

/** 서버 분석 시 클라이언트로 전달 — 설치유형 전환 시 면적 재산정용 */
export interface SiteGeometryBundle {
  landAreaSqm: number | null;
  buildingAreaSqm: number | null;
  cadastralPolygon: LatLngPoint[] | null;
  cadastralAreaSqm: number | null;
  buildingPolygons?: LatLngPoint[][];
  buildingPolygon: LatLngPoint[] | null;
  buildingFootprintAreaSqm: number | null;
  buildingPolygonCount?: number;
  buildingFootprintAreaSumSqm?: number | null;
  /** 건축물대장 건축면적 합산 (㎡) */
  registryBuildingAreaSqm?: number | null;
  detectedBuildingCount?: number;
  usedBuildingCount?: number;
  excludedBuildingCount?: number;
  excludedBuildingReasons?: string[];
}

export interface SiteGeometryResult {
  installType: InstallTypeOption | string;
  capacityBasis: CapacityBasis;
  layoutBoundarySource: LayoutBoundarySource;
  landAreaSqm: number | null;
  buildingFootprintAreaSqm: number | null;
  buildingPolygonCount?: number;
  buildingFootprintAreaSumSqm?: number | null;
  roofUsableAreaSqm: number | null;
  /** 다동 건물 — setback 적용 지붕 polygon (건물형) */
  buildingLayoutBoundaries?: LatLngPoint[][];
  buildingSourceBoundaries?: LatLngPoint[][];
  detectedBuildingCount?: number;
  usedBuildingCount?: number;
  excludedBuildingCount?: number;
  excludedBuildingReasons?: string[];
  registryBuildingAreaSqm?: number | null;
  /** 토지형 setback 후 usableArea (㎡) */
  landUsableAreaSqm: number | null;
  /** 토지형 setback 적용 전 지적/원본 면적 (㎡) */
  landOriginalAreaSqm?: number | null;
  /** 적용된 건물 끝선 setback (m) */
  roofEdgeSetbackM?: number;
  /** 적용된 지적 완충 setback (m) */
  parcelBoundarySetbackM?: number;
  /** 용량 산정에 사용할 면적 (㎡) */
  capacityAreaSqm: number;
  layoutBoundary: LatLngPoint[];
  sourceBoundary: LatLngPoint[];
  setbackBoundary: LatLngPoint[];
  /** 건물형: 토지 cadastral 참고용 (가배치·용량 미사용) */
  referenceCadastral?: LatLngPoint[];
  polygonSource: ModuleLayoutPolygonSource;
  /** 다중 필지 union — 선택 필지 수 */
  mergedParcelCount?: number;
  /** union에 사용된 PNU 목록 */
  mergedParcelPnus?: string[];
  /** union 결과 disconnected component 수 */
  unionComponentCount?: number;
  /** cadastral fetch 성공 ring 수 */
  mergedParcelRingCount?: number;
  /** setback 후 narrow zone 정책 diagnostics */
  narrowZone?: NarrowZoneDiagnostics;
  /** narrow zone 적용 전 setback usable (㎡) */
  landUsableAreaSqmBeforeNarrowZone?: number | null;
}
