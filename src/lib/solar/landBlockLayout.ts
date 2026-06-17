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

export type LandLayoutTier = "single" | "double";

export type CapacityLayoutRule =
  | "land-single-block"
  | "land-double-block-required"
  | "roof-unchanged";

export interface LandBlockPlacementDiagnostics {
  layoutTier: LandLayoutTier;
  blockCount: number;
  blockModuleCounts: number[];
  rowCount: number;
  rowModuleCounts: number[];
  selectedAzimuthDegrees: number;
  candidateAzimuths: number[];
  candidateScores: Record<string, number>;
  capacityLayoutRule: CapacityLayoutRule;
  singleBlockRejectedReason?: string;
  unusedAreaReason?: string;
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

function collectValidSlots(
  oriented: OrientedPoly,
  widthM: number,
  heightM: number,
  rowGapM: number,
): ModuleSlot[] {
  const { localPoly, minX, maxX, minY, maxY } = oriented;
  const slots: ModuleSlot[] = [];
  let y = minY;

  while (y + heightM <= maxY + 0.001) {
    let x = minX;
    while (x + widthM <= maxX + 0.001) {
      if (moduleFitsInPolygon(x, y, widthM, heightM, localPoly)) {
        slots.push({ x, y });
      }
      x += widthM;
    }
    y += heightM + rowGapM;
  }

  return slots;
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

function selectSlotsSequential(
  slots: ModuleSlot[],
  targetCount: number,
  heightM: number,
): { selected: ModuleSlot[]; rowModuleCounts: number[] } {
  if (targetCount <= 0 || slots.length === 0) {
    return { selected: [], rowModuleCounts: [] };
  }
  if (slots.length <= targetCount) {
    return {
      selected: slots,
      rowModuleCounts: groupSlotsByRow(slots, heightM).map((row) => row.length),
    };
  }

  const selected: ModuleSlot[] = [];
  const rowModuleCounts: number[] = [];
  for (const row of groupSlotsByRow(slots, heightM)) {
    let rowTaken = 0;
    for (const slot of row) {
      selected.push(slot);
      rowTaken++;
      if (selected.length >= targetCount) {
        rowModuleCounts.push(rowTaken);
        return { selected, rowModuleCounts };
      }
    }
    if (rowTaken > 0) rowModuleCounts.push(rowTaken);
  }
  return { selected, rowModuleCounts };
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

function splitSlotsIntoBlocks(slots: ModuleSlot[], blockCount: number): ModuleSlot[][] {
  if (blockCount <= 1 || slots.length === 0) return [slots];

  const xs = slots.map((s) => s.x);
  const ys = slots.map((s) => s.y);
  const spreadX = Math.max(...xs) - Math.min(...xs);
  const spreadY = Math.max(...ys) - Math.min(...ys);
  const splitOnX = spreadX >= spreadY;

  const values = slots.map((s) => (splitOnX ? s.x : s.y)).sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)] ?? 0;

  const blockA: ModuleSlot[] = [];
  const blockB: ModuleSlot[] = [];
  for (const slot of slots) {
    const v = splitOnX ? slot.x : slot.y;
    if (v <= median) blockA.push(slot);
    else blockB.push(slot);
  }

  if (blockA.length === 0 || blockB.length === 0) {
    const half = Math.ceil(slots.length / 2);
    return [slots.slice(0, half), slots.slice(half)];
  }

  return [blockA, blockB];
}

function selectFromBlocks(
  blocks: ModuleSlot[][],
  targetCount: number,
  heightM: number,
): {
  selected: ModuleSlot[];
  blockModuleCounts: number[];
  rowModuleCounts: number[];
  unusedAreaReason?: string;
} {
  const totalCap = blocks.reduce((sum, b) => sum + b.length, 0);
  const effectiveTarget = Math.min(targetCount, totalCap);
  const quotas = blocks.map((block) =>
    Math.floor((block.length / Math.max(totalCap, 1)) * effectiveTarget),
  );
  let assigned = quotas.reduce((a, b) => a + b, 0);
  const order = blocks.map((block, i) => ({ i, cap: block.length })).sort((a, b) => b.cap - a.cap);
  let qi = 0;
  while (assigned < effectiveTarget) {
    quotas[order[qi % order.length].i]++;
    assigned++;
    qi++;
  }

  const selected: ModuleSlot[] = [];
  const blockModuleCounts: number[] = [];
  const rowModuleCounts: number[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const { selected: blockSelected, rowModuleCounts: blockRows } = selectSlotsSequential(
      blocks[i],
      quotas[i],
      heightM,
    );
    selected.push(...blockSelected);
    blockModuleCounts.push(blockSelected.length);
    rowModuleCounts.push(...blockRows);
  }

  const unusedAreaReason =
    totalCap > effectiveTarget * 1.3 ? "large-unused-area-rebalanced" : undefined;

  return { selected, blockModuleCounts, rowModuleCounts, unusedAreaReason };
}

function bboxAspectRatio(slots: ModuleSlot[], widthM: number, heightM: number): number {
  if (slots.length === 0) return 1;
  const xs = slots.flatMap((s) => [s.x, s.x + widthM]);
  const ys = slots.flatMap((s) => [s.y, s.y + heightM]);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return Math.max(w, h) / Math.max(Math.min(w, h), 0.01);
}

function isLongSingleStrip(
  selected: ModuleSlot[],
  rowModuleCounts: number[],
  widthM: number,
  heightM: number,
): boolean {
  if (rowModuleCounts.length <= 1) return true;
  const aspect = bboxAspectRatio(selected, widthM, heightM);
  if (aspect >= 3.5 && rowModuleCounts.length <= 2) return true;
  const maxRow = Math.max(...rowModuleCounts, 0);
  const total = selected.length;
  if (total > 0 && maxRow / total >= 0.75 && rowModuleCounts.length <= 3) return true;
  return false;
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
  requireDoubleBlock: boolean;
}): {
  modules: ModuleRect[];
  validSlotCount: number;
  rowModuleCounts: number[];
  blockModuleCounts: number[];
  blockCount: number;
  layoutTier: LandLayoutTier;
  score: number;
  singleBlockRejectedReason?: string;
  unusedAreaReason?: string;
} | null {
  const angleRad = panelAzimuthToLayoutAngleRad(input.azimuthDeg);
  const oriented = toOrientedPolyAtAngle(input.polygon, angleRad);
  const scale = moduleLayoutConfig.visualScale;
  const widthM = moduleLayoutConfig.moduleShortM * scale;
  const heightM = moduleLayoutConfig.moduleLongM * scale;
  const rowGapM =
    input.params.mode === "row"
      ? getVisualRowSpacingM(input.params.kind, input.params.mode)
      : 0;

  const slots = collectValidSlots(oriented, widthM, heightM, rowGapM);
  if (slots.length === 0) return null;

  let selected: ModuleSlot[];
  let rowModuleCounts: number[];
  let blockModuleCounts: number[];
  let blockCount: number;
  let layoutTier: LandLayoutTier;
  let unusedAreaReason: string | undefined;
  let singleBlockRejectedReason: string | undefined;

  if (input.requireDoubleBlock) {
    const blocks = splitSlotsIntoBlocks(slots, 2);
    if (blocks.length < 2 || blocks[0].length === 0 || blocks[1].length === 0) {
      singleBlockRejectedReason = "cannot-split-into-two-blocks";
      return null;
    }
    const picked = selectFromBlocks(blocks, input.targetCount, heightM);
    selected = picked.selected;
    rowModuleCounts = picked.rowModuleCounts;
    blockModuleCounts = picked.blockModuleCounts;
    blockCount = blockModuleCounts.filter((n) => n > 0).length;
    layoutTier = "double";
    unusedAreaReason = picked.unusedAreaReason;
    if (isLongSingleStrip(selected, rowModuleCounts, widthM, heightM)) {
      singleBlockRejectedReason = "long-single-strip-rejected";
      return null;
    }
  } else {
    const picked = selectSlotsSequential(slots, input.targetCount, heightM);
    selected = picked.selected;
    rowModuleCounts = picked.rowModuleCounts;
    blockModuleCounts = [selected.length];
    blockCount = 1;
    layoutTier = "single";
  }

  const modules = selected.map((slot) =>
    makePortraitModuleRect(slot.x, slot.y, widthM, heightM, oriented.origin, oriented.angleRad),
  );

  let score = selected.length * 1000 + azimuthPreferenceScore(input.azimuthDeg);
  if (selected.length >= input.targetCount) score += 500;
  if (input.requireDoubleBlock && blockCount >= 2) score += 400;
  score -= Math.abs(selected.length - input.targetCount) * 5;

  return {
    modules,
    validSlotCount: slots.length,
    rowModuleCounts,
    blockModuleCounts,
    blockCount,
    layoutTier,
    score,
    singleBlockRejectedReason,
    unusedAreaReason,
  };
}

export function placeLandBlockLayout(
  polygon: LatLngPoint[],
  targetCount: number,
  params: LayoutParams,
  capacityKw: number,
): LandBlockPlacementResult {
  const requireDoubleBlock = capacityKw > LAND_DOUBLE_BLOCK_THRESHOLD_KW;
  const capacityLayoutRule: CapacityLayoutRule = requireDoubleBlock
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
      requireDoubleBlock,
    });
    if (!attempt) {
      candidateScores[String(azimuthDeg)] = -1;
      continue;
    }
    candidateScores[String(azimuthDeg)] = attempt.score;
    if (!best || attempt.score > best.score) {
      best = attempt;
      bestAzimuth = azimuthDeg;
    }
  }

  if (!best && requireDoubleBlock) {
    rejectReason = "double-block-failed-fallback-single";
    for (const azimuthDeg of LAND_CANDIDATE_AZIMUTHS_DEG) {
      const attempt = tryPlacementAtAzimuth({
        polygon,
        targetCount,
        params,
        azimuthDeg,
        requireDoubleBlock: false,
      });
      if (!attempt) continue;
      candidateScores[`${azimuthDeg}-fallback`] = attempt.score;
      if (!best || attempt.score > best.score) {
        best = attempt;
        bestAzimuth = azimuthDeg;
      }
    }
  }

  if (!best) {
    return {
      modules: [],
      validSlotCount: 0,
      rowModuleCounts: [],
      diagnostics: {
        layoutTier: requireDoubleBlock ? "double" : "single",
        blockCount: 0,
        blockModuleCounts: [],
        rowCount: 0,
        rowModuleCounts: [],
        selectedAzimuthDegrees: 180,
        candidateAzimuths: [...LAND_CANDIDATE_AZIMUTHS_DEG],
        candidateScores,
        capacityLayoutRule,
        singleBlockRejectedReason: rejectReason ?? "no-valid-slots",
        unusedAreaReason: "no-valid-slots",
      },
    };
  }

  return {
    modules: best.modules,
    validSlotCount: best.validSlotCount,
    rowModuleCounts: best.rowModuleCounts,
    diagnostics: {
      layoutTier: best.layoutTier,
      blockCount: best.blockCount,
      blockModuleCounts: best.blockModuleCounts,
      rowCount: best.rowModuleCounts.length,
      rowModuleCounts: best.rowModuleCounts,
      selectedAzimuthDegrees: bestAzimuth,
      candidateAzimuths: [...LAND_CANDIDATE_AZIMUTHS_DEG],
      candidateScores,
      capacityLayoutRule,
      singleBlockRejectedReason: requireDoubleBlock
        ? best.blockCount < 2
          ? (rejectReason ?? best.singleBlockRejectedReason)
          : undefined
        : undefined,
      unusedAreaReason: best.unusedAreaReason,
    },
  };
}
