import { getVisualRowSpacingM, moduleLayoutConfig } from "@/data/moduleLayoutConfig";
import {
  computeOrientedBounds,
  computePolygonOrientation,
  localToGeo,
  pointInPolygon,
  toLocal,
  type LocalPoint,
} from "@/lib/solar/polygonGeometry";
import type { LatLngPoint, ModuleRect } from "@/types/moduleLayout";

/** 패널 면 방위 (북 기준 시계방향, °) — 남·남동·남서만 허용 */
export const LAND_CANDIDATE_AZIMUTHS_DEG = [180, 225, 135] as const;

export const LAND_DOUBLE_BLOCK_THRESHOLD_KW = 100;

/** Array 간 통로 (m) — 4~6m 범위 기본값 */
export const LAND_AISLE_M = 4;

/** Array Block 사이 주 통로 (m) — 수량 미달 시 자동 축소 후보를 둔다 */
export const LAND_MAIN_AISLE_M = 8;

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
  candidatePlacedCounts: Record<string, number>;
  selectedReason: string;
  capacityLayoutRule: CapacityLayoutRule;
  singleBlockRejectedReason?: string;
  unusedAreaReason?: string;
  arrayCount: number;
  arrayTierCount: number;
  tierRowsPerArray: number;
  arrayModuleCounts: number[];
  aisleM: number;
  aisleApplied: boolean;
  fillStrategy: "physical-array" | "uniform-row-grid" | "two-tier-row-set";
  medianSplitUsed: false;
  rowGenerationPattern: string;
  unusedAreaRatio: number;
  twoTierSetCount: number;
  twoTierSetModuleCounts: number[];
  innerTierGapM: number;
  setAisleM: number;
  visualScale: number;
  arrayBlockCount: number;
  arrayBlocks: Array<{
    blockIndex: number;
    arrayIndexes: number[];
    moduleCount: number;
    rowCount: number;
    boundingBox: LocalBBox;
  }>;
  mainAisleM: number;
  mainAisleApplied: boolean;
  arrayBlockModuleCounts: number[];
  arrayBlockRowCounts: number[];
  arrayBlockBoundingBoxes: LocalBBox[];
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

export interface LocalBBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface PhysicalArrayBlock {
  blockIndex: number;
  arrays: PhysicalArray[];
}

interface UniformRowPlacement {
  modules: ModuleRect[];
  validSlotCount: number;
  rowModuleCounts: number[];
  twoTierSetModuleCounts: number[];
  selected: ModuleSlot[];
  innerTierGapM: number;
  setAisleM: number;
  visualScale: number;
  score: number;
  rowDirectionAspect: number;
  unusedAreaRatio: number;
}

interface TwoTierRowSet {
  setIndex: number;
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

function findFirstCandidateIndex(candidates: PhysicalArray[], minBaseY: number): number {
  return candidates.findIndex((candidate) => candidate.baseY >= minBaseY - 0.001);
}

function buildArraySequence(
  candidates: PhysicalArray[],
  startIndex: number,
  minGapM: number,
  maxArrays = Infinity,
): PhysicalArray[] {
  const sequence: PhysicalArray[] = [];
  let lastMaxY = -Infinity;

  for (let i = startIndex; i < candidates.length && sequence.length < maxArrays; i++) {
    const candidate = candidates[i];
    if (candidate.baseY < lastMaxY + minGapM - 0.001) continue;
    sequence.push(candidate);
    lastMaxY = candidate.maxY;
  }

  return sequence;
}

function bboxForArrays(arrays: PhysicalArray[]): LocalBBox {
  const slots = arrays.flatMap((array) => [...array.tiers[0], ...array.tiers[1]]);
  if (slots.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  return {
    minX: Math.min(...slots.map((slot) => slot.x)),
    maxX: Math.max(...slots.map((slot) => slot.x)),
    minY: Math.min(...arrays.map((array) => array.baseY)),
    maxY: Math.max(...arrays.map((array) => array.maxY)),
  };
}

function selectPhysicalArrayBlocks(input: {
  candidates: PhysicalArray[];
  targetCount: number;
  requireBlockCount: number;
  intraBlockGapM: number;
  mainAisleCandidatesM: number[];
  oriented: OrientedPoly;
}): { blocks: PhysicalArrayBlock[]; mainAisleM: number } {
  const { candidates, targetCount, requireBlockCount, intraBlockGapM, mainAisleCandidatesM, oriented } = input;
  if (candidates.length === 0) return { blocks: [], mainAisleM: 0 };

  if (requireBlockCount < 2) {
    const arrays = buildArraySequence(candidates, 0, intraBlockGapM);
    return { blocks: [{ blockIndex: 0, arrays }], mainAisleM: 0 };
  }

  const polyCenterY = (oriented.minY + oriented.maxY) / 2;
  let best: { blocks: PhysicalArrayBlock[]; mainAisleM: number; score: number } | null = null;

  for (const mainAisleM of mainAisleCandidatesM) {
    for (let startA = 0; startA < candidates.length; startA++) {
      const blockAFull = buildArraySequence(candidates, startA, intraBlockGapM);
      for (let blockASize = 1; blockASize <= blockAFull.length; blockASize++) {
        const blockA = blockAFull.slice(0, blockASize);
        const lastA = blockA[blockA.length - 1];
        const startB = findFirstCandidateIndex(candidates, lastA.maxY + mainAisleM);
        if (startB < 0) continue;

        const blockBFull = buildArraySequence(candidates, startB, intraBlockGapM);
        for (let blockBSize = 1; blockBSize <= blockBFull.length; blockBSize++) {
          const blockB = blockBFull.slice(0, blockBSize);
          const blocks: PhysicalArrayBlock[] = [
            { blockIndex: 0, arrays: blockA },
            { blockIndex: 1, arrays: blockB },
          ];
          const arrays = blocks.flatMap((block) => block.arrays);
          const capacity = arrays.reduce((sum, array) => sum + array.capacity, 0);
          const placedPotential = Math.min(capacity, targetCount);
          const shortfall = Math.max(0, targetCount - capacity);
          const overCapacity = Math.max(0, capacity - targetCount);
          const minY = Math.min(...arrays.map((array) => array.baseY));
          const maxY = Math.max(...arrays.map((array) => array.maxY));
          const centerOffsetY = Math.abs((minY + maxY) / 2 - polyCenterY);
          const verticalCoverage = (maxY - minY) / Math.max(oriented.maxY - oriented.minY, 1);
          const balancePenalty = Math.abs(
            blockA.reduce((sum, array) => sum + array.capacity, 0) -
              blockB.reduce((sum, array) => sum + array.capacity, 0),
          );

          const score =
            placedPotential * 1000 -
            shortfall * 8000 -
            Math.abs(targetCount - placedPotential) * 1500 -
            overCapacity * 0.25 -
            centerOffsetY * 35 +
            verticalCoverage * 180 +
            mainAisleM * 120 -
            balancePenalty * 0.15;

          if (!best || score > best.score) {
            best = { blocks, mainAisleM, score };
          }
        }
      }
    }
  }

  if (!best) return { blocks: [], mainAisleM: 0 };

  return {
    mainAisleM: best.mainAisleM,
    blocks: best.blocks.map((block, blockIndex) => ({
      blockIndex,
      arrays: block.arrays.map((array, i) => ({ ...array, arrayIndex: blockIndex * 1000 + i })),
    })),
  };
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

function collectUniformRows(
  oriented: OrientedPoly,
  widthM: number,
  heightM: number,
  rowGapM: number,
  offsetM: number,
): ModuleSlot[][] {
  const rows: ModuleSlot[][] = [];
  const pitchM = heightM + rowGapM;
  for (let y = oriented.minY + offsetM; y + heightM <= oriented.maxY + 0.001; y += pitchM) {
    const row = collectRowSlots(oriented, y, widthM, heightM);
    if (row.length > 0) rows.push(row);
  }
  return rows;
}

function distributeUniformRowQuotas(rows: ModuleSlot[][], targetCount: number): number[] {
  const capacities = rows.map((row) => row.length);
  const totalCap = capacities.reduce((sum, cap) => sum + cap, 0);
  const effectiveTarget = Math.min(targetCount, totalCap);
  if (effectiveTarget <= 0 || totalCap <= 0) return capacities.map(() => 0);

  const quotas = capacities.map((cap) => Math.floor((cap / totalCap) * effectiveTarget));
  let assigned = quotas.reduce((sum, quota) => sum + quota, 0);
  const order = capacities
    .map((cap, i) => ({ cap, i }))
    .sort((a, b) => b.cap - a.cap);

  let idx = 0;
  while (assigned < effectiveTarget) {
    const target = order[idx % order.length];
    if (quotas[target.i] < capacities[target.i]) {
      quotas[target.i]++;
      assigned++;
    }
    idx++;
  }

  return quotas;
}

function selectUniformRows(rows: ModuleSlot[][], targetCount: number): {
  selected: ModuleSlot[];
  rowModuleCounts: number[];
} {
  const quotas = distributeUniformRowQuotas(rows, targetCount);
  const selected: ModuleSlot[] = [];
  const rowModuleCounts: number[] = [];

  for (let i = 0; i < rows.length; i++) {
    const quota = quotas[i];
    if (quota <= 0) continue;
    const picked = selectCentered(rows[i], quota);
    selected.push(...picked);
    rowModuleCounts.push(picked.length);
  }

  return { selected, rowModuleCounts };
}

function collectTwoTierRowSets(
  oriented: OrientedPoly,
  widthM: number,
  heightM: number,
  innerTierGapM: number,
  setAisleM: number,
  offsetM: number,
): TwoTierRowSet[] {
  const sets: TwoTierRowSet[] = [];
  const setPitchM = heightM * TIER_ROWS_PER_ARRAY + innerTierGapM + setAisleM;
  let setIndex = 0;

  for (let y = oriented.minY + offsetM; y + heightM <= oriented.maxY + 0.001; y += setPitchM) {
    const tier1Y = y;
    const tier2Y = y + heightM + innerTierGapM;
    if (tier2Y + heightM > oriented.maxY + 0.001) continue;

    const rawTier1 = collectRowSlots(oriented, tier1Y, widthM, heightM);
    const rawTier2 = collectRowSlots(oriented, tier2Y, widthM, heightM);
    const { tier1, tier2 } = alignTierPair(rawTier1, rawTier2, widthM);

    if (tier1.length > 0 && tier2.length > 0) {
      sets.push({
        setIndex: setIndex++,
        baseY: tier1Y,
        maxY: tier2Y + heightM,
        tiers: [tier1, tier2],
        capacity: tier1.length + tier2.length,
      });
    }
  }

  return sets;
}

function trimWeakEdgeSets(sets: TwoTierRowSet[], targetCount: number): TwoTierRowSet[] {
  let active = [...sets];
  while (active.length > 2) {
    const totalCapacity = active.reduce((sum, set) => sum + set.capacity, 0);
    const maxCapacity = Math.max(...active.map((set) => set.capacity), 0);
    const threshold = Math.max(8, maxCapacity * 0.28);
    const first = active[0];
    const last = active[active.length - 1];
    const canDropFirst = first.capacity < threshold && totalCapacity - first.capacity >= targetCount;
    const canDropLast = last.capacity < threshold && totalCapacity - last.capacity >= targetCount;

    if (!canDropFirst && !canDropLast) break;
    if (canDropFirst && (!canDropLast || first.capacity <= last.capacity)) {
      active = active.slice(1);
    } else {
      active = active.slice(0, -1);
    }
  }
  return active.map((set, setIndex) => ({ ...set, setIndex }));
}

function edgeRowPenalty(rowModuleCounts: number[]): number {
  if (rowModuleCounts.length <= 4) return 0;
  const firstPair = rowModuleCounts.slice(0, TIER_ROWS_PER_ARRAY);
  const lastPair = rowModuleCounts.slice(-TIER_ROWS_PER_ARRAY);
  const pairTotals: number[] = [];
  for (let i = 0; i < rowModuleCounts.length; i += TIER_ROWS_PER_ARRAY) {
    pairTotals.push((rowModuleCounts[i] ?? 0) + (rowModuleCounts[i + 1] ?? 0));
  }
  const threshold = Math.max(8, Math.max(...pairTotals, 1) * 0.78);
  let penalty = 0;
  const firstTotal = firstPair.reduce((sum, count) => sum + count, 0);
  const lastTotal = lastPair.reduce((sum, count) => sum + count, 0);
  if (firstTotal > 0 && firstTotal < threshold) penalty += threshold - firstTotal;
  if (lastTotal > 0 && lastTotal < threshold) penalty += threshold - lastTotal;
  return penalty;
}

function distributeTwoTierSetQuotas(sets: TwoTierRowSet[], targetCount: number): number[] {
  const capacities = sets.map((set) => set.capacity);
  const totalCap = capacities.reduce((sum, cap) => sum + cap, 0);
  const effectiveTarget = Math.min(targetCount, totalCap);
  if (effectiveTarget <= 0 || totalCap <= 0) return capacities.map(() => 0);

  const quotas = capacities.map((cap) => Math.floor((cap / totalCap) * effectiveTarget));
  let assigned = quotas.reduce((sum, quota) => sum + quota, 0);
  const order = capacities
    .map((cap, i) => ({ cap, i }))
    .sort((a, b) => b.cap - a.cap);

  let idx = 0;
  while (assigned < effectiveTarget) {
    const target = order[idx % order.length];
    if (quotas[target.i] < capacities[target.i]) {
      quotas[target.i]++;
      assigned++;
    }
    idx++;
  }

  return quotas;
}

function splitTwoTierQuota(set: TwoTierRowSet, quota: number): [number, number] {
  const [tier1, tier2] = set.tiers;
  const cap1 = tier1.length;
  const cap2 = tier2.length;
  let q1 = Math.min(Math.ceil(quota / TIER_ROWS_PER_ARRAY), cap1);
  let q2 = Math.min(Math.floor(quota / TIER_ROWS_PER_ARRAY), cap2);
  let remaining = quota - q1 - q2;

  while (remaining > 0 && (q1 < cap1 || q2 < cap2)) {
    if (q1 <= q2 && q1 < cap1) q1++;
    else if (q2 < cap2) q2++;
    else if (q1 < cap1) q1++;
    remaining--;
  }

  return [q1, q2];
}

function selectTwoTierRowSets(sets: TwoTierRowSet[], targetCount: number): {
  selected: ModuleSlot[];
  rowModuleCounts: number[];
  twoTierSetModuleCounts: number[];
} {
  const quotas = distributeTwoTierSetQuotas(sets, targetCount);
  const selected: ModuleSlot[] = [];
  const rowModuleCounts: number[] = [];
  const twoTierSetModuleCounts: number[] = [];

  for (let i = 0; i < sets.length; i++) {
    const quota = quotas[i];
    if (quota <= 0) continue;

    const set = sets[i];
    const [tier1Quota, tier2Quota] = splitTwoTierQuota(set, quota);
    const tier1Pick = selectCentered(set.tiers[0], tier1Quota);
    const tier2Pick = selectCentered(set.tiers[1], tier2Quota);

    selected.push(...tier1Pick, ...tier2Pick);
    rowModuleCounts.push(tier1Pick.length, tier2Pick.length);
    twoTierSetModuleCounts.push(tier1Pick.length + tier2Pick.length);
  }

  return { selected, rowModuleCounts, twoTierSetModuleCounts };
}

function scoreUniformRows(input: {
  oriented: OrientedPoly;
  selected: ModuleSlot[];
  rowModuleCounts: number[];
  widthM: number;
  heightM: number;
  targetCount: number;
  rowGapM: number;
}): { score: number; unusedAreaRatio: number } {
  const { oriented, selected, rowModuleCounts, widthM, heightM, targetCount, rowGapM } = input;
  const unusedAreaRatio = computeUnusedAreaRatio(oriented, selected, widthM, heightM);
  if (selected.length === 0) return { score: -Infinity, unusedAreaRatio };

  const xs = selected.flatMap((slot) => [slot.x, slot.x + widthM]);
  const ys = selected.flatMap((slot) => [slot.y, slot.y + heightM]);
  const usedW = Math.max(...xs) - Math.min(...xs);
  const usedH = Math.max(...ys) - Math.min(...ys);
  const polyW = Math.max(oriented.maxX - oriented.minX, 1);
  const polyH = Math.max(oriented.maxY - oriented.minY, 1);
  const xCoverage = usedW / polyW;
  const yCoverage = usedH / polyH;
  const rowCount = rowModuleCounts.length;
  const maxRowShare = Math.max(...rowModuleCounts, 0) / Math.max(selected.length, 1);

  let score = selected.length * 1000;
  if (selected.length >= targetCount) score += 2000;
  score -= Math.abs(selected.length - targetCount) * 100;
  score += rowCount * 80;
  score += xCoverage * 400 + yCoverage * 800;
  score += Math.min(rowGapM, 3) * 120;
  score -= unusedAreaRatio * 300;
  if (rowCount <= 2) score -= 5000;
  if (maxRowShare > 0.35) score -= 2500;

  return { score, unusedAreaRatio };
}

function scoreTwoTierRowSets(input: {
  oriented: OrientedPoly;
  selected: ModuleSlot[];
  rowModuleCounts: number[];
  twoTierSetModuleCounts: number[];
  widthM: number;
  heightM: number;
  targetCount: number;
  innerTierGapM: number;
  setAisleM: number;
}): { score: number; unusedAreaRatio: number } {
  const {
    oriented,
    selected,
    rowModuleCounts,
    twoTierSetModuleCounts,
    widthM,
    heightM,
    targetCount,
    innerTierGapM,
    setAisleM,
  } = input;
  const unusedAreaRatio = computeUnusedAreaRatio(oriented, selected, widthM, heightM);
  if (selected.length === 0) return { score: -Infinity, unusedAreaRatio };

  const xs = selected.flatMap((slot) => [slot.x, slot.x + widthM]);
  const ys = selected.flatMap((slot) => [slot.y, slot.y + heightM]);
  const usedW = Math.max(...xs) - Math.min(...xs);
  const usedH = Math.max(...ys) - Math.min(...ys);
  const polyW = Math.max(oriented.maxX - oriented.minX, 1);
  const polyH = Math.max(oriented.maxY - oriented.minY, 1);
  const xCoverage = usedW / polyW;
  const yCoverage = usedH / polyH;
  const twoTierSetCount = twoTierSetModuleCounts.length;
  const maxSetShare = Math.max(...twoTierSetModuleCounts, 0) / Math.max(selected.length, 1);

  let balancePenalty = 0;
  let oneSidedSetCount = 0;
  for (let i = 0; i < rowModuleCounts.length; i += TIER_ROWS_PER_ARRAY) {
    const tier1 = rowModuleCounts[i] ?? 0;
    const tier2 = rowModuleCounts[i + 1] ?? 0;
    const setTotal = tier1 + tier2;
    if (setTotal <= 0) continue;
    balancePenalty += Math.abs(tier1 - tier2) / setTotal;
    if (tier1 === 0 || tier2 === 0) oneSidedSetCount++;
  }
  const avgBalancePenalty = balancePenalty / Math.max(twoTierSetCount, 1);
  const aisleVisibilityM = Math.max(0, setAisleM - innerTierGapM);

  let score = selected.length * 1000;
  if (selected.length >= targetCount) score += 3000;
  score -= Math.abs(selected.length - targetCount) * 250;
  score += twoTierSetCount * 180;
  score += xCoverage * 350 + yCoverage * 700;
  score += Math.min(aisleVisibilityM, 3.5) * 450;
  score -= avgBalancePenalty * 2500;
  score -= oneSidedSetCount * 1200;
  const narrowParcelEdgePenalty = computeRowDirectionAspect(oriented) < 0.8 ? 1800 : 300;
  score -= edgeRowPenalty(rowModuleCounts) * narrowParcelEdgePenalty;
  score -= unusedAreaRatio * 250;
  if (twoTierSetCount <= 1) score -= 6000;
  if (maxSetShare > 0.35) score -= 2500;
  if (setAisleM <= innerTierGapM) score -= 5000;

  return { score, unusedAreaRatio };
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

function summarizeArrayBlocks(
  blocks: PhysicalArrayBlock[],
  arrayModuleCounts: number[],
): {
  arrayBlocks: LandBlockPlacementDiagnostics["arrayBlocks"];
  arrayBlockModuleCounts: number[];
  arrayBlockRowCounts: number[];
  arrayBlockBoundingBoxes: LocalBBox[];
} {
  let arrayOffset = 0;
  const summarized = blocks.map((block) => {
    const moduleCounts = arrayModuleCounts.slice(arrayOffset, arrayOffset + block.arrays.length);
    arrayOffset += block.arrays.length;
    const moduleCount = moduleCounts.reduce((sum, count) => sum + count, 0);
    const rowCount = moduleCounts.reduce((sum, count) => sum + (count > 0 ? TIER_ROWS_PER_ARRAY : 0), 0);
    return {
      blockIndex: block.blockIndex,
      arrayIndexes: block.arrays.map((array) => array.arrayIndex),
      moduleCount,
      rowCount,
      boundingBox: bboxForArrays(block.arrays),
    };
  });

  return {
    arrayBlocks: summarized,
    arrayBlockModuleCounts: summarized.map((block) => block.moduleCount),
    arrayBlockRowCounts: summarized.map((block) => block.rowCount),
    arrayBlockBoundingBoxes: summarized.map((block) => block.boundingBox),
  };
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
  if (!LAND_CANDIDATE_AZIMUTHS_DEG.includes(azimuthDeg as (typeof LAND_CANDIDATE_AZIMUTHS_DEG)[number])) {
    return 1400;
  }
  if (azimuthDeg === 180) return 2500;
  if (azimuthDeg === 225) return 1600;
  if (azimuthDeg === 135) return 0;
  return 0;
}

function computeRowDirectionAspect(oriented: OrientedPoly): number {
  const widthM = Math.max(oriented.maxX - oriented.minX, 0.01);
  const heightM = Math.max(oriented.maxY - oriented.minY, 0.01);
  return widthM / heightM;
}

function azimuthShapePreferenceScore(azimuthDeg: number, rowDirectionAspect: number): number {
  const followsParcelLongAxis = rowDirectionAspect >= 1.6;
  if (!followsParcelLongAxis) return 0;

  if (azimuthDeg === 180) return 3000;
  if (azimuthDeg === 225) return 3000;
  if (azimuthDeg === 135) return 1200;
  return 3800;
}

function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function angularDistanceDeg(a: number, b: number): number {
  const diff = Math.abs(normalizeDegrees(a) - normalizeDegrees(b));
  return Math.min(diff, 360 - diff);
}

function polygonLongAxisAzimuth(polygon: LatLngPoint[]): number {
  const longAxisFromEastDeg = normalizeDegrees((computePolygonOrientation(polygon) * 180) / Math.PI);
  const candidateA = normalizeDegrees(180 - longAxisFromEastDeg);
  const candidateB = normalizeDegrees(candidateA + 180);
  return angularDistanceDeg(candidateA, 180) <= angularDistanceDeg(candidateB, 180)
    ? candidateA
    : candidateB;
}

function buildLandCandidateAzimuths(polygon: LatLngPoint[]): number[] {
  const shapeAzimuth = polygonLongAxisAzimuth(polygon);
  const southFacingShapeAzimuth =
    shapeAzimuth >= 150 && shapeAzimuth <= 235
      ? angularDistanceDeg(shapeAzimuth, 180) <= 12
        ? 180
        : angularDistanceDeg(shapeAzimuth, 225) <= 8
          ? 225
          : Math.round(shapeAzimuth)
      : undefined;
  return [180, southFacingShapeAzimuth, 225, 135].filter(
    (azimuth): azimuth is number => typeof azimuth === "number",
  ).filter(
    (azimuth, index, arr) => arr.indexOf(azimuth) === index,
  );
}

function buildSelectedReason(input: {
  selectedAzimuthDegrees: number;
  candidateScores: Record<string, number>;
  candidatePlacedCounts: Record<string, number>;
  rowDirectionAspect: number;
}): string {
  const { selectedAzimuthDegrees, candidateScores, candidatePlacedCounts, rowDirectionAspect } = input;
  const placed = candidatePlacedCounts[String(selectedAzimuthDegrees)] ?? 0;
  const score = candidateScores[String(selectedAzimuthDegrees)] ?? 0;
  const reasonParts = [
    `selected-${selectedAzimuthDegrees}`,
    `placed-${placed}`,
    `score-${Math.round(score)}`,
  ];
  if (selectedAzimuthDegrees === 180) reasonParts.push("due-south-priority");
  if (selectedAzimuthDegrees === 225) reasonParts.push("southwest-priority-over-135");
  if (rowDirectionAspect >= 1.6) reasonParts.push("row-direction-follows-parcel-long-axis");
  return reasonParts.join("|");
}

function tryPlacementAtAzimuth(input: {
  polygon: LatLngPoint[];
  targetCount: number;
  params: LayoutParams;
  azimuthDeg: number;
  requireMinArrays: number;
}): {
  modules: ModuleRect[];
  validSlotCount: number;
  rowModuleCounts: number[];
  twoTierSetModuleCounts: number[];
  innerTierGapM: number;
  setAisleM: number;
  visualScale: number;
  arrayModuleCounts: number[];
  arrayCount: number;
  arrayBlocks: PhysicalArrayBlock[];
  mainAisleM: number;
  layoutTier: LandLayoutTier;
  score: number;
  rowDirectionAspect: number;
  unusedAreaRatio: number;
  singleBlockRejectedReason?: string;
} | null {
  const angleRad = panelAzimuthToLayoutAngleRad(input.azimuthDeg);
  const oriented = toOrientedPolyAtAngle(input.polygon, angleRad);
  const baseRowGapM =
    input.params.mode === "row"
      ? getVisualRowSpacingM(input.params.kind, input.params.mode)
      : 0;
  const visualScaleCandidates =
    input.params.mode === "row"
      ? [0.96, 0.92, 0.88, 0.86, 0.82, moduleLayoutConfig.visualScale].filter(
          (scale, i, arr) => scale > 0 && arr.indexOf(scale) === i,
        )
      : [moduleLayoutConfig.visualScale];
  const innerTierGapCandidatesM =
    input.params.mode === "row"
      ? [0.05, 0.1, 0.15, 0.25, 0.4].filter((gap, i, arr) => gap >= 0 && arr.indexOf(gap) === i)
      : [0];
  const setAisleCandidatesM =
    input.params.mode === "row"
      ? [1.2, 1.5, 2, 2.5, baseRowGapM].filter((gap, i, arr) => gap >= 1 && arr.indexOf(gap) === i)
      : [0];

  let best: UniformRowPlacement | null = null;

  for (const visualScale of visualScaleCandidates) {
    const widthM = moduleLayoutConfig.moduleShortM * visualScale;
    const heightM = moduleLayoutConfig.moduleLongM * visualScale;
    for (const innerTierGapM of innerTierGapCandidatesM) {
      for (const setAisleM of setAisleCandidatesM) {
        if (setAisleM <= innerTierGapM) continue;

        const setPitchM = heightM * TIER_ROWS_PER_ARRAY + innerTierGapM + setAisleM;
        const offsets = [0, setPitchM * 0.2, setPitchM * 0.4, setPitchM * 0.6, setPitchM * 0.8];
        for (const offsetM of offsets) {
          const sets = collectTwoTierRowSets(
            oriented,
            widthM,
            heightM,
            innerTierGapM,
            setAisleM,
            offsetM,
          );
          const validSlotCount = sets.reduce((sum, set) => sum + set.capacity, 0);
          if (validSlotCount === 0) continue;
          const visualSets = trimWeakEdgeSets(sets, input.targetCount);
          if (visualSets.length === 0) continue;

          const { selected, rowModuleCounts, twoTierSetModuleCounts } = selectTwoTierRowSets(
            visualSets,
            input.targetCount,
          );
          if (selected.length === 0) continue;

          const { score: baseScore, unusedAreaRatio } = scoreTwoTierRowSets({
            oriented,
            selected,
            rowModuleCounts,
            twoTierSetModuleCounts,
            widthM,
            heightM,
            targetCount: input.targetCount,
            innerTierGapM,
            setAisleM,
          });
          const rowDirectionAspect = computeRowDirectionAspect(oriented);
          const score =
            baseScore +
            azimuthPreferenceScore(input.azimuthDeg) +
            azimuthShapePreferenceScore(input.azimuthDeg, rowDirectionAspect) +
            visualScale * 5000;
          const modules = selected.map((slot) =>
            makePortraitModuleRect(slot.x, slot.y, widthM, heightM, oriented.origin, oriented.angleRad),
          );

          if (!best || score > best.score) {
            best = {
              modules,
              validSlotCount,
              rowModuleCounts,
              twoTierSetModuleCounts,
              selected,
              innerTierGapM,
              setAisleM,
              visualScale,
              score,
              rowDirectionAspect,
              unusedAreaRatio,
            };
          }
        }
      }
    }
  }

  if (!best) return null;
  if (input.requireMinArrays >= 2 && best.rowModuleCounts.length <= 2) {
    return null;
  }

  return {
    modules: best.modules,
    validSlotCount: best.validSlotCount,
    rowModuleCounts: best.rowModuleCounts,
    twoTierSetModuleCounts: best.twoTierSetModuleCounts,
    innerTierGapM: best.innerTierGapM,
    setAisleM: best.setAisleM,
    visualScale: best.visualScale,
    arrayModuleCounts: best.twoTierSetModuleCounts,
    arrayCount: best.twoTierSetModuleCounts.length,
    arrayBlocks: [],
    mainAisleM: 0,
    layoutTier: best.rowModuleCounts.length >= 2 ? "double" : "single",
    score: best.score,
    rowDirectionAspect: best.rowDirectionAspect,
    unusedAreaRatio: best.unusedAreaRatio,
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
  const candidatePlacedCounts: Record<string, number> = {};
  let best: ReturnType<typeof tryPlacementAtAzimuth> = null;
  const candidateAzimuths = buildLandCandidateAzimuths(polygon);
  let bestAzimuth: number = candidateAzimuths[0];
  let rejectReason: string | undefined;

  for (const azimuthDeg of candidateAzimuths) {
    const attempt = tryPlacementAtAzimuth({
      polygon,
      targetCount,
      params,
      azimuthDeg,
      requireMinArrays,
    });
    if (!attempt || attempt.modules.length === 0) {
      candidateScores[String(azimuthDeg)] = attempt?.score ?? -1;
      candidatePlacedCounts[String(azimuthDeg)] = attempt?.modules.length ?? 0;
      if (attempt?.singleBlockRejectedReason) rejectReason = attempt.singleBlockRejectedReason;
      continue;
    }
    candidateScores[String(azimuthDeg)] = attempt.score;
    candidatePlacedCounts[String(azimuthDeg)] = attempt.modules.length;
    if (!best || attempt.score > best.score) {
      best = attempt;
      bestAzimuth = azimuthDeg;
    }
  }

  if (!best && requireMinArrays >= 2) {
    rejectReason = rejectReason ?? "double-array-failed-fallback-single";
    for (const azimuthDeg of candidateAzimuths) {
      const attempt = tryPlacementAtAzimuth({
        polygon,
        targetCount,
        params,
        azimuthDeg,
        requireMinArrays: 1,
      });
      if (!attempt || attempt.modules.length === 0) continue;
      candidateScores[`${azimuthDeg}-fallback`] = attempt.score;
      candidatePlacedCounts[`${azimuthDeg}-fallback`] = attempt.modules.length;
      if (!best || attempt.score > best.score) {
        best = attempt;
        bestAzimuth = azimuthDeg;
      }
    }
  }

  const rowPattern =
    requireMinArrays >= 2
      ? "two-tier-row-set-south-facing"
      : "two-tier-row-set-single";

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
        candidateAzimuths,
        candidateScores,
        candidatePlacedCounts,
        selectedReason: rejectReason ?? "no-valid-two-tier-row-set",
        capacityLayoutRule,
        singleBlockRejectedReason: rejectReason ?? "no-valid-arrays",
        unusedAreaReason: "no-valid-arrays",
        arrayCount: 0,
        arrayTierCount: 0,
        tierRowsPerArray: TIER_ROWS_PER_ARRAY,
        arrayModuleCounts: [],
        aisleM,
        aisleApplied: false,
        fillStrategy: "two-tier-row-set",
        medianSplitUsed: false,
        rowGenerationPattern: rowPattern,
        unusedAreaRatio: 1,
        twoTierSetCount: 0,
        twoTierSetModuleCounts: [],
        innerTierGapM: 0,
        setAisleM: 0,
        visualScale: moduleLayoutConfig.visualScale,
        arrayBlockCount: 0,
        arrayBlocks: [],
        mainAisleM: requireMinArrays >= 2 ? LAND_MAIN_AISLE_M : 0,
        mainAisleApplied: false,
        arrayBlockModuleCounts: [],
        arrayBlockRowCounts: [],
        arrayBlockBoundingBoxes: [],
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
      candidateAzimuths,
      candidateScores,
      candidatePlacedCounts,
      selectedReason: buildSelectedReason({
        selectedAzimuthDegrees: bestAzimuth,
        candidateScores,
        candidatePlacedCounts,
        rowDirectionAspect: best.rowDirectionAspect,
      }),
      capacityLayoutRule,
      singleBlockRejectedReason:
        requireMinArrays >= 2 && best.rowModuleCounts.length <= 2
          ? (rejectReason ?? best.singleBlockRejectedReason)
          : undefined,
      unusedAreaReason:
        best.unusedAreaRatio > 0.5 ? "large-unused-area-after-array-fill" : undefined,
      arrayCount: best.arrayCount,
      arrayTierCount: best.arrayCount * TIER_ROWS_PER_ARRAY,
      tierRowsPerArray: TIER_ROWS_PER_ARRAY,
      arrayModuleCounts,
      aisleM,
      aisleApplied: best.setAisleM > best.innerTierGapM,
      fillStrategy: "two-tier-row-set",
      medianSplitUsed: false,
      rowGenerationPattern: rowPattern,
      unusedAreaRatio: best.unusedAreaRatio,
      twoTierSetCount: best.twoTierSetModuleCounts.length,
      twoTierSetModuleCounts: best.twoTierSetModuleCounts,
      innerTierGapM: best.innerTierGapM,
      setAisleM: best.setAisleM,
      visualScale: best.visualScale,
      arrayBlockCount: 0,
      arrayBlocks: [],
      mainAisleM: 0,
      mainAisleApplied: false,
      arrayBlockModuleCounts: [],
      arrayBlockRowCounts: [],
      arrayBlockBoundingBoxes: [],
    },
  };
}
