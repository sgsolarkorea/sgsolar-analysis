export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface ModuleRect {
  corners: [LatLngPoint, LatLngPoint, LatLngPoint, LatLngPoint];
}

export type ModuleLayoutPolygonSource = "building" | "cadastral" | "virtual";

export type ModuleLayoutMode = "continuous_array" | "dual_array";
/** @deprecated use ModuleLayoutMode */
export type LegacyModuleLayoutMode = "flush" | "row";

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
  /** @deprecated use layoutMode */
  layoutTier?: "single" | "double";
  /** Phase 2 — array layout diagnostics */
  continuousPlacedModuleCount?: number;
  continuousPlacedKw?: number;
  dualPlacedModuleCount?: number;
  dualPlacedKw?: number;
  selectedPlacedModuleCount?: number;
  selectedPlacedKw?: number;
  layoutSelectionReason?: string;
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
  buildingPolygonCount?: number;
  buildingFootprintAreaSumSqm?: number | null;
  roofUsableAreaSqm?: number | null;
  layoutBoundarySource?: "cadastral" | "cadastral-merged" | "building" | "roof" | "virtual";
  layoutTier?: "single" | "double";
  blockCount?: number;
  blockModuleCounts?: number[];
  rowCount?: number;
  selectedAzimuthDegrees?: number;
  candidateAzimuths?: number[];
  candidateScores?: Record<string, number>;
  candidatePlacedCounts?: Record<string, number>;
  selectedReason?: string;
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
  /** 토지형 Phase 3.3 — two-tier row set diagnostics */
  twoTierSetCount?: number;
  twoTierSetModuleCounts?: number[];
  innerTierGapM?: number;
  setAisleM?: number;
  visualScale?: number;
  /** 토지형 Phase 3.2 — Array Block diagnostics */
  arrayBlockCount?: number;
  arrayBlocks?: Array<{
    blockIndex: number;
    arrayIndexes: number[];
    moduleCount: number;
    rowCount: number;
    boundingBox: { minX: number; maxX: number; minY: number; maxY: number };
  }>;
  mainAisleM?: number;
  mainAisleApplied?: boolean;
  arrayBlockModuleCounts?: number[];
  arrayBlockRowCounts?: number[];
  arrayBlockBoundingBoxes?: Array<{ minX: number; maxX: number; minY: number; maxY: number }>;
  polygonOutsideModuleCount?: number;
  /** 건물형 Phase 3.1 */
  roofFillStrategy?: "centered" | "distributed";
  roofCenteringApplied?: boolean;
  roofUnusedAreaRatio?: number;
  selectedSlotBoundingBox?: { minX: number; maxX: number; minY: number; maxY: number };
  roofPolygonBoundingBox?: { minX: number; maxX: number; minY: number; maxY: number };
  centerOffsetM?: number;
  sequentialFillRejectedReason?: string;
  registryBuildingAreaSqm?: number | null;
  detectedBuildingCount?: number;
  usedBuildingCount?: number;
  excludedBuildingCount?: number;
  excludedBuildingReasons?: string[];
  /** 다동 건물 배치 규칙 */
  multiBuildingLayoutRule?: string;
  /** Phase 1 — setback 정책 diagnostics */
  roofEdgeSetbackM?: number;
  parcelBoundarySetbackM?: number;
  landOriginalAreaSqm?: number | null;
  landUsableAreaSqm?: number | null;
  dualArraySetAisleM?: number;
  roofDualArraySetAisleM?: number;
  roofContinuousRowGapM?: number;
  /** Phase 2 */
  continuousPlacedModuleCount?: number;
  continuousPlacedKw?: number;
  dualPlacedModuleCount?: number;
  dualPlacedKw?: number;
  selectedPlacedModuleCount?: number;
  selectedPlacedKw?: number;
  layoutSelectionReason?: string;
  /** A — areaPerKw 기준 용량 (대표 용량) */
  areaBasedCapacityKw?: number;
  /** B — layout engine 배치 용량 (diagnostics) */
  layoutCapacityKw?: number;
  capacityResolutionPolicy?: "building_area_only" | "land_min_area_layout";
  capacityLimitingFactor?: "area" | "layout";
  finalPlacedModuleCount?: number;
  finalCapacityKw?: number;
  placedModuleCountByBuilding?: number[];
  /** 다중 필지 union diagnostics */
  mergedParcelCount?: number;
  mergedParcelPnus?: string[];
  unionComponentCount?: number;
  mergedParcelRingCount?: number;
  /** Narrow zone policy diagnostics */
  narrowZonePolicyApplied?: boolean;
  usableComponentCount?: number;
  selectedComponentAreaSqm?: number;
  excludedComponentAreaSqm?: number;
  excludedNarrowAreaSqm?: number;
  narrowZoneReason?: string;
  estimatedMinWidthM?: number;
  minLocalWidthM?: number;
  narrowWidthThresholdM?: number;
  landUsableAreaSqmBeforeNarrowZone?: number | null;
  /** 건물형 dual diagnostics */
  dualSetCount?: number;
  continuousMaxFill?: number;
  dualMaxFill?: number;
  appliedDualAisleM?: number;
  dualAisleEffective?: boolean;
  roofDualReason?: string;
  /** 건물형 continuous (<30kW) diagnostics */
  moduleOrientationMode?: string;
  portraitPlacedModuleCount?: number;
  landscapePlacedModuleCount?: number;
  mixedPlacedModuleCount?: number;
  selectedOrientationMode?: string;
  selectedOrientationDegrees?: number;
  maxFillPlacedModuleCount?: number;
  targetQuotaPlacedModuleCount?: number;
  targetQuotaLimited?: boolean;
  roofContinuousReason?: string;
  actualModuleShortM?: number;
  actualModuleLongM?: number;
  renderScale?: number;
  fittingModuleWidthM?: number;
  fittingModuleHeightM?: number;
  selectedRowGapM?: number;
  roofContinuousRowGapReferenceM?: number;
  selectedBandSlotCount?: number;
  unselectedValidSlotCount?: number;
  bandSelectionReason?: string;
  /** 건물형 fitting policy */
  strictPlacedModuleCount?: number;
  edgeTolerancePlacedModuleCount?: number;
  selectedFittingPolicy?: string;
  selectedToleranceM?: number;
  targetQuotaUsedForLayout?: boolean;
  dualTargetQuotaLimited?: boolean;
}

export interface ModuleLayoutResult {
  boundary: LatLngPoint[];
  /** VWorld 원본 경계 (setback 미적용) */
  sourceBoundary?: LatLngPoint[];
  /** sourceBoundary + setback 적용 결과 */
  setbackBoundary?: LatLngPoint[];
  /** 다동 건물 지붕 polygon (setback 적용) */
  buildingBoundaries?: LatLngPoint[][];
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
  overlayRoofDebug?: boolean;
  /** 건물형: 토지 cadastral 참고용 (가배치 미사용) */
  referenceCadastral?: LatLngPoint[];
  landLayoutDiagnostics?: import("@/lib/solar/landBlockLayout").LandBlockPlacementDiagnostics;
  roofLayoutDiagnostics?: import("@/lib/solar/moduleLayout").RoofPlacementDiagnostics;
  arrayLayoutDiagnostics?: import("@/lib/solar/arrayLayoutEngine").ArrayLayoutDiagnostics;
  roofFittingProbe?: import("@/lib/solar/roofFittingProbe").RoofFittingProbeReport;
  roofDebugOverlay?: import("@/lib/solar/roofFittingProbe").RoofDebugOverlay;
}
