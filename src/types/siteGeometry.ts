import type { InstallTypeOption } from "@/data/resultUx";
import type { LatLngPoint, ModuleLayoutPolygonSource } from "@/types/moduleLayout";

export type CapacityBasis = "land" | "buildingRoof";
export type LayoutBoundarySource = "cadastral" | "building" | "roof" | "virtual";

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
  /** 용량 산정에 사용할 면적 (㎡) */
  capacityAreaSqm: number;
  layoutBoundary: LatLngPoint[];
  sourceBoundary: LatLngPoint[];
  setbackBoundary: LatLngPoint[];
  /** 건물형: 토지 cadastral 참고용 (가배치·용량 미사용) */
  referenceCadastral?: LatLngPoint[];
  polygonSource: ModuleLayoutPolygonSource;
}
