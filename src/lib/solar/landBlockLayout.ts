import { getVisualRowSpacingM, moduleLayoutConfig } from "@/data/moduleLayoutConfig";
import {
  computeOrientedBounds,
  localToGeo,
  pointInPolygon,
  toLocal,
  type LocalPoint,
} from "@/lib/solar/polygonGeometry";
import type { LatLngPoint, ModuleRect } from "@/types/moduleLayout";

/** 패널 면 방위 (북 기준 시계방향, °) — 남·남동·남서만 허용 */
export const LAND_CANDIDATE_AZIMUTHS_DEG = [180, 135, 225] as const;

export const LAND_DOUBLE_BLOCK_THRESHOLD_KW = 100;

/** Array 간 통로 (m) — 4~6m 범위 기본값 */
export const LAND_AISLE_M = 4;

export const TIER_ROWS_PER_ARRAY = 2;

export type LandLayoutTier = "single" | "double";

export type CapacityLayoutRule =
  | "land-single-block"
  | "land-double-block-required"
  | "roof-unchanged";

export interface LandBlockPlacementDiagnostics {
  layoutTier: LandLayoutTier;
  /** @deprecated use arrayCount — kept for backward compat */
  blockCount: number;
  /** @deprecated use arrayModuleCounts */
  blockModuleCounts: number[];
  rowCount: number;
  rowModuleCounts: number[];
  selectedAzimuthDegrees: number;
  candidateAzimuths: number[];
  candidateScores: Record<string, number>;
  capacityLayoutRule: CapacityLayoutRule;
  singleBlockRejectedReason?: string;
  unusedAreaReason?: string;
  arrayCount: number;
  arrayTierCount: number;
  tierRowsPerArray: number;
  arrayModuleCounts: number[];
  aisleM: number;
  aisleApplied: boolean;
  fillStrategy: "physical-array";
  medianSplitUsed: false;
  rowGenerationPattern: string;
  unusedAreaRatio: number;
}

export interface LandBlockPlacementResult {
  modules: ModuleRect[];
  validSlotCount: number;
  rowModuleCounts: number[];
  diagnostics: LandBlockPlacementDiagnostics;
}

interface ModuleSlot {
  x: number;
  y: number;
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

interface LayoutParams {
  kind: "land";
  mode: "flush" | "row";
  rowSpacingM: number;
}

interface PhysicalArray {
  arrayIndex: number;
  baseY: number;
  maxY: number;
  tiers: [ModuleSlot[], ModuleSlot[]];
  capacity: number;
}

function rotateLocal(point: LocalPoint, angleRad: number): LocalPoint {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

/** 패널 면 방위 → row가 X축에 오도록 하는 배치 회전각 (동=0, 반시계) */
export function panelAzimuthToLayoutAngleRad(azimuthDeg: number): number {
  const rowFromNorthDeg = (azimuthDeg - 90 + 360) % 360;
  const fromEastDeg = (90 - rowFromNorthDeg + 360) % 360;
  return (fromEastDeg * Math.PI) / 180;
}

function toOrientedPolyAtAngle(polygon: LatLngPoint[], angleRad: number): OrientedPoly {
  const origin = computeOrientedBounds(polygon).origin;
  const localPoly = toLocal(polygon, origin).map((p) => rotateLocal(p, -angleRad));

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

function moduleFitsInPolygon(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  localPoly: LocalPoint[],
): boolean {
  const corners: LocalPoint[] = [
    { x, y },
    { x: x + widthM, y },
    { x: x + widthM, y: y + heightM },
    { x, y: y + heightM },
  ];
  return corners.every((corner) => pointInPolygon(corner, localPoly));
}

function slotXKey(x: number, widthM: number): number {
  return Math.round(x / Math.max(widthM, 0.01) * 1000);
}

function collectRowSlots(
  oriented: OrientedPoly,
  y: number,
  widthM: number,
  heightM: number,
): ModuleSlot[] {
  const slots: ModuleSlot[] = [];
  for (let x = oriented.minX; x + widthM <= oriented.maxX + 0.001; x += widthM) {
    if (moduleFitsInPolygon(x, y, widthM, heightM, oriented.localPoly)) {
      slots.push({ x, y });
    }
  }
  return slots.sort((a, b) => a.x - b.x);
}

function alignTierPair(
  tier1: ModuleSlot[],
  tier2: ModuleSlot[],
  widthM: number,
): { tier1: ModuleSlot[]; tier2: ModuleSlot[] } {
  const tier2ByX = new Map<number, ModuleSlot>();
  for (const slot of tier2) tier2ByX.set(slotXKey(slot.x, widthM), slot);

  const aligned1: ModuleSlot[] = [];
  const aligned2: ModuleSlot[] = [];
  for (const s1 of tier1) {
    const s2 = tier2ByX.get(slotXKey(s1.x, widthM));
    if (s2) {
      aligned1.push(s1);
      aligned2.push(s2);
    }
  }
  return { tier1: aligned1, tier2: aligned2 };
}

/** Array 후보 = Tier 2줄. 후보 선택 단계에서 Array 간 aisle band를 강제한다. */
function generatePhysicalArrayCandidates(
  oriented: OrientedPoly,
  widthM: number,
  heightM: number,
  tierGapM: number,
): PhysicalArray[] {
  const arrays: PhysicalArray[] = [];
  let y = oriented.minY;
  let arrayIndex = 0;
  const scanStep = Math.max(heightM * 0.25, 0.2);

  while (y + heightM <= oriented.maxY + 0.001) {
    const tier1Y = y;
    const tier2Y = y + heightM + tierGapM;

    if (tier2Y + heightM > oriented.maxY + 0.001) break;

    const rawTier1 = collectRowSlots(oriented, tier1Y, widthM, heightM);
    const rawTier2 = collectRowSlots(oriented, tier2Y, widthM, heightM);
    const { tier1, tier2 } = alignTierPair(rawTier1, rawTier2, widthM);

    if (tier1.length > 0 && tier2.length > 0) {
      arrays.push({
        arrayIndex: arrayIndex++,
        baseY: tier1Y,
        maxY: tier2Y + heightM,
        tiers: [tier1, tier2],
        capacity: tier1.length * TIER_ROWS_PER_ARRAY,
      });
    }
    y += scanStep;
  }

  return arrays;
}

function selectPhysicalArrayStack(input: {
  candidates: PhysicalArray[];
  targetCount: number;
  minArrays: number;
  aisleM: number;
  oriented: OrientedPoly;
}): PhysicalArray[] {
  const { candidates, targetCount, minArrays, aisleM, oriented } = input;
  if (candidates.length === 0) return [];

  const polyCenterY = (oriented.minY + oriented.maxY) / 2;
  let best: { arrays: PhysicalArray[]; score: number } | null = null;

  for (let start = 0; start < candidates.length; start++) {
    const stack: PhysicalArray[] = [];
    let lastMaxY = -Infinity;

    for (let i = start; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (candidate.baseY < lastMaxY + aisleM - 0.001) continue;

      stack.push(candidate);
      lastMaxY = candidate.maxY;

      if (stack.length < minArrays) continue;

      const capacity = stack.reduce((sum, array) => sum + array.capacity, 0);
      const placedPotential = Math.min(capacity, targetCount);
      const shortfall = Math.max(0, targetCount - capacity);
      const stackMinY = stack[0].baseY;
      const stackMaxY = stack[stack.length - 1].maxY;
      const stackCenterY = (stackMinY + stackMaxY) / 2;
      const centerOffsetY = Math.abs(stackCenterY - polyCenterY);
      const verticalCoverage = (stackMaxY - stackMinY) / Math.max(oriented.maxY - oriented.minY, 1);
      const overCapacity = Math.max(0, capacity - targetCount);

      const score =
        placedPotential * 1000 -
        shortfall * 5000 -
        centerOffsetY * 40 +
        verticalCoverage * 120 -
        overCapacity * 0.5;

      if (!best || score > best.score) {
        best = { arrays: [...stack], score };
      }
    }
  }

  return best?.arrays.map((array, i) => ({ ...array, arrayIndex: i })) ?? [];
}

function selectCentered(slots: ModuleSlot[], count: number): ModuleSlot[] {
  if (count <= 0 || slots.length === 0) return [];
  if (slots.length <= count) return [...slots];
  const start = Math.floor((slots.length - count) / 2);
  return slots.slice(start, start + count);
}

function groupSlotsByRow(slots: ModuleSlot[], heightM: number): ModuleSlot[][] {
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
    .map(([, row]) => row.sort((a, b) => a.x - b.x));
}

function distributeQuotasMaxFill(
  capacities: number[],
  target: number,
  minActive: number,
): number[] {
  const n = capacities.length;
  if (n === 0) return [];

  const totalCap = capacities.reduce((a, b) => a + b, 0);
  const effective = Math.min(target, totalCap);
  const quotas = new Array<number>(n).fill(0);
  let placed = 0;

  for (let i = 0; i < Math.min(minActive, n) && placed < effective; i++) {
    const add = Math.min(2, capacities[i], effective - placed);
    quotas[i] = add;
    placed += add;
  }

  let idx = 0;
  let stagnant = 0;
  while (placed + 2 <= effective && stagnant < n * 4) {
    if (quotas[idx] + 2 <= capacities[idx]) {
      quotas[idx] += 2;
      placed += 2;
      stagnant = 0;
    } else {
      stagnant++;
    }
    idx = (idx + 1) % n;
  }

  while (placed < effective) {
    let added = false;
    for (let i = 0; i < n && placed < effective; i++) {
      if (quotas[i] < capacities[i]) {
        quotas[i]++;
        placed++;
        added = true;
      }
    }
    if (!added) break;
  }

  return quotas;
}

function pickAlignedPairs(tier1: ModuleSlot[], tier2: ModuleSlot[], pairCount: number): ModuleSlot[] {
  const n = Math.min(pairCount, tier1.length, tier2.length);
  if (n <= 0) return [];
  const t1 = selectCentered(tier1, n);
  const t2 = selectCentered(tier2, n);
  return [...t1, ...t2];
}

function selectFromPhysicalArrays(
  arrays: PhysicalArray[],
  targetCount: number,
  minArrays: number,
): {
  selected: ModuleSlot[];
  arrayModuleCounts: number[];
  rowModuleCounts: number[];
} | null {
  if (arrays.length === 0) return null;

  const capacities = arrays.map((a) => a.capacity);
  const quotas = distributeQuotasMaxFill(capacities, targetCount, minArrays);

  const activeArrays = quotas.filter((q) => q > 0).length;
  if (minArrays >= 2 && activeArrays < 2) return null;

  const selected: ModuleSlot[] = [];
  const arrayModuleCounts: number[] = [];
  const rowModuleCounts: number[] = [];

  for (let i = 0; i < arrays.length; i++) {
    const quota = quotas[i];
    if (quota <= 0) {
      arrayModuleCounts.push(0);
      continue;
    }

    const pairCount = Math.floor(quota / 2);
    const odd = quota % 2;
    const paired = pickAlignedPairs(arrays[i].tiers[0], arrays[i].tiers[1], pairCount);
    let arrayModules = paired;

    if (odd > 0 && arrays[i].tiers[0].length > pairCount) {
      const extra = selectCentered(arrays[i].tiers[0], pairCount + 1).slice(-1);
      arrayModules = [...paired, ...extra];
    }

    selected.push(...arrayModules);
    arrayModuleCounts.push(arrayModules.length);
    const tier1Count = Math.ceil(arrayModules.length / 2);
    const tier2Count = Math.floor(arrayModules.length / 2);
    if (tier1Count > 0) rowModuleCounts.push(tier1Count);
    if (tier2Count > 0) rowModuleCounts.push(tier2Count);
  }

  if (selected.length === 0) return null;

  return { selected, arrayModuleCounts, rowModuleCounts };
}

function countValidArraySlots(arrays: PhysicalArray[]): number {
  return arrays.reduce((sum, a) => sum + a.capacity, 0);
}

function computeUnusedAreaRatio(
  oriented: OrientedPoly,
  selected: ModuleSlot[],
  widthM: number,
  heightM: number,
): number {
  const polyArea =
    (oriented.maxX - oriented.minX) * (oriented.maxY - oriented.minY) || 1;
  const usedRows = groupSlotsByRow(selected, heightM);
  if (usedRows.length === 0) return 1;

  const xs = selected.flatMap((s) => [s.x, s.x + widthM]);
  const ys = selected.flatMap((s) => [s.y, s.y + heightM]);
  const usedW = Math.max(...xs) - Math.min(...xs);
  const usedH = Math.max(...ys) - Math.min(...ys);
  const usedBBox = usedW * usedH;
  return Math.round((1 - usedBBox / polyArea) * 1000) / 1000;
}

function makePortraitModuleRect(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  origin: LatLngPoint,
  angleRad: number,
): ModuleRect {
  const corners: LocalPoint[] = [
    { x, y },
    { x: x + widthM, y },
    { x: x + widthM, y: y + heightM },
    { x, y: y + heightM },
  ];
  return {
    corners: corners.map((corner) => localToGeo(corner, origin, angleRad)) as ModuleRect["corners"],
  };
}

function azimuthPreferenceScore(azimuthDeg: number): number {
  if (azimuthDeg === 180) return 200;
  if (azimuthDeg === 135 || azimuthDeg === 225) return 120;
  return 0;
}

function tryPlacementAtAzimuth(input: {
  polygon: LatLngPoint[];
  targetCount: number;
  params: LayoutParams;
  azimuthDeg: number;
  requireMinArrays: number;
  aisleM: number;
}): {
  modules: ModuleRect[];
  validSlotCount: number;
  rowModuleCounts: number[];
  arrayModuleCounts: number[];
  arrayCount: number;
  layoutTier: LandLayoutTier;
  score: number;
  unusedAreaRatio: number;
  singleBlockRejectedReason?: string;
} | null {
  const angleRad = panelAzimuthToLayoutAngleRad(input.azimuthDeg);
  const oriented = toOrientedPolyAtAngle(input.polygon, angleRad);
  const scale = moduleLayoutConfig.visualScale;
  const widthM = moduleLayoutConfig.moduleShortM * scale;
  const heightM = moduleLayoutConfig.moduleLongM * scale;
  const tierGapM =
    input.params.mode === "row"
      ? getVisualRowSpacingM(input.params.kind, input.params.mode)
      : 0;

  const candidates = generatePhysicalArrayCandidates(
    oriented,
    widthM,
    heightM,
    tierGapM,
  );
  const arrays = selectPhysicalArrayStack({
    candidates,
    targetCount: input.targetCount,
    minArrays: input.requireMinArrays,
    aisleM: input.aisleM,
    oriented,
  });
  const validSlotCount = countValidArraySlots(arrays);
  if (validSlotCount === 0 || arrays.length === 0) return null;

  const picked = selectFromPhysicalArrays(
    arrays,
    input.targetCount,
    input.requireMinArrays,
  );
  if (!picked) {
    return {
      modules: [],
      validSlotCount,
      rowModuleCounts: [],
      arrayModuleCounts: [],
      arrayCount: 0,
      layoutTier: input.requireMinArrays >= 2 ? "double" : "single",
      score: -1,
      unusedAreaRatio: 1,
      singleBlockRejectedReason: "insufficient-physical-arrays",
    };
  }

  const { selected, arrayModuleCounts, rowModuleCounts } = picked;
  const arrayCount = arrayModuleCounts.filter((n) => n > 0).length;

  if (input.requireMinArrays >= 2 && arrayCount < 2) {
    return null;
  }

  const modules = selected.map((slot) =>
    makePortraitModuleRect(slot.x, slot.y, widthM, heightM, oriented.origin, oriented.angleRad),
  );

  const unusedAreaRatio = computeUnusedAreaRatio(oriented, selected, widthM, heightM);

  let score = selected.length * 1000 + azimuthPreferenceScore(input.azimuthDeg);
  if (selected.length >= input.targetCount) score += 500;
  if (arrayCount >= input.requireMinArrays) score += 400;
  score -= unusedAreaRatio * 200;
  score -= Math.abs(selected.length - input.targetCount) * 5;

  return {
    modules,
    validSlotCount,
    rowModuleCounts,
    arrayModuleCounts,
    arrayCount,
    layoutTier: arrayCount >= 2 ? "double" : "single",
    score,
    unusedAreaRatio,
  };
}

export function placeLandBlockLayout(
  polygon: LatLngPoint[],
  targetCount: number,
  params: LayoutParams,
  capacityKw: number,
): LandBlockPlacementResult {
  const requireMinArrays = capacityKw > LAND_DOUBLE_BLOCK_THRESHOLD_KW ? 2 : 1;
  const aisleM = requireMinArrays >= 2 ? LAND_AISLE_M : 0;
  const capacityLayoutRule: CapacityLayoutRule = requireMinArrays >= 2
    ? "land-double-block-required"
    : "land-single-block";

  const candidateScores: Record<string, number> = {};
  let best: ReturnType<typeof tryPlacementAtAzimuth> = null;
  let bestAzimuth: number = LAND_CANDIDATE_AZIMUTHS_DEG[0];
  let rejectReason: string | undefined;

  for (const azimuthDeg of LAND_CANDIDATE_AZIMUTHS_DEG) {
    const attempt = tryPlacementAtAzimuth({
      polygon,
      targetCount,
      params,
      azimuthDeg,
      requireMinArrays,
      aisleM,
    });
    if (!attempt || attempt.modules.length === 0) {
      candidateScores[String(azimuthDeg)] = attempt?.score ?? -1;
      if (attempt?.singleBlockRejectedReason) rejectReason = attempt.singleBlockRejectedReason;
      continue;
    }
    candidateScores[String(azimuthDeg)] = attempt.score;
    if (!best || attempt.score > best.score) {
      best = attempt;
      bestAzimuth = azimuthDeg;
    }
  }

  if (!best && requireMinArrays >= 2) {
    rejectReason = rejectReason ?? "double-array-failed-fallback-single";
    for (const azimuthDeg of LAND_CANDIDATE_AZIMUTHS_DEG) {
      const attempt = tryPlacementAtAzimuth({
        polygon,
        targetCount,
        params,
        azimuthDeg,
        requireMinArrays: 1,
        aisleM: 0,
      });
      if (!attempt || attempt.modules.length === 0) continue;
      candidateScores[`${azimuthDeg}-fallback`] = attempt.score;
      if (!best || attempt.score > best.score) {
        best = attempt;
        bestAzimuth = azimuthDeg;
      }
    }
  }

  const rowPattern =
    requireMinArrays >= 2
      ? `tier×${TIER_ROWS_PER_ARRAY}-array+aisle${aisleM}m-stack`
      : `tier×${TIER_ROWS_PER_ARRAY}-array-single`;

  if (!best) {
    return {
      modules: [],
      validSlotCount: 0,
      rowModuleCounts: [],
      diagnostics: {
        layoutTier: requireMinArrays >= 2 ? "double" : "single",
        blockCount: 0,
        blockModuleCounts: [],
        rowCount: 0,
        rowModuleCounts: [],
        selectedAzimuthDegrees: 180,
        candidateAzimuths: [...LAND_CANDIDATE_AZIMUTHS_DEG],
        candidateScores,
        capacityLayoutRule,
        singleBlockRejectedReason: rejectReason ?? "no-valid-arrays",
        unusedAreaReason: "no-valid-arrays",
        arrayCount: 0,
        arrayTierCount: 0,
        tierRowsPerArray: TIER_ROWS_PER_ARRAY,
        arrayModuleCounts: [],
        aisleM,
        aisleApplied: aisleM > 0,
        fillStrategy: "physical-array",
        medianSplitUsed: false,
        rowGenerationPattern: rowPattern,
        unusedAreaRatio: 1,
      },
    };
  }

  const arrayModuleCounts = best.arrayModuleCounts;

  return {
    modules: best.modules,
    validSlotCount: best.validSlotCount,
    rowModuleCounts: best.rowModuleCounts,
    diagnostics: {
      layoutTier: best.layoutTier,
      blockCount: best.arrayCount,
      blockModuleCounts: arrayModuleCounts,
      rowCount: best.rowModuleCounts.length,
      rowModuleCounts: best.rowModuleCounts,
      selectedAzimuthDegrees: bestAzimuth,
      candidateAzimuths: [...LAND_CANDIDATE_AZIMUTHS_DEG],
      candidateScores,
      capacityLayoutRule,
      singleBlockRejectedReason:
        requireMinArrays >= 2 && best.arrayCount < 2
          ? (rejectReason ?? best.singleBlockRejectedReason)
          : undefined,
      unusedAreaReason:
        best.unusedAreaRatio > 0.5 ? "large-unused-area-after-array-fill" : undefined,
      arrayCount: best.arrayCount,
      arrayTierCount: best.arrayCount * TIER_ROWS_PER_ARRAY,
      tierRowsPerArray: TIER_ROWS_PER_ARRAY,
      arrayModuleCounts,
      aisleM,
      aisleApplied: aisleM > 0 && best.arrayCount >= 2,
      fillStrategy: "physical-array",
      medianSplitUsed: false,
      rowGenerationPattern: rowPattern,
      unusedAreaRatio: best.unusedAreaRatio,
    },
  };
}
