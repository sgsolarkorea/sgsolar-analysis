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
  /** 토지형 Phase 3 — single | double */
  layoutTier?: "single" | "double";
  blockCount?: number;
  blockModuleCounts?: number[];
  selectedAzimuthDegrees?: number;
  capacityLayoutRule?: string;
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
  /** layout.boundary ↔ setbackBoundary 좌표 일치 여부 (검증용) */
  boundaryMatchesSetback?: boolean;
  setbackAreaSqm?: number;
  installType?: string;
  capacityBasis?: "land" | "buildingRoof";
  landAreaSqm?: number | null;
  buildingFootprintAreaSqm?: number | null;
  roofUsableAreaSqm?: number | null;
  layoutBoundarySource?: "cadastral" | "building" | "roof" | "virtual";
  layoutTier?: "single" | "double";
  blockCount?: number;
  blockModuleCounts?: number[];
  rowCount?: number;
  selectedAzimuthDegrees?: number;
  candidateAzimuths?: number[];
  candidateScores?: Record<string, number>;
  capacityLayoutRule?: string;
  singleBlockRejectedReason?: string;
  unusedAreaReason?: string;
  /** 토지형 Phase 3.1 — physical array diagnostics */
  arrayCount?: number;
  arrayTierCount?: number;
  tierRowsPerArray?: number;
  arrayModuleCounts?: number[];
  aisleM?: number;
  aisleApplied?: boolean;
  fillStrategy?: string;
  medianSplitUsed?: boolean;
  rowGenerationPattern?: string;
  unusedAreaRatio?: number;
  /** 건물형 Phase 3.1 */
  roofFillStrategy?: "centered" | "distributed";
  roofCenteringApplied?: boolean;
  roofUnusedAreaRatio?: number;
  selectedSlotBoundingBox?: { minX: number; maxX: number; minY: number; maxY: number };
  roofPolygonBoundingBox?: { minX: number; maxX: number; minY: number; maxY: number };
  centerOffsetM?: number;
  sequentialFillRejectedReason?: string;
}

export interface ModuleLayoutResult {
  boundary: LatLngPoint[];
  /** VWorld 원본 경계 (setback 미적용) */
  sourceBoundary?: LatLngPoint[];
  /** sourceBoundary + setback 적용 결과 */
  setbackBoundary?: LatLngPoint[];
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
  overlayOnly?: boolean;
  overlayRaw?: boolean;
  overlayCompare?: boolean;
  /** 건물형: 토지 cadastral 참고용 (가배치 미사용) */
  referenceCadastral?: LatLngPoint[];
  landLayoutDiagnostics?: import("@/lib/solar/landBlockLayout").LandBlockPlacementDiagnostics;
  roofLayoutDiagnostics?: import("@/lib/solar/moduleLayout").RoofPlacementDiagnostics;
}
