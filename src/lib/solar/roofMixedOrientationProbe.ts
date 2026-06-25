/**
 * Diagnostics — roof continuous mixed orientation (portrait + landscape).
 * Production layout remains uniform portrait OR landscape only.
 */
import { layoutPolicy, getActualModuleDimensions } from "@/data/moduleLayoutConfig";
import {
  computeOrientedBounds,
  computePolygonOrientation,
  polygonAreaSqm,
  toLocal,
  type LocalPoint,
} from "@/lib/solar/polygonGeometry";
import {
  moduleFitsWithRoofTolerance,
  ROOF_PRODUCTION_EDGE_TOLERANCE_M,
} from "@/lib/solar/roofModuleFitting";
import type { ModuleOrientationMode } from "@/lib/solar/arrayLayoutEngine";
import type { LatLngPoint } from "@/types/moduleLayout";

const MODULE_FOOTPRINT_SQM =
  getActualModuleDimensions("portrait").widthM * getActualModuleDimensions("portrait").heightM;

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

interface SlotBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UniformResult {
  placedModuleCount: number;
  validSlotCount: number;
  orientationMode: ModuleOrientationMode;
  angleRad: number;
  rowGapM: number;
  orientationDegrees: number;
  selected: ModuleSlot[];
  widthM: number;
  heightM: number;
  oriented: OrientedPoly;
}

export type MixedOrientationLimitingFactor =
  | "mixed_not_implemented"
  | "setback"
  | "polygon"
  | "fitting"
  | "none";

export interface RoofMixedOrientationReport {
  address?: string;
  currentEngineBehavior: "uniform_portrait_or_landscape_only";
  moduleOrientationModeSelected: ModuleOrientationMode;
  mixedPlacedModuleCountInProduction: 0;
  currentEnginePlacedModuleCount: number;
  portraitPlacedModuleCount: number;
  landscapePlacedModuleCount: number;
  mixedPlacedModuleCount: number;
  mixedPortraitComponent: number;
  mixedLandscapeComponent: number;
  mixedLandscapeFirstCount: number;
  leftoverAreaSqmAfterPortrait: number;
  leftoverAreaSqmAfterLandscape: number;
  mixedOrientationGain: number;
  uniformBestCount: number;
  manualTarget710Wp: number;
  canReach28WithMixed: boolean;
  conclusion: "case_a_setback_or_polygon" | "case_b_mixed_enables_28";
  limitingFactor: MixedOrientationLimitingFactor;
  roofUsableAreaSqm: number;
  edgeToleranceM: number;
  selectedOrientationDegrees: number;
  analysisNotes: string[];
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

function collectValidSlots(
  oriented: OrientedPoly,
  widthM: number,
  heightM: number,
  rowGapM: number,
  toleranceM: number,
): ModuleSlot[] {
  const slots: ModuleSlot[] = [];
  let y = oriented.minY;
  while (y + heightM <= oriented.maxY + 0.001) {
    let x = oriented.minX;
    while (x + widthM <= oriented.maxX + 0.001) {
      if (moduleFitsWithRoofTolerance(x, y, widthM, heightM, oriented.localPoly, toleranceM)) {
        slots.push({ x, y });
      }
      x += widthM;
    }
    y += heightM + rowGapM;
  }
  return slots;
}

function selectMaxFill(slots: ModuleSlot[], heightM: number): ModuleSlot[] {
  const rowMap = new Map<number, ModuleSlot[]>();
  const rowKey = (y: number) => Math.round(y / Math.max(heightM, 0.01) * 1000);
  for (const slot of slots) {
    const key = rowKey(slot.y);
    const row = rowMap.get(key);
    if (row) row.push(slot);
    else rowMap.set(key, [slot]);
  }
  return [...rowMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .flatMap(([, row]) => row.sort((a, b) => a.x - b.x));
}

function buildCandidates(polygon: LatLngPoint[]): Array<{
  moduleOrientationMode: ModuleOrientationMode;
  angleRad: number;
  gridRotationDeg: 0 | 90;
}> {
  const base = computePolygonOrientation(polygon);
  const modes: ModuleOrientationMode[] = ["portrait", "landscape"];
  const out: Array<{
    moduleOrientationMode: ModuleOrientationMode;
    angleRad: number;
    gridRotationDeg: 0 | 90;
  }> = [];
  for (const mode of modes) {
    out.push({ moduleOrientationMode: mode, angleRad: base, gridRotationDeg: 0 });
    out.push({ moduleOrientationMode: mode, angleRad: base + Math.PI / 2, gridRotationDeg: 90 });
  }
  return out;
}

function simulateUniformMaxFill(
  polygon: LatLngPoint[],
  mode: ModuleOrientationMode,
  toleranceM: number,
): UniformResult | null {
  let best: UniformResult | null = null;
  for (const rowGapM of layoutPolicy.roofContinuousRowGapCandidatesM) {
    for (const candidate of buildCandidates(polygon)) {
      if (candidate.moduleOrientationMode !== mode) continue;
      const { widthM, heightM } = getActualModuleDimensions(
        mode === "portrait" ? "portrait" : "landscape",
      );
      const oriented = toOrientedPolyAtAngle(polygon, candidate.angleRad);
      const slots = collectValidSlots(oriented, widthM, heightM, rowGapM, toleranceM);
      const selected = selectMaxFill(slots, heightM);
      if (selected.length === 0) continue;
      const attempt: UniformResult = {
        placedModuleCount: selected.length,
        validSlotCount: slots.length,
        orientationMode: mode,
        angleRad: candidate.angleRad,
        rowGapM,
        orientationDegrees: Math.round((candidate.angleRad * 180) / Math.PI),
        selected,
        widthM,
        heightM,
        oriented,
      };
      if (
        !best ||
        attempt.placedModuleCount > best.placedModuleCount ||
        (attempt.placedModuleCount === best.placedModuleCount &&
          attempt.validSlotCount > best.validSlotCount) ||
        (attempt.placedModuleCount === best.placedModuleCount &&
          attempt.validSlotCount === best.validSlotCount &&
          attempt.rowGapM < best.rowGapM)
      ) {
        best = attempt;
      }
    }
  }
  return best;
}

function localBboxOverlap(a: SlotBox, b: SlotBox): boolean {
  return !(
    a.x + a.w <= b.x + 1e-6 ||
    b.x + b.w <= a.x + 1e-6 ||
    a.y + a.h <= b.y + 1e-6 ||
    b.y + b.h <= a.y + 1e-6
  );
}

function slotsToBoxes(slots: ModuleSlot[], w: number, h: number): SlotBox[] {
  return slots.map((s) => ({ x: s.x, y: s.y, w, h }));
}

function collectNonOverlappingLandscape(
  polygon: LatLngPoint[],
  primary: UniformResult,
  toleranceM: number,
): ModuleSlot[] {
  const { widthM, heightM } = getActualModuleDimensions("landscape");
  const primaryBoxes = slotsToBoxes(primary.selected, primary.widthM, primary.heightM);
  let bestExtra: ModuleSlot[] = [];

  for (const rowGapM of layoutPolicy.roofContinuousRowGapCandidatesM) {
    const oriented = toOrientedPolyAtAngle(polygon, primary.angleRad);
    const landscapeSlots = collectValidSlots(oriented, widthM, heightM, rowGapM, toleranceM);
    const extra = landscapeSlots.filter((slot) => {
      const box = { x: slot.x, y: slot.y, w: widthM, h: heightM };
      return !primaryBoxes.some((p) => localBboxOverlap(box, p));
    });
    if (extra.length > bestExtra.length) bestExtra = extra;
  }
  return bestExtra;
}

function collectNonOverlappingPortrait(
  polygon: LatLngPoint[],
  primary: UniformResult,
  toleranceM: number,
): ModuleSlot[] {
  const { widthM, heightM } = getActualModuleDimensions("portrait");
  const primaryBoxes = slotsToBoxes(primary.selected, primary.widthM, primary.heightM);
  let bestExtra: ModuleSlot[] = [];

  for (const rowGapM of layoutPolicy.roofContinuousRowGapCandidatesM) {
    const oriented = toOrientedPolyAtAngle(polygon, primary.angleRad);
    const portraitSlots = collectValidSlots(oriented, widthM, heightM, rowGapM, toleranceM);
    const extra = portraitSlots.filter((slot) => {
      const box = { x: slot.x, y: slot.y, w: widthM, h: heightM };
      return !primaryBoxes.some((p) => localBboxOverlap(box, p));
    });
    if (extra.length > bestExtra.length) bestExtra = extra;
  }
  return bestExtra;
}

function simulateMixedPortraitFirst(
  polygon: LatLngPoint[],
  toleranceM: number,
): { portrait: number; landscape: number; total: number } {
  const portraitBest = simulateUniformMaxFill(polygon, "portrait", toleranceM);
  if (!portraitBest) return { portrait: 0, landscape: 0, total: 0 };
  const landscapeExtra = collectNonOverlappingLandscape(polygon, portraitBest, toleranceM);
  return {
    portrait: portraitBest.placedModuleCount,
    landscape: landscapeExtra.length,
    total: portraitBest.placedModuleCount + landscapeExtra.length,
  };
}

function simulateMixedLandscapeFirst(
  polygon: LatLngPoint[],
  toleranceM: number,
): { portrait: number; landscape: number; total: number } {
  const landscapeBest = simulateUniformMaxFill(polygon, "landscape", toleranceM);
  if (!landscapeBest) return { portrait: 0, landscape: 0, total: 0 };
  const portraitExtra = collectNonOverlappingPortrait(polygon, landscapeBest, toleranceM);
  return {
    portrait: portraitExtra.length,
    landscape: landscapeBest.placedModuleCount,
    total: landscapeBest.placedModuleCount + portraitExtra.length,
  };
}

function pickCurrentEngineUniform(polygon: LatLngPoint[], toleranceM: number): UniformResult | null {
  const portrait = simulateUniformMaxFill(polygon, "portrait", toleranceM);
  const landscape = simulateUniformMaxFill(polygon, "landscape", toleranceM);
  if (!portrait && !landscape) return null;
  if (!landscape) return portrait;
  if (!portrait) return landscape;
  if (portrait.placedModuleCount !== landscape.placedModuleCount) {
    return portrait.placedModuleCount > landscape.placedModuleCount ? portrait : landscape;
  }
  if (portrait.validSlotCount !== landscape.validSlotCount) {
    return portrait.validSlotCount > landscape.validSlotCount ? portrait : landscape;
  }
  return portrait.rowGapM <= landscape.rowGapM ? portrait : landscape;
}

function resolveLimitingFactor(input: {
  mixedCount: number;
  uniformBest: number;
  canReach28: boolean;
  mixedGain: number;
  usableAreaSqm: number;
}): MixedOrientationLimitingFactor {
  if (input.canReach28 && input.mixedGain > 0) return "mixed_not_implemented";
  if (input.mixedCount >= 28) return "none";
  if (input.mixedCount === input.uniformBest && input.uniformBest < 28) {
    const moduleArea = input.uniformBest * MODULE_FOOTPRINT_SQM;
    if (moduleArea > input.usableAreaSqm * 0.95) return "polygon";
    return "setback";
  }
  if (input.mixedGain > 0) return "mixed_not_implemented";
  return "fitting";
}

export function probeRoofMixedOrientation(input: {
  layoutPolygon: LatLngPoint[];
  toleranceM?: number;
  manualTarget710Wp?: number;
  address?: string;
}): RoofMixedOrientationReport {
  const toleranceM = input.toleranceM ?? ROOF_PRODUCTION_EDGE_TOLERANCE_M;
  const manualTarget = input.manualTarget710Wp ?? 28;
  const usableAreaSqm = polygonAreaSqm(input.layoutPolygon);

  const portraitOnly = simulateUniformMaxFill(input.layoutPolygon, "portrait", toleranceM);
  const landscapeOnly = simulateUniformMaxFill(input.layoutPolygon, "landscape", toleranceM);
  const enginePick = pickCurrentEngineUniform(input.layoutPolygon, toleranceM);

  const mixedPortraitFirst = simulateMixedPortraitFirst(input.layoutPolygon, toleranceM);
  const mixedLandscapeFirst = simulateMixedLandscapeFirst(input.layoutPolygon, toleranceM);
  const mixedBest =
    mixedPortraitFirst.total >= mixedLandscapeFirst.total ? mixedPortraitFirst : mixedLandscapeFirst;

  const portraitCount = portraitOnly?.placedModuleCount ?? 0;
  const landscapeCount = landscapeOnly?.placedModuleCount ?? 0;
  const uniformBest = Math.max(portraitCount, landscapeCount);
  const mixedOrientationGain = mixedBest.total - uniformBest;
  const canReach28 = mixedBest.total >= manualTarget;

  const portraitFootprint = mixedBest.portrait * MODULE_FOOTPRINT_SQM;
  const landscapeFootprint = mixedBest.landscape * MODULE_FOOTPRINT_SQM;
  const leftoverAfterPortrait = Math.max(0, usableAreaSqm - portraitFootprint);
  const leftoverAfterLandscape = Math.max(0, usableAreaSqm - landscapeFootprint);

  const limitingFactor = resolveLimitingFactor({
    mixedCount: mixedBest.total,
    uniformBest,
    canReach28,
    mixedGain: mixedOrientationGain,
    usableAreaSqm,
  });

  const conclusion: RoofMixedOrientationReport["conclusion"] =
    canReach28 && mixedOrientationGain > 0
      ? "case_b_mixed_enables_28"
      : "case_a_setback_or_polygon";

  const analysisNotes = [
    "production: portrait OR landscape uniform max-fill 1종만 선택 (mixed 미구현)",
    "mixedPlacedModuleCount production 필드 = 0 (hardcoded)",
    `portrait-only ${portraitCount} / landscape-only ${landscapeCount} / uniform best ${uniformBest}`,
    `mixed portrait-first ${mixedPortraitFirst.total} (P${mixedPortraitFirst.portrait}+L${mixedPortraitFirst.landscape})`,
    `mixed landscape-first ${mixedLandscapeFirst.total} (L${mixedLandscapeFirst.landscape}+P${mixedLandscapeFirst.portrait})`,
    mixedOrientationGain > 0
      ? `mixed gain +${mixedOrientationGain} vs uniform — 구현 시 추가 가능`
      : "mixed orientation 추가 이득 없음",
    canReach28
      ? `mixed simulation ${mixedBest.total}장 ≥ 수동 ${manualTarget}장`
      : `mixed simulation ${mixedBest.total}장 < 수동 ${manualTarget}장`,
  ];

  return {
    address: input.address,
    currentEngineBehavior: "uniform_portrait_or_landscape_only",
    moduleOrientationModeSelected: enginePick?.orientationMode ?? "portrait",
    mixedPlacedModuleCountInProduction: 0,
    currentEnginePlacedModuleCount: enginePick?.placedModuleCount ?? 0,
    portraitPlacedModuleCount: portraitCount,
    landscapePlacedModuleCount: landscapeCount,
    mixedPlacedModuleCount: mixedBest.total,
    mixedPortraitComponent: mixedBest.portrait,
    mixedLandscapeComponent: mixedBest.landscape,
    mixedLandscapeFirstCount: mixedLandscapeFirst.total,
    leftoverAreaSqmAfterPortrait: Math.round(leftoverAfterPortrait * 100) / 100,
    leftoverAreaSqmAfterLandscape: Math.round(leftoverAfterLandscape * 100) / 100,
    mixedOrientationGain,
    uniformBestCount: uniformBest,
    manualTarget710Wp: manualTarget,
    canReach28WithMixed: canReach28,
    conclusion,
    limitingFactor,
    roofUsableAreaSqm: Math.round(usableAreaSqm * 100) / 100,
    edgeToleranceM: toleranceM,
    selectedOrientationDegrees: enginePick?.orientationDegrees ?? 0,
    analysisNotes,
  };
}
