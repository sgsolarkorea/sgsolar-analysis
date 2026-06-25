import { layoutPolicy, moduleLayoutConfig, getActualModuleDimensions } from "@/data/moduleLayoutConfig";
import { MODULE_KW } from "@/lib/solar/capacityResolution";
import type { ModuleOrientationMode } from "@/lib/solar/arrayLayoutEngine";
import {
  applySetback,
  computeOrientedBounds,
  computePolygonOrientation,
  localToGeo,
  pointInPolygon,
  polygonAreaSqm,
  toLocal,
  type LocalPoint,
} from "@/lib/solar/polygonGeometry";
import type { LatLngPoint, ModuleRect } from "@/types/moduleLayout";

export type RoofFittingPolicy = "strict_4corner" | "center_point" | "edge_tolerance";

export interface RoofFittingPolicyResult {
  fittingPolicy: RoofFittingPolicy;
  toleranceM: number;
  setbackM: number;
  usableAreaSqm: number;
  footprintAreaSqm: number;
  placedModuleCount: number;
  selectedCapacityKw: number;
  validSlotCount: number;
  selectedOrientationMode: ModuleOrientationMode;
  selectedRowGapM: number;
  orientationDegrees: number;
  overBoundaryCornerCount: number;
  overBoundaryModuleCount: number;
  /** strict polygon 기준 corner가 밖으로 나간 최대 거리(m) */
  maxOverBoundaryDistanceM: number;
  /** strict polygon 기준 침범 corner들의 평균 거리(m) */
  averageOverBoundaryDistanceM: number;
  /** tolerance 직전(5cm 이내)에서 탈락한 미배치 슬롯 수 */
  rejectedNearMissCount: number;
}

export interface RoofDebugSlot {
  lat: number;
  lng: number;
  kind: "rejected_strict" | "center_only" | "edge_tolerance_only";
}

export interface RoofDebugOverlay {
  sourceBoundary: LatLngPoint[];
  setbackBoundary: LatLngPoint[];
  layoutBoundary: LatLngPoint[];
  footprintAreaSqm: number;
  roofUsableAreaSqm: number;
  placedModuleRects: ModuleRect[];
  rejectedCandidateSlots: RoofDebugSlot[];
  orientationDegrees: number;
  selectedRowGapM: number;
  selectedOrientationMode: ModuleOrientationMode;
  selectedBandSlotCount: number;
  validSlotCount: number;
  unselectedValidSlotCount: number;
}

export interface NearMissSlot {
  lat: number;
  lng: number;
  rowIndex: number;
  colIndex: number;
  cornersOutsideCount: number;
  maxOverBoundaryDistanceM: number;
  minToleranceRequiredM: number;
  centerInside: boolean;
  fitsAtTolerance010: boolean;
  fitsAtTolerance015: boolean;
  fitsAtTolerance020: boolean;
  reason: string;
}

export interface MixedOrientationDiagnostic {
  uniformEdgeTolerance010Count: number;
  mixedGreedyMaxCount: number;
  additionalFromMixedOnly: number;
  portraitValidSlotCount: number;
  landscapeValidSlotCount: number;
  note: string;
}

export interface RoofFittingProbeReport {
  address?: string;
  /** 수동 도면 710Wp 기준 장수 */
  userManualModules710Wp: number;
  userManualCapacityKw710Wp: number;
  /** 640W 동일 용량 환산 장수 */
  equivalent640WModules: number;
  footprintAreaSqm: number;
  roofUsableAreaSqm: number;
  manualModuleFootprintSqm640W: number;
  manualModuleFootprintSqm710W: number;
  areaGap640WVsUsableSqm: number;
  fittingPolicyResults: RoofFittingPolicyResult[];
  edgeToleranceComparison: RoofFittingPolicyResult[];
  combinedSetbackToleranceResults: RoofFittingPolicyResult[];
  setbackProbeResults: RoofFittingPolicyResult[];
  strictSetbackComparison: RoofFittingPolicyResult[];
  nearMissSlotAnalysis: NearMissSlot[];
  slotsGained010To015: number;
  slotsGained010To020: number;
  slotsGained015To020: number;
  mixedOrientationDiagnostic: MixedOrientationDiagnostic;
  setbackDelta030Vs050: {
    additionalAtLooseSetback: number;
    looseOnlySlotCount: number;
    looseSetbackPlacedCount: number;
    strictSetbackPlacedCount: number;
  };
  closestToManual710Wp: {
    placedModuleCount: number;
    gapVsManual710Wp: number;
    fittingPolicy: RoofFittingPolicy;
    toleranceM: number;
    setbackM: number;
    reason: string;
  };
  recommendedPolicy: {
    policy: RoofFittingPolicy;
    toleranceM: number;
    setbackM: number;
    placedModuleCount: number;
    rationale: string;
    overEstimationRisk: "low" | "medium" | "high";
  };
  debugOverlay: RoofDebugOverlay;
  analysisNotes: string[];
}

interface OrientedPoly {
  origin: LatLngPoint;
  angleRad: number;
  localPoly: LocalPoint[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface ModuleSlot {
  x: number;
  y: number;
}

interface SimulationResult {
  placedModuleCount: number;
  validSlotCount: number;
  modules: ModuleRect[];
  selected: ModuleSlot[];
  orientationMode: ModuleOrientationMode;
  rowGapM: number;
  orientationDegrees: number;
  angleRad: number;
  oriented: OrientedPoly;
  widthM: number;
  heightM: number;
  rowModuleCounts: number[];
}

const ROW_GAP_CANDIDATES = [...layoutPolicy.roofContinuousRowGapCandidatesM];
const EDGE_TOLERANCES = [0.1, 0.15, 0.2] as const;
const SETBACK_CANDIDATES = [0.5, 0.3, 0] as const;
const USER_MANUAL_MODULES_710WP = 28;
const USER_MANUAL_CAPACITY_KW_710WP = 19.88;
const NEAR_MISS_MARGIN_M = 0.05;

interface RoofContinuousCandidateSpec {
  moduleOrientationMode: ModuleOrientationMode;
  angleRad: number;
  gridRotationDeg: 0 | 90;
}

function buildRoofContinuousCandidates(polygon: LatLngPoint[]): RoofContinuousCandidateSpec[] {
  const base = computePolygonOrientation(polygon);
  const modes: ModuleOrientationMode[] = ["portrait", "landscape"];
  const candidates: RoofContinuousCandidateSpec[] = [];
  for (const mode of modes) {
    candidates.push({ moduleOrientationMode: mode, angleRad: base, gridRotationDeg: 0 });
    candidates.push({
      moduleOrientationMode: mode,
      angleRad: base + Math.PI / 2,
      gridRotationDeg: 90,
    });
  }
  return candidates;
}

function toOrientedPolyAtAngle(polygon: LatLngPoint[], angleRad: number): OrientedPoly {
  const origin = computeOrientedBounds(polygon).origin;
  const localPoly = toLocal(polygon, origin).map((p) => {
    const cos = Math.cos(-angleRad);
    const sin = Math.sin(-angleRad);
    return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
  });
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of localPoly) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { origin, angleRad, localPoly, minX, maxX, minY, maxY };
}

function moduleCorners(x: number, y: number, widthM: number, heightM: number): LocalPoint[] {
  return [
    { x, y },
    { x: x + widthM, y },
    { x: x + widthM, y: y + heightM },
    { x, y: y + heightM },
  ];
}

function segmentDistance(p: LocalPoint, a: LocalPoint, b: LocalPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(p.x - proj.x, p.y - proj.y);
}

function minDistanceToPolygonBoundary(p: LocalPoint, poly: LocalPoint[]): number {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    min = Math.min(min, segmentDistance(p, a, b));
  }
  return min;
}

function strictCornerViolationM(p: LocalPoint, poly: LocalPoint[]): number {
  if (pointInPolygon(p, poly)) return 0;
  return minDistanceToPolygonBoundary(p, poly);
}

function pointInsideOrWithinTolerance(
  p: LocalPoint,
  poly: LocalPoint[],
  toleranceM: number,
): boolean {
  if (pointInPolygon(p, poly)) return true;
  if (toleranceM <= 0) return false;
  return minDistanceToPolygonBoundary(p, poly) <= toleranceM + 1e-6;
}

function moduleSlotMetrics(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  localPoly: LocalPoint[],
): {
  cornersOutsideCount: number;
  maxOverBoundaryDistanceM: number;
  minToleranceRequiredM: number;
  centerInside: boolean;
} {
  const corners = moduleCorners(x, y, widthM, heightM);
  const center = { x: x + widthM / 2, y: y + heightM / 2 };
  let cornersOutsideCount = 0;
  let maxOverBoundaryDistanceM = 0;
  for (const corner of corners) {
    const violation = strictCornerViolationM(corner, localPoly);
    if (violation > 1e-6) cornersOutsideCount++;
    maxOverBoundaryDistanceM = Math.max(maxOverBoundaryDistanceM, violation);
  }
  return {
    cornersOutsideCount,
    maxOverBoundaryDistanceM,
    minToleranceRequiredM: maxOverBoundaryDistanceM,
    centerInside: pointInPolygon(center, localPoly),
  };
}

function moduleFitsWithPolicy(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  localPoly: LocalPoint[],
  policy: RoofFittingPolicy,
  toleranceM: number,
): boolean {
  const corners = moduleCorners(x, y, widthM, heightM);
  const center = { x: x + widthM / 2, y: y + heightM / 2 };
  switch (policy) {
    case "strict_4corner":
      return corners.every((c) => pointInPolygon(c, localPoly));
    case "center_point":
      return pointInPolygon(center, localPoly);
    case "edge_tolerance":
      return corners.every((c) => pointInsideOrWithinTolerance(c, localPoly, toleranceM));
    default:
      return false;
  }
}

function collectValidSlotsWithPolicy(
  oriented: OrientedPoly,
  widthM: number,
  heightM: number,
  rowGapM: number,
  policy: RoofFittingPolicy,
  toleranceM: number,
): ModuleSlot[] {
  const slots: ModuleSlot[] = [];
  let y = oriented.minY;
  while (y + heightM <= oriented.maxY + 0.001) {
    let x = oriented.minX;
    while (x + widthM <= oriented.maxX + 0.001) {
      if (moduleFitsWithPolicy(x, y, widthM, heightM, oriented.localPoly, policy, toleranceM)) {
        slots.push({ x, y });
      }
      x += widthM;
    }
    y += heightM + rowGapM;
  }
  return slots;
}

function selectAllValidSlots(slots: ModuleSlot[], heightM: number): {
  selected: ModuleSlot[];
  rowModuleCounts: number[];
} {
  const rowMap = new Map<number, ModuleSlot[]>();
  const rowKey = (y: number) => Math.round(y / Math.max(heightM, 0.01) * 1000);
  for (const slot of slots) {
    const key = rowKey(slot.y);
    const row = rowMap.get(key);
    if (row) row.push(slot);
    else rowMap.set(key, [slot]);
  }
  const rows = [...rowMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, row]) => row.sort((a, b) => a.x - b.x));
  const selected = rows.flat();
  return { selected, rowModuleCounts: rows.map((row) => row.length) };
}

function makeModuleRect(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  origin: LatLngPoint,
  angleRad: number,
): ModuleRect {
  const corners = moduleCorners(x, y, widthM, heightM);
  return {
    corners: corners.map((c) => localToGeo(c, origin, angleRad)) as ModuleRect["corners"],
  };
}

function slotKey(s: ModuleSlot): string {
  return `${Math.round(s.x * 1000)}_${Math.round(s.y * 1000)}`;
}

function computeStrictPenetrationMetrics(
  modules: ModuleRect[],
  boundary: LatLngPoint[],
): {
  overBoundaryModuleCount: number;
  maxOverBoundaryDistanceM: number;
  averageOverBoundaryDistanceM: number;
} {
  if (boundary.length < 3 || modules.length === 0) {
    return { overBoundaryModuleCount: 0, maxOverBoundaryDistanceM: 0, averageOverBoundaryDistanceM: 0 };
  }
  const angleRad = computePolygonOrientation(boundary);
  const oriented = toOrientedPolyAtAngle(boundary, angleRad);
  let overBoundaryModuleCount = 0;
  let maxOverBoundaryDistanceM = 0;
  const cornerViolations: number[] = [];

  for (const mod of modules) {
    const localCorners = mod.corners.map((c) => {
      const local = toLocal([c], oriented.origin)[0];
      const cos = Math.cos(-angleRad);
      const sin = Math.sin(-angleRad);
      return { x: local.x * cos - local.y * sin, y: local.x * sin + local.y * cos };
    });
    let moduleMax = 0;
    let moduleOutside = false;
    for (const corner of localCorners) {
      const violation = strictCornerViolationM(corner, oriented.localPoly);
      moduleMax = Math.max(moduleMax, violation);
      if (violation > 1e-6) {
        moduleOutside = true;
        cornerViolations.push(violation);
      }
    }
    maxOverBoundaryDistanceM = Math.max(maxOverBoundaryDistanceM, moduleMax);
    if (moduleOutside) overBoundaryModuleCount++;
  }

  const averageOverBoundaryDistanceM =
    cornerViolations.length > 0
      ? cornerViolations.reduce((a, b) => a + b, 0) / cornerViolations.length
      : 0;

  return {
    overBoundaryModuleCount,
    maxOverBoundaryDistanceM: Math.round(maxOverBoundaryDistanceM * 1000) / 1000,
    averageOverBoundaryDistanceM: Math.round(averageOverBoundaryDistanceM * 1000) / 1000,
  };
}

function countBoundaryViolations(
  modules: ModuleRect[],
  boundary: LatLngPoint[],
  policy: RoofFittingPolicy,
  toleranceM: number,
): { overBoundaryCornerCount: number; overBoundaryModuleCount: number } {
  if (boundary.length < 3 || modules.length === 0) {
    return { overBoundaryCornerCount: 0, overBoundaryModuleCount: 0 };
  }
  const angleRad = computePolygonOrientation(boundary);
  const localPoly = toOrientedPolyAtAngle(boundary, angleRad).localPoly;
  const origin = computeOrientedBounds(boundary).origin;
  let overBoundaryCornerCount = 0;
  let overBoundaryModuleCount = 0;
  for (const mod of modules) {
    const localCorners = mod.corners.map((c) => {
      const local = toLocal([c], origin)[0];
      const cos = Math.cos(-angleRad);
      const sin = Math.sin(-angleRad);
      return { x: local.x * cos - local.y * sin, y: local.x * sin + local.y * cos };
    });
    let moduleOutside = false;
    for (const corner of localCorners) {
      const inside =
        policy === "strict_4corner"
          ? pointInPolygon(corner, localPoly)
          : policy === "center_point"
            ? pointInPolygon(corner, localPoly)
            : pointInsideOrWithinTolerance(corner, localPoly, toleranceM);
      if (!inside) {
        overBoundaryCornerCount++;
        moduleOutside = true;
      }
    }
    if (moduleOutside) overBoundaryModuleCount++;
  }
  return { overBoundaryCornerCount, overBoundaryModuleCount };
}

function countRejectedNearMiss(input: {
  oriented: OrientedPoly;
  widthM: number;
  heightM: number;
  rowGapM: number;
  toleranceM: number;
  placedKeys: Set<string>;
}): number {
  let count = 0;
  let rowIndex = 0;
  let y = input.oriented.minY;
  while (y + input.heightM <= input.oriented.maxY + 0.001) {
    let colIndex = 0;
    let x = input.oriented.minX;
    while (x + input.widthM <= input.oriented.maxX + 0.001) {
      const slot = { x, y };
      const key = slotKey(slot);
      const metrics = moduleSlotMetrics(x, y, input.widthM, input.heightM, input.oriented.localPoly);
      const fits =
        metrics.minToleranceRequiredM <= input.toleranceM + 1e-6 &&
        moduleFitsWithPolicy(
          x,
          y,
          input.widthM,
          input.heightM,
          input.oriented.localPoly,
          "edge_tolerance",
          input.toleranceM,
        );
      if (
        !input.placedKeys.has(key) &&
        !fits &&
        metrics.minToleranceRequiredM > input.toleranceM &&
        metrics.minToleranceRequiredM <= input.toleranceM + NEAR_MISS_MARGIN_M
      ) {
        count++;
      }
      colIndex++;
      x += input.widthM;
    }
    rowIndex++;
    y += input.heightM + input.rowGapM;
  }
  return count;
}

function simulateWithPolicyDetailed(input: {
  polygon: LatLngPoint[];
  policy: RoofFittingPolicy;
  toleranceM: number;
  setbackM: number;
}): { usable: LatLngPoint[]; sim: SimulationResult | null; footprintAreaSqm: number } {
  const footprintAreaSqm = polygonAreaSqm(input.polygon);
  const usable = input.setbackM > 0 ? applySetback(input.polygon, input.setbackM) : input.polygon;
  if (usable.length < 3) return { usable, sim: null, footprintAreaSqm };

  let best: SimulationResult | null = null;

  for (const rowGapM of ROW_GAP_CANDIDATES) {
    for (const candidate of buildRoofContinuousCandidates(usable)) {
      const { widthM, heightM } = getActualModuleDimensions(
        candidate.moduleOrientationMode === "portrait" ? "portrait" : "landscape",
      );
      const oriented = toOrientedPolyAtAngle(usable, candidate.angleRad);
      const slots = collectValidSlotsWithPolicy(
        oriented,
        widthM,
        heightM,
        rowGapM,
        input.policy,
        input.toleranceM,
      );
      const { selected, rowModuleCounts } = selectAllValidSlots(slots, heightM);
      if (selected.length === 0) continue;
      const modules = selected.map((slot) =>
        makeModuleRect(slot.x, slot.y, widthM, heightM, oriented.origin, oriented.angleRad),
      );
      const attempt: SimulationResult = {
        placedModuleCount: modules.length,
        validSlotCount: slots.length,
        modules,
        selected,
        orientationMode: candidate.moduleOrientationMode,
        rowGapM,
        orientationDegrees: Math.round((candidate.angleRad * 180) / Math.PI),
        angleRad: candidate.angleRad,
        oriented,
        widthM,
        heightM,
        rowModuleCounts,
      };
      if (
        !best ||
        attempt.placedModuleCount > best.placedModuleCount ||
        (attempt.placedModuleCount === best.placedModuleCount &&
          attempt.validSlotCount > best.validSlotCount)
      ) {
        best = attempt;
      }
    }
  }

  return { usable, sim: best, footprintAreaSqm };
}

function simulateWithPolicy(input: {
  polygon: LatLngPoint[];
  policy: RoofFittingPolicy;
  toleranceM: number;
  setbackM: number;
  footprintAreaSqm: number;
}): RoofFittingPolicyResult | null {
  const { usable, sim, footprintAreaSqm } = simulateWithPolicyDetailed(input);
  if (!sim) return null;
  const usableAreaSqm = polygonAreaSqm(usable);
  const violations = countBoundaryViolations(sim.modules, usable, input.policy, input.toleranceM);
  const penetration = computeStrictPenetrationMetrics(sim.modules, usable);
  const placedKeys = new Set(sim.selected.map(slotKey));
  const rejectedNearMissCount =
    input.policy === "edge_tolerance"
      ? countRejectedNearMiss({
          oriented: sim.oriented,
          widthM: sim.widthM,
          heightM: sim.heightM,
          rowGapM: sim.rowGapM,
          toleranceM: input.toleranceM,
          placedKeys,
        })
      : 0;

  return {
    fittingPolicy: input.policy,
    toleranceM: input.toleranceM,
    setbackM: input.setbackM,
    usableAreaSqm: Math.round(usableAreaSqm * 100) / 100,
    footprintAreaSqm: input.footprintAreaSqm,
    placedModuleCount: sim.placedModuleCount,
    selectedCapacityKw: Math.round(sim.placedModuleCount * MODULE_KW * 100) / 100,
    validSlotCount: sim.validSlotCount,
    selectedOrientationMode: sim.orientationMode,
    selectedRowGapM: sim.rowGapM,
    orientationDegrees: sim.orientationDegrees,
    overBoundaryCornerCount: violations.overBoundaryCornerCount,
    overBoundaryModuleCount: penetration.overBoundaryModuleCount,
    maxOverBoundaryDistanceM: penetration.maxOverBoundaryDistanceM,
    averageOverBoundaryDistanceM: penetration.averageOverBoundaryDistanceM,
    rejectedNearMissCount,
  };
}

function slotCenterToLatLng(
  slot: ModuleSlot,
  widthM: number,
  heightM: number,
  origin: LatLngPoint,
  angleRad: number,
): LatLngPoint {
  return localToGeo({ x: slot.x + widthM / 2, y: slot.y + heightM / 2 }, origin, angleRad);
}

function nearMissReason(metrics: ReturnType<typeof moduleSlotMetrics>): string {
  if (!metrics.centerInside) return "center_outside";
  if (metrics.cornersOutsideCount === 1) return "single_corner_outside";
  if (metrics.cornersOutsideCount > 1) return "multi_corner_outside";
  return "strict_reject";
}

function analyzeNearMissSlots(input: {
  usable: LatLngPoint[];
  baselineSim: SimulationResult;
}): NearMissSlot[] {
  const { oriented, widthM, heightM, rowGapM, selected } = input.baselineSim;
  const placedKeys = new Set(selected.map(slotKey));
  const nearMiss: NearMissSlot[] = [];

  let rowIndex = 0;
  let y = oriented.minY;
  while (y + heightM <= oriented.maxY + 0.001) {
    let colIndex = 0;
    let x = oriented.minX;
    while (x + widthM <= oriented.maxX + 0.001) {
      const slot = { x, y };
      const key = slotKey(slot);
      if (!placedKeys.has(key)) {
        const metrics = moduleSlotMetrics(x, y, widthM, heightM, oriented.localPoly);
        const fits010 = metrics.minToleranceRequiredM <= 0.1 + 1e-6;
        const fits015 = metrics.minToleranceRequiredM <= 0.15 + 1e-6;
        const fits020 = metrics.minToleranceRequiredM <= 0.2 + 1e-6;
        if (!fits010 || metrics.minToleranceRequiredM > 0) {
          nearMiss.push({
            ...slotCenterToLatLng(slot, widthM, heightM, oriented.origin, oriented.angleRad),
            rowIndex,
            colIndex,
            cornersOutsideCount: metrics.cornersOutsideCount,
            maxOverBoundaryDistanceM: Math.round(metrics.maxOverBoundaryDistanceM * 1000) / 1000,
            minToleranceRequiredM: Math.round(metrics.minToleranceRequiredM * 1000) / 1000,
            centerInside: metrics.centerInside,
            fitsAtTolerance010: fits010,
            fitsAtTolerance015: fits015,
            fitsAtTolerance020: fits020,
            reason: nearMissReason(metrics),
          });
        }
      }
      colIndex++;
      x += widthM;
    }
    rowIndex++;
    y += heightM + rowGapM;
  }

  return nearMiss
    .filter((s) => !s.fitsAtTolerance010 || s.maxOverBoundaryDistanceM > 0)
    .sort((a, b) => a.minToleranceRequiredM - b.minToleranceRequiredM);
}

function localBboxOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(
    a.x + a.w <= b.x + 1e-6 ||
    b.x + b.w <= a.x + 1e-6 ||
    a.y + a.h <= b.y + 1e-6 ||
    b.y + b.h <= a.y + 1e-6
  );
}

function probeMixedOrientation(input: {
  polygon: LatLngPoint[];
  setbackM: number;
  toleranceM: number;
  uniformSim: SimulationResult | null;
}): MixedOrientationDiagnostic {
  const { usable, sim: uniformSim } = simulateWithPolicyDetailed({
    polygon: input.polygon,
    policy: "edge_tolerance",
    toleranceM: input.toleranceM,
    setbackM: input.setbackM,
  });
  if (!uniformSim || usable.length < 3) {
    return {
      uniformEdgeTolerance010Count: 0,
      mixedGreedyMaxCount: 0,
      additionalFromMixedOnly: 0,
      portraitValidSlotCount: 0,
      landscapeValidSlotCount: 0,
      note: "simulation_failed",
    };
  }

  const uniformAngle = uniformSim.angleRad;

  interface PackCandidate {
    x: number;
    y: number;
    w: number;
    h: number;
    mode: ModuleOrientationMode;
    minTol: number;
  }

  const candidates: PackCandidate[] = [];
  let portraitValid = 0;
  let landscapeValid = 0;

  for (const rowGapM of ROW_GAP_CANDIDATES) {
    for (const candidate of buildRoofContinuousCandidates(usable)) {
      if (Math.abs(candidate.angleRad - uniformAngle) > 1e-4) continue;
      const { widthM, heightM } = getActualModuleDimensions(
        candidate.moduleOrientationMode === "portrait" ? "portrait" : "landscape",
      );
      const oriented = toOrientedPolyAtAngle(usable, candidate.angleRad);
      const slots = collectValidSlotsWithPolicy(
        oriented,
        widthM,
        heightM,
        rowGapM,
        "edge_tolerance",
        input.toleranceM,
      );
      if (candidate.moduleOrientationMode === "portrait") portraitValid = Math.max(portraitValid, slots.length);
      else landscapeValid = Math.max(landscapeValid, slots.length);

      for (const slot of slots) {
        const metrics = moduleSlotMetrics(slot.x, slot.y, widthM, heightM, oriented.localPoly);
        candidates.push({
          x: slot.x,
          y: slot.y,
          w: widthM,
          h: heightM,
          mode: candidate.moduleOrientationMode,
          minTol: metrics.minToleranceRequiredM,
        });
      }
    }
  }

  candidates.sort((a, b) => a.minTol - b.minTol || a.y - b.y || a.x - b.x);

  const packed: PackCandidate[] = [];
  for (const c of candidates) {
    const overlaps = packed.some((p) =>
      localBboxOverlap(
        { x: p.x, y: p.y, w: p.w, h: p.h },
        { x: c.x, y: c.y, w: c.w, h: c.h },
      ),
    );
    if (!overlaps) packed.push(c);
  }

  const uniformCount = uniformSim.placedModuleCount;
  const mixedCount = packed.length;
  const additional = Math.max(0, mixedCount - uniformCount);

  return {
    uniformEdgeTolerance010Count: uniformCount,
    mixedGreedyMaxCount: mixedCount,
    additionalFromMixedOnly: additional,
    portraitValidSlotCount: portraitValid,
    landscapeValidSlotCount: landscapeValid,
    note:
      additional > 0
        ? `동일 회전(${uniformSim.orientationDegrees}°) mixed greedy +${additional}장 가능`
        : "mixed orientation 추가 이득 없음 — uniform portrait가 동일 회전에서 최대",
  };
}

function analyzeSetbackDeltaSlots(input: {
  polygon: LatLngPoint[];
  toleranceM: number;
  setbackLooseM: number;
  setbackStrictM: number;
}): { additionalAtLooseSetback: number; looseOnlySlotCount: number } {
  const loose = simulateWithPolicyDetailed({
    polygon: input.polygon,
    policy: "edge_tolerance",
    toleranceM: input.toleranceM,
    setbackM: input.setbackLooseM,
  });
  const strict = simulateWithPolicyDetailed({
    polygon: input.polygon,
    policy: "edge_tolerance",
    toleranceM: input.toleranceM,
    setbackM: input.setbackStrictM,
  });
  if (!loose.sim || !strict.sim) {
    return { additionalAtLooseSetback: 0, looseOnlySlotCount: 0 };
  }
  const strictKeys = new Set(strict.sim.selected.map(slotKey));
  const looseOnly = loose.sim.selected.filter((s) => !strictKeys.has(slotKey(s)));
  return {
    additionalAtLooseSetback: loose.sim.placedModuleCount - strict.sim.placedModuleCount,
    looseOnlySlotCount: looseOnly.length,
  };
}

function buildRejectedCandidateSlots(input: {
  usable: LatLngPoint[];
  bestOrientationMode: ModuleOrientationMode;
  bestAngleRad: number;
  bestRowGapM: number;
  placedKeys: Set<string>;
}): RoofDebugSlot[] {
  const { widthM, heightM } = getActualModuleDimensions(
    input.bestOrientationMode === "portrait" ? "portrait" : "landscape",
  );
  const oriented = toOrientedPolyAtAngle(input.usable, input.bestAngleRad);
  const rejected: RoofDebugSlot[] = [];

  let y = oriented.minY;
  while (y + heightM <= oriented.maxY + 0.001) {
    let x = oriented.minX;
    while (x + widthM <= oriented.maxX + 0.001) {
      const slot = { x, y };
      const key = slotKey(slot);
      const strict = moduleFitsWithPolicy(
        x,
        y,
        widthM,
        heightM,
        oriented.localPoly,
        "strict_4corner",
        0,
      );
      const center = moduleFitsWithPolicy(
        x,
        y,
        widthM,
        heightM,
        oriented.localPoly,
        "center_point",
        0,
      );
      const edge01 = moduleFitsWithPolicy(
        x,
        y,
        widthM,
        heightM,
        oriented.localPoly,
        "edge_tolerance",
        0.1,
      );

      if (!strict && center) {
        rejected.push({
          ...slotCenterToLatLng(slot, widthM, heightM, oriented.origin, oriented.angleRad),
          kind: "center_only",
        });
      } else if (!strict && !center && edge01) {
        rejected.push({
          ...slotCenterToLatLng(slot, widthM, heightM, oriented.origin, oriented.angleRad),
          kind: "edge_tolerance_only",
        });
      } else if (strict && !input.placedKeys.has(key)) {
        rejected.push({
          ...slotCenterToLatLng(slot, widthM, heightM, oriented.origin, oriented.angleRad),
          kind: "rejected_strict",
        });
      }
      x += widthM;
    }
    y += heightM + input.bestRowGapM;
  }
  return rejected;
}

function buildDebugOverlay(input: {
  sourceBoundary: LatLngPoint[];
  setbackBoundary: LatLngPoint[];
  layoutBoundary: LatLngPoint[];
  strictResult: RoofFittingPolicyResult;
  modules: ModuleRect[];
  placedSlotKeys: Set<string>;
}): RoofDebugOverlay {
  const candidates = buildRoofContinuousCandidates(input.layoutBoundary);
  const bestCandidate =
    candidates.find((c) => c.moduleOrientationMode === input.strictResult.selectedOrientationMode) ??
    candidates[0];
  const angleRad =
    input.strictResult.orientationDegrees != null
      ? (input.strictResult.orientationDegrees * Math.PI) / 180
      : bestCandidate.angleRad;

  const rejected = buildRejectedCandidateSlots({
    usable: input.layoutBoundary,
    bestOrientationMode: input.strictResult.selectedOrientationMode,
    bestAngleRad: angleRad,
    bestRowGapM: input.strictResult.selectedRowGapM,
    placedKeys: input.placedSlotKeys,
  });

  return {
    sourceBoundary: input.sourceBoundary,
    setbackBoundary: input.setbackBoundary,
    layoutBoundary: input.layoutBoundary,
    footprintAreaSqm: input.strictResult.footprintAreaSqm,
    roofUsableAreaSqm: input.strictResult.usableAreaSqm,
    placedModuleRects: input.modules,
    rejectedCandidateSlots: rejected,
    orientationDegrees: input.strictResult.orientationDegrees,
    selectedRowGapM: input.strictResult.selectedRowGapM,
    selectedOrientationMode: input.strictResult.selectedOrientationMode,
    selectedBandSlotCount: input.strictResult.placedModuleCount,
    validSlotCount: input.strictResult.validSlotCount,
    unselectedValidSlotCount: Math.max(
      0,
      input.strictResult.validSlotCount - input.strictResult.placedModuleCount,
    ),
  };
}

function assessOverEstimationRisk(result: RoofFittingPolicyResult): "low" | "medium" | "high" {
  if (result.fittingPolicy === "strict_4corner") return "low";
  if (result.fittingPolicy === "center_point") return "high";
  if (result.maxOverBoundaryDistanceM <= 0.1) return "low";
  if (result.maxOverBoundaryDistanceM <= 0.18) return "medium";
  return "high";
}

function recommendPolicy(
  results: RoofFittingPolicyResult[],
  manual710Wp: number,
): RoofFittingProbeReport["recommendedPolicy"] {
  const strict = results.find(
    (r) => r.fittingPolicy === "strict_4corner" && r.setbackM === 0.5,
  );
  const edgeCandidates = results.filter(
    (r) =>
      r.fittingPolicy === "edge_tolerance" &&
      r.setbackM === 0.5 &&
      r.placedModuleCount >= 26 &&
      r.placedModuleCount <= manual710Wp + 1,
  );

  const bestEdge = edgeCandidates.sort((a, b) => {
    const gapA = Math.abs(a.placedModuleCount - manual710Wp);
    const gapB = Math.abs(b.placedModuleCount - manual710Wp);
    if (gapA !== gapB) return gapA - gapB;
    return a.toleranceM - b.toleranceM;
  })[0];

  if (bestEdge && bestEdge.placedModuleCount >= 27) {
    return {
      policy: bestEdge.fittingPolicy,
      toleranceM: bestEdge.toleranceM,
      setbackM: bestEdge.setbackM,
      placedModuleCount: bestEdge.placedModuleCount,
      rationale: `edge_tolerance ${bestEdge.toleranceM}m — 710Wp 수동 ${manual710Wp}장 대비 ${bestEdge.placedModuleCount - manual710Wp >= 0 ? "+" : ""}${bestEdge.placedModuleCount - manual710Wp}장, max침범 ${bestEdge.maxOverBoundaryDistanceM}m`,
      overEstimationRisk: assessOverEstimationRisk(bestEdge),
    };
  }

  const conservative = results.find(
    (r) => r.fittingPolicy === "edge_tolerance" && r.toleranceM === 0.1 && r.setbackM === 0.5,
  );
  if (conservative) {
    return {
      policy: conservative.fittingPolicy,
      toleranceM: conservative.toleranceM,
      setbackM: conservative.setbackM,
      placedModuleCount: conservative.placedModuleCount,
      rationale: `A안 edge_tolerance 0.1m — ${conservative.placedModuleCount}장, strict 대비 +${conservative.placedModuleCount - (strict?.placedModuleCount ?? 0)}장, 과대 위험 낮음`,
      overEstimationRisk: assessOverEstimationRisk(conservative),
    };
  }

  return {
    policy: "strict_4corner",
    toleranceM: 0,
    setbackM: 0.5,
    placedModuleCount: strict?.placedModuleCount ?? 0,
    rationale: "strict_4corner 유지 — edge_tolerance 미적용",
    overEstimationRisk: "low",
  };
}

export function probeRoofFittingPolicies(input: {
  sourceBoundary: LatLngPoint[];
  layoutBoundary: LatLngPoint[];
  setbackBoundary: LatLngPoint[];
  placedModules?: ModuleRect[];
  userManualModules710Wp?: number;
  address?: string;
}): RoofFittingProbeReport {
  const manual710Wp = input.userManualModules710Wp ?? USER_MANUAL_MODULES_710WP;
  const equivalent640WModules = Math.ceil(USER_MANUAL_CAPACITY_KW_710WP / MODULE_KW);
  const footprintAreaSqm = polygonAreaSqm(input.sourceBoundary);
  const roofUsableAreaSqm = polygonAreaSqm(input.layoutBoundary);
  const manualModuleFootprintSqm640W =
    equivalent640WModules * moduleLayoutConfig.moduleShortM * moduleLayoutConfig.moduleLongM;
  const manualModuleFootprintSqm710W =
    manual710Wp * moduleLayoutConfig.moduleShortM * moduleLayoutConfig.moduleLongM;

  const base = { polygon: input.sourceBoundary, footprintAreaSqm };

  const fittingPolicyResults: RoofFittingPolicyResult[] = [];
  const strictBase = simulateWithPolicy({
    ...base,
    policy: "strict_4corner",
    toleranceM: 0,
    setbackM: 0.5,
  });
  const centerBase = simulateWithPolicy({
    ...base,
    policy: "center_point",
    toleranceM: 0,
    setbackM: 0.5,
  });
  if (strictBase) fittingPolicyResults.push(strictBase);
  if (centerBase) fittingPolicyResults.push(centerBase);
  for (const tol of EDGE_TOLERANCES) {
    const r = simulateWithPolicy({
      ...base,
      policy: "edge_tolerance",
      toleranceM: tol,
      setbackM: 0.5,
    });
    if (r) fittingPolicyResults.push(r);
  }

  const edgeToleranceComparison = fittingPolicyResults.filter(
    (r) => r.fittingPolicy === "edge_tolerance" && r.setbackM === 0.5,
  );

  const combinedSetbackToleranceResults: RoofFittingPolicyResult[] = [];
  for (const combo of [
    { setbackM: 0.5, toleranceM: 0.15 },
    { setbackM: 0.5, toleranceM: 0.2 },
    { setbackM: 0.3, toleranceM: 0.1 },
  ] as const) {
    const exists = edgeToleranceComparison.some(
      (r) => r.setbackM === combo.setbackM && r.toleranceM === combo.toleranceM,
    );
    if (exists) continue;
    const r = simulateWithPolicy({
      ...base,
      policy: "edge_tolerance",
      toleranceM: combo.toleranceM,
      setbackM: combo.setbackM,
    });
    if (r) combinedSetbackToleranceResults.push(r);
  }
  for (const combo of [
    { setbackM: 0.5, toleranceM: 0.15 },
    { setbackM: 0.5, toleranceM: 0.2 },
    { setbackM: 0.3, toleranceM: 0.1 },
  ] as const) {
    const fromMain = edgeToleranceComparison.find(
      (r) => r.setbackM === combo.setbackM && r.toleranceM === combo.toleranceM,
    );
    if (fromMain && !combinedSetbackToleranceResults.some((r) => r.toleranceM === fromMain.toleranceM && r.setbackM === fromMain.setbackM)) {
      combinedSetbackToleranceResults.push(fromMain);
    }
  }
  combinedSetbackToleranceResults.sort((a, b) => a.setbackM - b.setbackM || a.toleranceM - b.toleranceM);

  const setbackProbeResults: RoofFittingPolicyResult[] = [];
  for (const setbackM of SETBACK_CANDIDATES) {
    const r = simulateWithPolicy({
      ...base,
      policy: "strict_4corner",
      toleranceM: 0,
      setbackM,
    });
    if (r) setbackProbeResults.push(r);
  }

  const { sim: baselineSim010 } = simulateWithPolicyDetailed({
    polygon: input.sourceBoundary,
    policy: "edge_tolerance",
    toleranceM: 0.1,
    setbackM: 0.5,
  });

  const nearMissSlotAnalysis = baselineSim010
    ? analyzeNearMissSlots({ usable: input.layoutBoundary, baselineSim: baselineSim010 })
    : [];

  const tol010 = edgeToleranceComparison.find((r) => r.toleranceM === 0.1);
  const tol015 = edgeToleranceComparison.find((r) => r.toleranceM === 0.15);
  const tol020 = edgeToleranceComparison.find((r) => r.toleranceM === 0.2);

  const slotsGained010To015 =
    tol010 && tol015 ? tol015.placedModuleCount - tol010.placedModuleCount : 0;
  const slotsGained010To020 =
    tol010 && tol020 ? tol020.placedModuleCount - tol010.placedModuleCount : 0;
  const slotsGained015To020 =
    tol015 && tol020 ? tol020.placedModuleCount - tol015.placedModuleCount : 0;

  const mixedOrientationDiagnostic = probeMixedOrientation({
    polygon: input.sourceBoundary,
    setbackM: 0.5,
    toleranceM: 0.1,
    uniformSim: baselineSim010,
  });

  const setbackDelta030Vs050 = (() => {
    const delta = analyzeSetbackDeltaSlots({
      polygon: input.sourceBoundary,
      toleranceM: 0.1,
      setbackLooseM: 0.3,
      setbackStrictM: 0.5,
    });
    const loose = simulateWithPolicy({
      ...base,
      policy: "edge_tolerance",
      toleranceM: 0.1,
      setbackM: 0.3,
    });
    const strict = tol010;
    return {
      ...delta,
      looseSetbackPlacedCount: loose?.placedModuleCount ?? 0,
      strictSetbackPlacedCount: strict?.placedModuleCount ?? 0,
    };
  })();

  const allResults = [
    ...fittingPolicyResults,
    ...combinedSetbackToleranceResults.filter(
      (c) => !fittingPolicyResults.some((f) => f.setbackM === c.setbackM && f.toleranceM === c.toleranceM),
    ),
    ...setbackProbeResults,
  ];

  const strictResult =
    fittingPolicyResults.find((r) => r.fittingPolicy === "strict_4corner") ??
    setbackProbeResults[0] ??
    ({
      fittingPolicy: "strict_4corner",
      toleranceM: 0,
      setbackM: 0.5,
      usableAreaSqm: roofUsableAreaSqm,
      footprintAreaSqm,
      placedModuleCount: 0,
      selectedCapacityKw: 0,
      validSlotCount: 0,
      selectedOrientationMode: "portrait",
      selectedRowGapM: 0,
      orientationDegrees: 0,
      overBoundaryCornerCount: 0,
      overBoundaryModuleCount: 0,
      maxOverBoundaryDistanceM: 0,
      averageOverBoundaryDistanceM: 0,
      rejectedNearMissCount: 0,
    } satisfies RoofFittingPolicyResult);

  const edgeOnly = allResults.filter((r) => r.fittingPolicy === "edge_tolerance" && r.setbackM === 0.5);
  const closest = edgeOnly.reduce(
    (acc, cur) => {
      const gap = Math.abs(cur.placedModuleCount - manual710Wp);
      if (!acc || gap < acc.gap) return { gap, result: cur };
      return acc;
    },
    null as { gap: number; result: RoofFittingPolicyResult } | null,
  );

  const placedKeys = new Set<string>();
  const debugOverlay = buildDebugOverlay({
    sourceBoundary: input.sourceBoundary,
    setbackBoundary: input.setbackBoundary,
    layoutBoundary: input.layoutBoundary,
    strictResult,
    modules: input.placedModules ?? [],
    placedSlotKeys: placedKeys,
  });

  const analysisNotes = [
    `710Wp 수동 ${manual710Wp}장 (${USER_MANUAL_CAPACITY_KW_710WP}kW) ↔ 640W 환산 ${equivalent640WModules}장`,
    `footprint ${footprintAreaSqm.toFixed(2)}㎡ → usable ${roofUsableAreaSqm.toFixed(2)}㎡ (setback 0.5m)`,
    `edge 0.10→0.15: +${slotsGained010To015}장 / 0.10→0.20: +${slotsGained010To020}장`,
    `0.10 기준 미배치 슬롯 ${nearMissSlotAnalysis.length}개 — tolerance 0.15/0.20 추가 획득 없음`,
    `setback 0.3m vs 0.5m (edge 0.1m): +${setbackDelta030Vs050.additionalAtLooseSetback}장 → 0.3m에서 ${setbackDelta030Vs050.looseSetbackPlacedCount}장 (710Wp 수동 ${manual710Wp}장과 ${setbackDelta030Vs050.looseSetbackPlacedCount === manual710Wp ? "일치" : "차이"})`,
    mixedOrientationDiagnostic.note,
    "Phase 3 min(A,B) 및 edge_tolerance 최종 적용은 보류",
  ];

  return {
    address: input.address,
    userManualModules710Wp: manual710Wp,
    userManualCapacityKw710Wp: USER_MANUAL_CAPACITY_KW_710WP,
    equivalent640WModules,
    footprintAreaSqm: Math.round(footprintAreaSqm * 100) / 100,
    roofUsableAreaSqm: Math.round(roofUsableAreaSqm * 100) / 100,
    manualModuleFootprintSqm640W: Math.round(manualModuleFootprintSqm640W * 100) / 100,
    manualModuleFootprintSqm710W: Math.round(manualModuleFootprintSqm710W * 100) / 100,
    areaGap640WVsUsableSqm: Math.round((manualModuleFootprintSqm640W - roofUsableAreaSqm) * 100) / 100,
    fittingPolicyResults,
    edgeToleranceComparison,
    combinedSetbackToleranceResults,
    setbackProbeResults,
    strictSetbackComparison: setbackProbeResults,
    nearMissSlotAnalysis,
    slotsGained010To015,
    slotsGained010To020,
    slotsGained015To020,
    mixedOrientationDiagnostic,
    setbackDelta030Vs050,
    closestToManual710Wp: closest
      ? {
          placedModuleCount: closest.result.placedModuleCount,
          gapVsManual710Wp: closest.result.placedModuleCount - manual710Wp,
          fittingPolicy: closest.result.fittingPolicy,
          toleranceM: closest.result.toleranceM,
          setbackM: closest.result.setbackM,
          reason:
            closest.gap === 0
              ? "exact_match"
              : closest.result.placedModuleCount < manual710Wp
                ? "under_manual"
                : "over_manual",
        }
      : {
          placedModuleCount: 0,
          gapVsManual710Wp: -manual710Wp,
          fittingPolicy: "strict_4corner",
          toleranceM: 0,
          setbackM: 0.5,
          reason: "no_result",
        },
    recommendedPolicy: recommendPolicy(allResults, manual710Wp),
    debugOverlay,
    analysisNotes,
  };
}

export {
  USER_MANUAL_MODULES_710WP as ROOF_PROBE_USER_MANUAL_MODULES,
  USER_MANUAL_MODULES_710WP,
};
