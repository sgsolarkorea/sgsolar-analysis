export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface ModuleRect {
  corners: [LatLngPoint, LatLngPoint, LatLngPoint, LatLngPoint];
}

export type ModuleLayoutPolygonSource = "building" | "cadastral" | "virtual";

export type ModuleLayoutMode = "flush" | "row";

export interface ModuleLayoutStats {
  capacityKw: number;
  targetModuleCount: number;
  placedModuleCount: number;
  modulePowerW: number;
  layoutMode: ModuleLayoutMode;
  tiers: number;
  rowSpacingM: number;
  tiltDeg: number;
  installType: string;
  /** Polygon 내부 4꼭짓점 검증 통과 슬롯 수 */
  validSlotCount: number;
  /** 실제 배치 Row 수 */
  layoutRowCount: number;
  /** Row별 배치 모듈 수 */
  rowModuleCounts: number[];
  /** 배치 모듈 footprint / usableArea (%) */
  polygonUtilizationPct: number;
}

/** Polygon 인식·배치 진단 (검증용) */
export interface ModuleLayoutDiagnostics {
  polygonSource: ModuleLayoutPolygonSource;
  boundaryPointCount: number;
  /** setback 적용 전 원본 Polygon 면적 (㎡) */
  polygonAreaSqm: number;
  /** setback 적용 후 사용 가능 면적 (㎡) */
  usableAreaSqm: number;
  targetModuleCount: number;
  placedModuleCount: number;
  layoutMode: ModuleLayoutMode;
  /** 장축 방향 (도, 0=동쪽 기준 반시계) */
  orientationDegrees: number;
  validSlotCount: number;
  layoutRowCount: number;
  rowModuleCounts: number[];
  polygonUtilizationPct: number;
  /** SVG 렌더 대상 (= placedModuleCount, 상한 없음) */
  renderModuleCount: number;
}

export interface ModuleLayoutResult {
  boundary: LatLngPoint[];
  modules: ModuleRect[];
  center: LatLngPoint;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  polygonSource: ModuleLayoutPolygonSource;
  stats: ModuleLayoutStats;
  diagnostics?: ModuleLayoutDiagnostics;
}
