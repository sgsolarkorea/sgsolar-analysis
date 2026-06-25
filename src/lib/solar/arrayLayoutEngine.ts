import { layoutPolicy, moduleLayoutConfig, getActualModuleDimensions } from "@/data/moduleLayoutConfig";
import { MODULE_KW } from "@/lib/solar/capacityResolution";
import {
  buildLandCandidateAzimuths,
  panelAzimuthToLayoutAngleRad,
} from "@/lib/solar/landBlockLayout";
import {
  computeOrientedBounds,
  computePolygonOrientation,
  localToGeo,
  pointInPolygon,
  toLocal,
  type LocalPoint,
} from "@/lib/solar/polygonGeometry";
import {
  moduleFitsWithRoofTolerance,
  ROOF_PRODUCTION_EDGE_TOLERANCE_M,
  ROOF_PRODUCTION_FITTING_POLICY,
} from "@/lib/solar/roofModuleFitting";
import type { LatLngPoint, ModuleRect } from "@/types/moduleLayout";

export type ArrayLayoutMode = "continuous_array" | "dual_array";

export type ArrayLayoutSelectionReason =
  | "continuous_under_30kw"
  | "dual_required_continuous_ge_30kw"
  | "dual_failed_fallback_continuous"
  | "layout_failed";

export type RoofDualReason =
  | "continuous_under_30kw_threshold"
  | "single_dual_set_no_inter_set_aisle"
  | "multi_dual_set_inter_set_aisle_applied"
  | "dual_max_fill_below_continuous"
  | "dual_max_fill_equals_continuous"
  | "dual_failed_fallback_continuous"
  | "multi_building_mixed_dual_sets";

export type ModuleOrientationMode = "portrait" | "landscape";

export type RoofContinuousReason =
  | "roof_continuous_max_fill_selected"
  | "target_quota_removed_under_30kw"
  | "portrait_selected"
  | "landscape_selected";

export interface ArrayLayoutDiagnostics {
  layoutMode: ArrayLayoutMode;
  layoutSelectionReason: ArrayLayoutSelectionReason;
  continuousPlacedModuleCount: number;
  continuousPlacedKw: number;
  dualPlacedModuleCount: number;
  dualPlacedKw: number;
  selectedPlacedModuleCount: number;
  selectedPlacedKw: number;
  innerTierGapM: number;
  dualArraySetAisleM: number;
  roofContinuousRowGapM: number;
  selectedAzimuthDegrees?: number;
  placedModuleCountByBuilding?: number[];
  /** 건물형 dual diagnostics */
  dualSetCount?: number;
  continuousMaxFill?: number;
  dualMaxFill?: number;
  appliedDualAisleM?: number;
  dualAisleEffective?: boolean;
  roofDualReason?: RoofDualReason | string;
  /** 건물형 continuous (<30kW) diagnostics */
  moduleOrientationMode?: ModuleOrientationMode | "mixed";
  portraitPlacedModuleCount?: number;
  landscapePlacedModuleCount?: number;
  mixedPlacedModuleCount?: number;
  selectedOrientationMode?: ModuleOrientationMode;
  selectedOrientationDegrees?: number;
  maxFillPlacedModuleCount?: number;
  targetQuotaPlacedModuleCount?: number;
  targetQuotaLimited?: boolean;
  roofContinuousReason?: RoofContinuousReason | string;
  /** 모듈 fitting 규격 diagnostics */
  actualModuleShortM?: number;
  actualModuleLongM?: number;
  renderScale?: number;
  fittingModuleWidthM?: number;
  fittingModuleHeightM?: number;
  /** band·row gap diagnostics (<30kW roof continuous) */
  selectedRowGapM?: number;
  roofContinuousRowGapReferenceM?: number;
  selectedBandSlotCount?: number;
  unselectedValidSlotCount?: number;
  bandSelectionReason?: string;
  /** 건물형 fitting policy diagnostics */
  strictPlacedModuleCount?: number;
  edgeTolerancePlacedModuleCount?: number;
  selectedFittingPolicy?: string;
  selectedToleranceM?: number;
  targetQuotaUsedForLayout?: boolean;
  dualTargetQuotaLimited?: boolean;
}

export interface ArrayLayoutResult {
  modules: ModuleRect[];
  placedModuleCount: number;
  validSlotCount: number;
  rowModuleCounts: number[];
  diagnostics: ArrayLayoutDiagnostics;
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

interface TwoTierRowSet {
  setIndex: number;
  baseY: number;
  maxY: number;
  tiers: [ModuleSlot[], ModuleSlot[]];
  capacity: number;
}

const TIER_ROWS = 2;
export const ARRAY_MODE_THRESHOLD_MODULES = Math.ceil(
  layoutPolicy.arrayModeThresholdKw / MODULE_KW,
);
const MAX_FILL_TARGET = 99_999;

function countActiveDualSets(rowModuleCounts: number[]): number {
  let count = 0;
  for (let i = 0; i < rowModuleCounts.length; i += TIER_ROWS) {
    const tier1 = rowModuleCounts[i] ?? 0;
    const tier2 = rowModuleCounts[i + 1] ?? 0;
    if (tier1 + tier2 > 0) count++;
  }
  return count;
}

function resolveRoofDualReason(input: {
  layoutMode: ArrayLayoutMode;
  layoutSelectionReason: ArrayLayoutSelectionReason;
  dualSetCount: number;
  continuousMaxFill: number;
  dualMaxFill: number;
  dualAisleEffective: boolean;
}): RoofDualReason {
  if (input.layoutSelectionReason === "continuous_under_30kw") {
    return "continuous_under_30kw_threshold";
  }
  if (input.layoutSelectionReason === "dual_failed_fallback_continuous") {
    return "dual_failed_fallback_continuous";
  }
  if (input.dualAisleEffective) {
    return input.dualMaxFill < input.continuousMaxFill
      ? "multi_dual_set_inter_set_aisle_applied"
      : "dual_max_fill_equals_continuous";
  }
  if (input.dualMaxFill < input.continuousMaxFill) {
    return "dual_max_fill_below_continuous";
  }
  return "single_dual_set_no_inter_set_aisle";
}

function buildRoofDualDiagnostics(input: {
  kind: "land" | "roof";
  layoutMode: ArrayLayoutMode;
  layoutSelectionReason: ArrayLayoutSelectionReason;
  rowModuleCounts: number[];
  dualRowModuleCounts?: number[];
  continuousMaxFill: number;
  dualMaxFill: number;
}): Pick<
  ArrayLayoutDiagnostics,
  | "dualSetCount"
  | "continuousMaxFill"
  | "dualMaxFill"
  | "appliedDualAisleM"
  | "dualAisleEffective"
  | "roofDualReason"
> {
  if (input.kind !== "roof") {
    return {};
  }

  const setCountRows =
    input.layoutMode === "dual_array"
      ? input.rowModuleCounts
      : (input.dualRowModuleCounts ?? input.rowModuleCounts);
  const dualSetCount = countActiveDualSets(setCountRows);
  const dualAisleEffective = dualSetCount >= 2;
  const appliedDualAisleM = dualAisleEffective ? layoutPolicy.dualArraySetAisleM : 0;

  return {
    dualSetCount,
    continuousMaxFill: input.continuousMaxFill,
    dualMaxFill: input.dualMaxFill,
    appliedDualAisleM,
    dualAisleEffective,
    roofDualReason: resolveRoofDualReason({
      layoutMode: input.layoutMode,
      layoutSelectionReason: input.layoutSelectionReason,
      dualSetCount,
      continuousMaxFill: input.continuousMaxFill,
      dualMaxFill: input.dualMaxFill,
      dualAisleEffective,
    }),
  };
}

function aggregateMultiBuildingRoofDualReason(
  diagnostics: ArrayLayoutDiagnostics[],
): RoofDualReason | string {
  const reasons = diagnostics
    .map((item) => item.roofDualReason)
    .filter((item): item is RoofDualReason => typeof item === "string");
  if (reasons.length === 0) return "continuous_under_30kw_threshold";
  const unique = new Set(reasons);
  if (unique.size === 1) return reasons[0];
  if (unique.has("multi_dual_set_inter_set_aisle_applied")) {
    return "multi_building_mixed_dual_sets";
  }
  return "multi_building_mixed_dual_sets";
}

export function aggregateRoofDualDiagnostics(
  buildingDiagnostics: ArrayLayoutDiagnostics[],
): Pick<
  ArrayLayoutDiagnostics,
  | "dualSetCount"
  | "continuousMaxFill"
  | "dualMaxFill"
  | "appliedDualAisleM"
  | "dualAisleEffective"
  | "roofDualReason"
> {
  if (buildingDiagnostics.length === 0) return {};

  const dualSetCount = buildingDiagnostics.reduce(
    (sum, item) => sum + (item.dualSetCount ?? 0),
    0,
  );
  const continuousMaxFill = buildingDiagnostics.reduce(
    (sum, item) => sum + (item.continuousMaxFill ?? 0),
    0,
  );
  const dualMaxFill = buildingDiagnostics.reduce(
    (sum, item) => sum + (item.dualMaxFill ?? 0),
    0,
  );
  const dualAisleEffective = buildingDiagnostics.some((item) => item.dualAisleEffective);
  const appliedDualAisleM = dualAisleEffective ? layoutPolicy.dualArraySetAisleM : 0;

  return {
    dualSetCount,
    continuousMaxFill,
    dualMaxFill,
    appliedDualAisleM,
    dualAisleEffective,
    roofDualReason: aggregateMultiBuildingRoofDualReason(buildingDiagnostics),
  };
}

function withRoofDualDiagnostics(
  diagnostics: ArrayLayoutDiagnostics,
  input: {
    kind: "land" | "roof";
    rowModuleCounts: number[];
    dualRowModuleCounts?: number[];
    continuousMaxFill: number;
    dualMaxFill: number;
  },
): ArrayLayoutDiagnostics {
  if (input.kind !== "roof") return diagnostics;
  return {
    ...diagnostics,
    ...buildRoofDualDiagnostics({
      kind: input.kind,
      layoutMode: diagnostics.layoutMode,
      layoutSelectionReason: diagnostics.layoutSelectionReason,
      rowModuleCounts: input.rowModuleCounts,
      dualRowModuleCounts: input.dualRowModuleCounts,
      continuousMaxFill: input.continuousMaxFill,
      dualMaxFill: input.dualMaxFill,
    }),
  };
}

function toKw(modules: number): number {
  return Math.round(modules * MODULE_KW * 100) / 100;
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

function moduleFitsInPolygon(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  localPoly: LocalPoint[],
  kind: "land" | "roof",
  roofToleranceM: number = ROOF_PRODUCTION_EDGE_TOLERANCE_M,
): boolean {
  if (kind === "roof") {
    return moduleFitsWithRoofTolerance(x, y, widthM, heightM, localPoly, roofToleranceM);
  }
  const corners: LocalPoint[] = [
    { x, y },
    { x: x + widthM, y },
    { x: x + widthM, y: y + heightM },
    { x, y: y + heightM },
  ];
  return corners.every((corner) => pointInPolygon(corner, localPoly));
}

function collectRowSlots(
  oriented: OrientedPoly,
  y: number,
  widthM: number,
  heightM: number,
  kind: "land" | "roof",
  roofToleranceM: number = ROOF_PRODUCTION_EDGE_TOLERANCE_M,
): ModuleSlot[] {
  const slots: ModuleSlot[] = [];
  for (let x = oriented.minX; x + widthM <= oriented.maxX + 0.001; x += widthM) {
    if (moduleFitsInPolygon(x, y, widthM, heightM, oriented.localPoly, kind, roofToleranceM)) {
      slots.push({ x, y });
    }
  }
  return slots.sort((a, b) => a.x - b.x);
}

function collectValidSlots(
  oriented: OrientedPoly,
  widthM: number,
  heightM: number,
  rowGapM: number,
  kind: "land" | "roof",
  roofToleranceM: number = ROOF_PRODUCTION_EDGE_TOLERANCE_M,
): ModuleSlot[] {
  const slots: ModuleSlot[] = [];
  let y = oriented.minY;
  while (y + heightM <= oriented.maxY + 0.001) {
    let x = oriented.minX;
    while (x + widthM <= oriented.maxX + 0.001) {
      if (moduleFitsInPolygon(x, y, widthM, heightM, oriented.localPoly, kind, roofToleranceM)) {
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

function selectCentered(slots: ModuleSlot[], count: number): ModuleSlot[] {
  if (count <= 0 || slots.length === 0) return [];
  if (slots.length <= count) return [...slots];
  const start = Math.floor((slots.length - count) / 2);
  return slots.slice(start, start + count);
}

function distributeQuotas(capacities: number[], targetCount: number): number[] {
  const totalCap = capacities.reduce((sum, cap) => sum + cap, 0);
  const effectiveTarget = Math.min(targetCount, totalCap);
  if (effectiveTarget <= 0 || totalCap <= 0) return capacities.map(() => 0);
  const quotas = capacities.map((cap) => Math.floor((cap / totalCap) * effectiveTarget));
  let assigned = quotas.reduce((sum, q) => sum + q, 0);
  const order = capacities.map((cap, i) => ({ cap, i })).sort((a, b) => b.cap - a.cap);
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

function selectContiguousCentered(slots: ModuleSlot[], count: number): ModuleSlot[] {
  if (count <= 0 || slots.length === 0) return [];
  if (slots.length <= count) return [...slots];
  const start = Math.floor((slots.length - count) / 2);
  return slots.slice(start, start + count);
}

function distributeRoofBandQuotas(rowCaps: number[], target: number): number[] {
  const quotas = rowCaps.map(() => 0);
  let remaining = Math.min(target, rowCaps.reduce((sum, cap) => sum + cap, 0));
  const order = rowCaps.map((cap, i) => ({ cap, i })).sort((a, b) => b.cap - a.cap || a.i - b.i);
  while (remaining > 0) {
    let progressed = false;
    for (const { i } of order) {
      if (remaining <= 0) break;
      if (quotas[i] >= rowCaps[i]) continue;
      quotas[i]++;
      remaining--;
      progressed = true;
    }
    if (!progressed) break;
  }
  return quotas;
}

function selectRoofContinuous(
  slots: ModuleSlot[],
  targetCount: number,
  heightM: number,
  widthM: number,
): { selected: ModuleSlot[]; rowModuleCounts: number[]; score: number } {
  const rows = groupSlotsByRow(slots, heightM);
  if (rows.length === 0) return { selected: [], rowModuleCounts: [], score: -Infinity };

  let best: { selected: ModuleSlot[]; rowModuleCounts: number[]; score: number } | null = null;
  for (let start = 0; start < rows.length; start++) {
    for (let end = start; end < rows.length; end++) {
      const band = rows.slice(start, end + 1);
      const rowCaps = band.map((row) => row.length);
      const capacity = rowCaps.reduce((sum, cap) => sum + cap, 0);
      if (capacity <= 0) continue;
      const quotas = distributeRoofBandQuotas(rowCaps, targetCount);
      const selected: ModuleSlot[] = [];
      const rowModuleCounts: number[] = [];
      for (let i = 0; i < band.length; i++) {
        const quota = quotas[i];
        if (quota <= 0) continue;
        const pick = selectContiguousCentered([...band[i]].sort((a, b) => a.x - b.x), quota);
        selected.push(...pick);
        rowModuleCounts.push(pick.length);
      }
      let score = selected.length * 1000;
      if (selected.length >= targetCount) score += 1000;
      score -= Math.abs(selected.length - targetCount) * 200;
      if (!best || score > best.score) best = { selected, rowModuleCounts, score };
    }
  }
  return best ?? { selected: [], rowModuleCounts: [], score: -Infinity };
}

/** 30kW 미만 max-fill — valid slot 전체 사용 (band·contiguous per-row 제약 없음) */
function selectRoofContinuousMaxFill(
  slots: ModuleSlot[],
  heightM: number,
): {
  selected: ModuleSlot[];
  rowModuleCounts: number[];
  bandSelectionReason: string;
  selectedBandSlotCount: number;
} {
  const rows = groupSlotsByRow(slots, heightM);
  const selected: ModuleSlot[] = [];
  const rowModuleCounts: number[] = [];
  for (const row of rows) {
    selected.push(...row);
    rowModuleCounts.push(row.length);
  }
  return {
    selected,
    rowModuleCounts,
    bandSelectionReason: "max_fill_all_valid_slots",
    selectedBandSlotCount: selected.length,
  };
}

function selectRoofContinuousForQuota(
  slots: ModuleSlot[],
  targetCount: number,
  heightM: number,
): {
  selected: ModuleSlot[];
  rowModuleCounts: number[];
  bandSelectionReason: string;
  selectedBandSlotCount: number;
} {
  const band = selectRoofContinuous(slots, targetCount, heightM, 0);
  return {
    selected: band.selected,
    rowModuleCounts: band.rowModuleCounts,
    bandSelectionReason: "contiguous_band_target_quota",
    selectedBandSlotCount: band.selected.length,
  };
}

function selectRoofContinuousSlots(
  slots: ModuleSlot[],
  targetCount: number,
  heightM: number,
  maxFill: boolean,
): {
  selected: ModuleSlot[];
  rowModuleCounts: number[];
  bandSelectionReason: string;
  selectedBandSlotCount: number;
  unselectedValidSlotCount: number;
} {
  const validSlotCount = slots.length;
  if (validSlotCount === 0) {
    return {
      selected: [],
      rowModuleCounts: [],
      bandSelectionReason: "no_valid_slots",
      selectedBandSlotCount: 0,
      unselectedValidSlotCount: 0,
    };
  }
  const pick = maxFill
    ? selectRoofContinuousMaxFill(slots, heightM)
    : selectRoofContinuousForQuota(slots, targetCount, heightM);
  return {
    ...pick,
    unselectedValidSlotCount: Math.max(0, validSlotCount - pick.selected.length),
  };
}

function selectLandContinuousRows(
  rows: ModuleSlot[][],
  targetCount: number,
): { selected: ModuleSlot[]; rowModuleCounts: number[] } {
  const quotas = distributeQuotas(
    rows.map((row) => row.length),
    targetCount,
  );
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

function slotXKey(x: number, widthM: number): number {
  return Math.round(x / Math.max(widthM, 0.01) * 1000);
}

function alignTierPair(tier1: ModuleSlot[], tier2: ModuleSlot[], widthM: number) {
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

function collectTwoTierRowSets(
  oriented: OrientedPoly,
  widthM: number,
  heightM: number,
  innerTierGapM: number,
  setAisleM: number,
  offsetM: number,
  kind: "land" | "roof",
  roofToleranceM: number = ROOF_PRODUCTION_EDGE_TOLERANCE_M,
): TwoTierRowSet[] {
  const sets: TwoTierRowSet[] = [];
  const setPitchM = heightM * TIER_ROWS + innerTierGapM + setAisleM;
  let setIndex = 0;
  for (let y = oriented.minY + offsetM; y + heightM <= oriented.maxY + 0.001; y += setPitchM) {
    const tier1Y = y;
    const tier2Y = y + heightM + innerTierGapM;
    if (tier2Y + heightM > oriented.maxY + 0.001) continue;
    const rawTier1 = collectRowSlots(oriented, tier1Y, widthM, heightM, kind, roofToleranceM);
    const rawTier2 = collectRowSlots(oriented, tier2Y, widthM, heightM, kind, roofToleranceM);
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

function splitTwoTierQuota(set: TwoTierRowSet, quota: number): [number, number] {
  const [tier1, tier2] = set.tiers;
  let q1 = Math.min(Math.ceil(quota / TIER_ROWS), tier1.length);
  let q2 = Math.min(Math.floor(quota / TIER_ROWS), tier2.length);
  let remaining = quota - q1 - q2;
  while (remaining > 0 && (q1 < tier1.length || q2 < tier2.length)) {
    if (q1 <= q2 && q1 < tier1.length) q1++;
    else if (q2 < tier2.length) q2++;
    else if (q1 < tier1.length) q1++;
    remaining--;
  }
  return [q1, q2];
}

function selectTwoTierRowSets(
  sets: TwoTierRowSet[],
  targetCount: number,
): { selected: ModuleSlot[]; rowModuleCounts: number[] } {
  const quotas = distributeQuotas(
    sets.map((set) => set.capacity),
    targetCount,
  );
  const selected: ModuleSlot[] = [];
  const rowModuleCounts: number[] = [];
  for (let i = 0; i < sets.length; i++) {
    const quota = quotas[i];
    if (quota <= 0) continue;
    const set = sets[i];
    const [tier1Quota, tier2Quota] = splitTwoTierQuota(set, quota);
    const tier1Pick = selectCentered(set.tiers[0], tier1Quota);
    const tier2Pick = selectCentered(set.tiers[1], tier2Quota);
    selected.push(...tier1Pick, ...tier2Pick);
    rowModuleCounts.push(tier1Pick.length, tier2Pick.length);
  }
  return { selected, rowModuleCounts };
}

function selectTwoTierRowSetsMaxFill(
  sets: TwoTierRowSet[],
): { selected: ModuleSlot[]; rowModuleCounts: number[] } {
  const selected: ModuleSlot[] = [];
  const rowModuleCounts: number[] = [];
  for (const set of sets) {
    selected.push(...set.tiers[0], ...set.tiers[1]);
    rowModuleCounts.push(set.tiers[0].length, set.tiers[1].length);
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

function moduleDimensions(kind: "land" | "roof") {
  if (kind === "roof") {
    const actual = getActualModuleDimensions("portrait");
    return {
      widthM: actual.widthM,
      heightM: actual.heightM,
      renderScale: moduleLayoutConfig.roofRenderScale,
    };
  }
  const renderScale = moduleLayoutConfig.visualScale;
  return {
    widthM: moduleLayoutConfig.moduleShortM * renderScale,
    heightM: moduleLayoutConfig.moduleLongM * renderScale,
    renderScale,
  };
}

function roofModuleDimensions(mode: ModuleOrientationMode) {
  return getActualModuleDimensions(mode === "portrait" ? "portrait" : "landscape");
}

function buildRoofFittingPolicyDiagnostics(input: {
  strictPlacedModuleCount: number;
  edgeTolerancePlacedModuleCount: number;
}): Pick<
  ArrayLayoutDiagnostics,
  | "strictPlacedModuleCount"
  | "edgeTolerancePlacedModuleCount"
  | "selectedFittingPolicy"
  | "selectedToleranceM"
  | "targetQuotaUsedForLayout"
  | "dualTargetQuotaLimited"
> {
  return {
    strictPlacedModuleCount: input.strictPlacedModuleCount,
    edgeTolerancePlacedModuleCount: input.edgeTolerancePlacedModuleCount,
    selectedFittingPolicy: ROOF_PRODUCTION_FITTING_POLICY,
    selectedToleranceM: ROOF_PRODUCTION_EDGE_TOLERANCE_M,
    targetQuotaUsedForLayout: false,
    dualTargetQuotaLimited: false,
  };
}

function roofContinuousMaxFillAtTolerance(polygon: LatLngPoint[], toleranceM: number): number {
  const attempts = buildRoofContinuousAttempts(polygon, MAX_FILL_TARGET, true, toleranceM);
  const best = pickBestRoofContinuousCandidate(attempts);
  return best?.placedModuleCount ?? 0;
}

function roofDualMaxFillAtTolerance(polygon: LatLngPoint[], toleranceM: number): number {
  const candidates = orientationCandidates(polygon, "roof");
  const best = pickBestSimulation(
    candidates.map((candidate, orientationIndex) =>
      simulateDualAtOrientation({
        polygon,
        targetCount: MAX_FILL_TARGET,
        kind: "roof",
        angleRad: candidate.angleRad,
        azimuthDeg: candidate.azimuthDeg,
        orientationIndex,
        maxFill: true,
        roofToleranceM: toleranceM,
      }),
    ),
  );
  return best?.placedModuleCount ?? 0;
}

function buildModuleFittingDiagnostics(
  orientationMode: ModuleOrientationMode,
): Pick<
  ArrayLayoutDiagnostics,
  | "actualModuleShortM"
  | "actualModuleLongM"
  | "renderScale"
  | "fittingModuleWidthM"
  | "fittingModuleHeightM"
> {
  const { widthM, heightM } = roofModuleDimensions(orientationMode);
  return {
    actualModuleShortM: moduleLayoutConfig.moduleShortM,
    actualModuleLongM: moduleLayoutConfig.moduleLongM,
    renderScale: moduleLayoutConfig.roofRenderScale,
    fittingModuleWidthM: widthM,
    fittingModuleHeightM: heightM,
  };
}

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

interface RoofContinuousCandidateResult {
  modules: ModuleRect[];
  placedModuleCount: number;
  validSlotCount: number;
  rowModuleCounts: number[];
  moduleOrientationMode: ModuleOrientationMode;
  orientationDegrees: number;
  gridRotationDeg: 0 | 90;
  rowGapM: number;
  bandSelectionReason: string;
  selectedBandSlotCount: number;
  unselectedValidSlotCount: number;
}

function simulateRoofContinuousCandidate(input: {
  polygon: LatLngPoint[];
  targetCount: number;
  candidate: RoofContinuousCandidateSpec;
  rowGapM: number;
  maxFill: boolean;
  roofToleranceM?: number;
}): RoofContinuousCandidateResult | null {
  const roofToleranceM: number = input.roofToleranceM ?? ROOF_PRODUCTION_EDGE_TOLERANCE_M;
  const { widthM, heightM } = roofModuleDimensions(input.candidate.moduleOrientationMode);
  const oriented = toOrientedPolyAtAngle(input.polygon, input.candidate.angleRad);
  const slots = collectValidSlots(oriented, widthM, heightM, input.rowGapM, "roof", roofToleranceM);
  const {
    selected,
    rowModuleCounts,
    bandSelectionReason,
    selectedBandSlotCount,
    unselectedValidSlotCount,
  } = selectRoofContinuousSlots(slots, input.targetCount, heightM, input.maxFill);
  if (selected.length === 0) return null;
  const modules = selected.map((slot) =>
    makePortraitModuleRect(slot.x, slot.y, widthM, heightM, oriented.origin, oriented.angleRad),
  );
  return {
    modules,
    placedModuleCount: modules.length,
    validSlotCount: slots.length,
    rowModuleCounts,
    moduleOrientationMode: input.candidate.moduleOrientationMode,
    orientationDegrees: Math.round((input.candidate.angleRad * 180) / Math.PI),
    gridRotationDeg: input.candidate.gridRotationDeg,
    rowGapM: input.rowGapM,
    bandSelectionReason,
    selectedBandSlotCount,
    unselectedValidSlotCount,
  };
}

function pickBestRoofContinuousCandidate(
  attempts: RoofContinuousCandidateResult[],
): RoofContinuousCandidateResult | null {
  let best: RoofContinuousCandidateResult | null = null;
  for (const attempt of attempts) {
    if (!best) {
      best = attempt;
      continue;
    }
    if (attempt.placedModuleCount !== best.placedModuleCount) {
      if (attempt.placedModuleCount > best.placedModuleCount) best = attempt;
      continue;
    }
    if (attempt.validSlotCount !== best.validSlotCount) {
      if (attempt.validSlotCount > best.validSlotCount) best = attempt;
      continue;
    }
    if (attempt.rowGapM < best.rowGapM) best = attempt;
  }
  return best;
}

function buildRoofContinuousAttempts(
  polygon: LatLngPoint[],
  targetCount: number,
  maxFill: boolean,
  roofToleranceM: number = ROOF_PRODUCTION_EDGE_TOLERANCE_M,
): RoofContinuousCandidateResult[] {
  const candidates = buildRoofContinuousCandidates(polygon);
  const rowGapCandidates = maxFill
    ? [...layoutPolicy.roofContinuousRowGapCandidatesM]
    : [layoutPolicy.roofContinuousRowGapReferenceM];
  const attempts: RoofContinuousCandidateResult[] = [];
  for (const rowGapM of rowGapCandidates) {
    for (const candidate of candidates) {
      const result = simulateRoofContinuousCandidate({
        polygon,
        targetCount,
        candidate,
        rowGapM,
        maxFill,
        roofToleranceM,
      });
      if (result) attempts.push(result);
    }
  }
  return attempts;
}

/** diagnostics: row gap 후보별 max-fill placed count */
export function probeRoofContinuousRowGaps(
  polygon: LatLngPoint[],
): Array<{
  rowGapM: number;
  placedModuleCount: number;
  validSlotCount: number;
  selectedOrientationMode: ModuleOrientationMode;
  orientationDegrees: number;
  unselectedValidSlotCount: number;
  bandSelectionReason: string;
}> {
  const results: Array<{
    rowGapM: number;
    placedModuleCount: number;
    validSlotCount: number;
    selectedOrientationMode: ModuleOrientationMode;
    orientationDegrees: number;
    unselectedValidSlotCount: number;
    bandSelectionReason: string;
  }> = [];
  for (const rowGapM of layoutPolicy.roofContinuousRowGapCandidatesM) {
    const attempts = buildRoofContinuousAttempts(polygon, MAX_FILL_TARGET, true).filter(
      (a) => a.rowGapM === rowGapM,
    );
    const best = pickBestRoofContinuousCandidate(attempts);
    if (!best) continue;
    results.push({
      rowGapM,
      placedModuleCount: best.placedModuleCount,
      validSlotCount: best.validSlotCount,
      selectedOrientationMode: best.moduleOrientationMode,
      orientationDegrees: best.orientationDegrees,
      unselectedValidSlotCount: best.unselectedValidSlotCount,
      bandSelectionReason: best.bandSelectionReason,
    });
  }
  return results;
}

function probeRoofContinuousAtTarget(
  polygon: LatLngPoint[],
  targetCount: number,
): {
  portraitPlacedModuleCount: number;
  landscapePlacedModuleCount: number;
} {
  const attempts = buildRoofContinuousAttempts(polygon, targetCount, true);
  let portraitMax = 0;
  let landscapeMax = 0;
  for (const result of attempts) {
    if (result.moduleOrientationMode === "portrait") {
      portraitMax = Math.max(portraitMax, result.placedModuleCount);
    } else {
      landscapeMax = Math.max(landscapeMax, result.placedModuleCount);
    }
  }
  return { portraitPlacedModuleCount: portraitMax, landscapePlacedModuleCount: landscapeMax };
}

function resolveRoofContinuousReason(
  selectedMode: ModuleOrientationMode,
): RoofContinuousReason {
  return selectedMode === "portrait" ? "portrait_selected" : "landscape_selected";
}

function buildRoofContinuousUnder30KwDiagnostics(input: {
  best: RoofContinuousCandidateResult;
  targetQuotaPlacedModuleCount: number;
  maxFillPlacedModuleCount: number;
  portraitPlacedModuleCount: number;
  landscapePlacedModuleCount: number;
}): Pick<
  ArrayLayoutDiagnostics,
  | "moduleOrientationMode"
  | "portraitPlacedModuleCount"
  | "landscapePlacedModuleCount"
  | "mixedPlacedModuleCount"
  | "selectedOrientationMode"
  | "selectedOrientationDegrees"
  | "maxFillPlacedModuleCount"
  | "targetQuotaPlacedModuleCount"
  | "targetQuotaLimited"
  | "roofContinuousReason"
  | "actualModuleShortM"
  | "actualModuleLongM"
  | "renderScale"
  | "fittingModuleWidthM"
  | "fittingModuleHeightM"
  | "selectedRowGapM"
  | "roofContinuousRowGapReferenceM"
  | "selectedBandSlotCount"
  | "unselectedValidSlotCount"
  | "bandSelectionReason"
> {
  return {
    moduleOrientationMode: input.best.moduleOrientationMode,
    portraitPlacedModuleCount: input.portraitPlacedModuleCount,
    landscapePlacedModuleCount: input.landscapePlacedModuleCount,
    mixedPlacedModuleCount: 0,
    selectedOrientationMode: input.best.moduleOrientationMode,
    selectedOrientationDegrees: input.best.orientationDegrees,
    maxFillPlacedModuleCount: input.maxFillPlacedModuleCount,
    targetQuotaPlacedModuleCount: input.targetQuotaPlacedModuleCount,
    targetQuotaLimited: false,
    roofContinuousReason: resolveRoofContinuousReason(input.best.moduleOrientationMode),
    ...buildModuleFittingDiagnostics(input.best.moduleOrientationMode),
    selectedRowGapM: input.best.rowGapM,
    roofContinuousRowGapReferenceM: layoutPolicy.roofContinuousRowGapReferenceM,
    selectedBandSlotCount: input.best.selectedBandSlotCount,
    unselectedValidSlotCount: input.best.unselectedValidSlotCount,
    bandSelectionReason: input.best.bandSelectionReason,
  };
}

function simulateRoofContinuousArray(input: {
  polygon: LatLngPoint[];
  targetCount: number;
  maxFill?: boolean;
}): (ArrayLayoutResult & { selectedOrientationMode?: ModuleOrientationMode }) | null {
  if (input.targetCount <= 0 || input.polygon.length < 3) return null;
  const maxFill = input.maxFill ?? input.targetCount >= MAX_FILL_TARGET;
  const attempts = buildRoofContinuousAttempts(input.polygon, input.targetCount, maxFill);
  const best = pickBestRoofContinuousCandidate(attempts);
  if (!best) return null;

  const modeProbe = probeRoofContinuousAtTarget(input.polygon, input.targetCount);
  const strictMaxFill = roofContinuousMaxFillAtTolerance(input.polygon, 0);
  const fittingDiagnostics = buildRoofFittingPolicyDiagnostics({
    strictPlacedModuleCount: strictMaxFill,
    edgeTolerancePlacedModuleCount: best.placedModuleCount,
  });

  return {
    modules: best.modules,
    placedModuleCount: best.placedModuleCount,
    validSlotCount: best.validSlotCount,
    rowModuleCounts: best.rowModuleCounts,
    selectedOrientationMode: best.moduleOrientationMode,
    diagnostics: {
      layoutMode: "continuous_array",
      layoutSelectionReason: "continuous_under_30kw",
      continuousPlacedModuleCount: best.placedModuleCount,
      continuousPlacedKw: toKw(best.placedModuleCount),
      dualPlacedModuleCount: 0,
      dualPlacedKw: 0,
      selectedPlacedModuleCount: best.placedModuleCount,
      selectedPlacedKw: toKw(best.placedModuleCount),
      innerTierGapM: layoutPolicy.innerTierGapM,
      dualArraySetAisleM: layoutPolicy.dualArraySetAisleM,
      roofContinuousRowGapM: layoutPolicy.roofContinuousRowGapReferenceM,
      moduleOrientationMode: best.moduleOrientationMode,
      portraitPlacedModuleCount: modeProbe.portraitPlacedModuleCount,
      landscapePlacedModuleCount: modeProbe.landscapePlacedModuleCount,
      mixedPlacedModuleCount: 0,
      selectedOrientationMode: best.moduleOrientationMode,
      selectedOrientationDegrees: best.orientationDegrees,
      selectedRowGapM: best.rowGapM,
      roofContinuousRowGapReferenceM: layoutPolicy.roofContinuousRowGapReferenceM,
      selectedBandSlotCount: best.selectedBandSlotCount,
      unselectedValidSlotCount: best.unselectedValidSlotCount,
      bandSelectionReason: best.bandSelectionReason,
      ...buildModuleFittingDiagnostics(best.moduleOrientationMode),
      ...fittingDiagnostics,
    },
  };
}

function resolveRoofContinuousUnder30Kw(input: {
  polygon: LatLngPoint[];
  targetCount: number;
  continuousMaxFill: number;
  dualMaxFill: number;
  dualRowModuleCounts?: number[];
}): ArrayLayoutResult {
  const emptyDiagnostics: ArrayLayoutDiagnostics = {
    layoutMode: "continuous_array",
    layoutSelectionReason: "layout_failed",
    continuousPlacedModuleCount: 0,
    continuousPlacedKw: 0,
    dualPlacedModuleCount: 0,
    dualPlacedKw: 0,
    selectedPlacedModuleCount: 0,
    selectedPlacedKw: 0,
    innerTierGapM: layoutPolicy.innerTierGapM,
    dualArraySetAisleM: layoutPolicy.dualArraySetAisleM,
    roofContinuousRowGapM: layoutPolicy.roofContinuousRowGapM,
  };

  const quotaResult = simulateRoofContinuousArray({
    polygon: input.polygon,
    targetCount: input.targetCount,
    maxFill: false,
  });
  const maxFillResult = simulateRoofContinuousArray({
    polygon: input.polygon,
    targetCount: MAX_FILL_TARGET,
    maxFill: true,
  });

  if (!maxFillResult) {
    return {
      modules: [],
      placedModuleCount: 0,
      validSlotCount: 0,
      rowModuleCounts: [],
      diagnostics: emptyDiagnostics,
    };
  }

  const maxFillProbe = probeRoofContinuousAtTarget(input.polygon, MAX_FILL_TARGET);
  const maxFillBest = pickBestRoofContinuousCandidate(
    buildRoofContinuousAttempts(input.polygon, MAX_FILL_TARGET, true),
  );
  const strictMaxFill = roofContinuousMaxFillAtTolerance(input.polygon, 0);
  const roofContinuousDiagnostics = buildRoofContinuousUnder30KwDiagnostics({
    best: maxFillBest ?? {
      modules: maxFillResult.modules,
      placedModuleCount: maxFillResult.placedModuleCount,
      validSlotCount: maxFillResult.validSlotCount,
      rowModuleCounts: maxFillResult.rowModuleCounts,
      moduleOrientationMode: maxFillResult.selectedOrientationMode ?? "portrait",
      orientationDegrees: maxFillResult.diagnostics.selectedOrientationDegrees ?? 0,
      gridRotationDeg: 0,
      rowGapM: maxFillResult.diagnostics.selectedRowGapM ?? 0,
      bandSelectionReason:
        maxFillResult.diagnostics.bandSelectionReason ?? "max_fill_all_valid_slots",
      selectedBandSlotCount: maxFillResult.diagnostics.selectedBandSlotCount ?? maxFillResult.placedModuleCount,
      unselectedValidSlotCount: maxFillResult.diagnostics.unselectedValidSlotCount ?? 0,
    },
    targetQuotaPlacedModuleCount: quotaResult?.placedModuleCount ?? 0,
    maxFillPlacedModuleCount: maxFillResult.placedModuleCount,
    portraitPlacedModuleCount: maxFillProbe.portraitPlacedModuleCount,
    landscapePlacedModuleCount: maxFillProbe.landscapePlacedModuleCount,
  });

  return {
    modules: maxFillResult.modules,
    placedModuleCount: maxFillResult.placedModuleCount,
    validSlotCount: maxFillResult.validSlotCount,
    rowModuleCounts: maxFillResult.rowModuleCounts,
    diagnostics: withRoofDualDiagnostics(
      {
        ...maxFillResult.diagnostics,
        ...roofContinuousDiagnostics,
        ...buildRoofFittingPolicyDiagnostics({
          strictPlacedModuleCount: strictMaxFill,
          edgeTolerancePlacedModuleCount: maxFillResult.placedModuleCount,
        }),
        continuousPlacedModuleCount: maxFillResult.placedModuleCount,
        continuousPlacedKw: toKw(maxFillResult.placedModuleCount),
        selectedPlacedModuleCount: maxFillResult.placedModuleCount,
        selectedPlacedKw: toKw(maxFillResult.placedModuleCount),
        layoutSelectionReason: "continuous_under_30kw",
        roofContinuousReason: "roof_continuous_max_fill_selected",
      },
      {
        kind: "roof",
        rowModuleCounts: maxFillResult.rowModuleCounts,
        continuousMaxFill: input.continuousMaxFill,
        dualMaxFill: input.dualMaxFill,
        dualRowModuleCounts: input.dualRowModuleCounts,
      },
    ),
  };
}

function continuousRowGapM(kind: "land" | "roof"): number {
  return kind === "roof"
    ? layoutPolicy.roofContinuousRowGapM
    : moduleLayoutConfig.land.rowSpacingM;
}

function orientationCandidates(polygon: LatLngPoint[], kind: "land" | "roof", azimuthDeg?: number) {
  if (kind === "land" && azimuthDeg != null) {
    return [{ angleRad: panelAzimuthToLayoutAngleRad(azimuthDeg), azimuthDeg }];
  }
  if (kind === "land") {
    return buildLandCandidateAzimuths(polygon).map((deg) => ({
      angleRad: panelAzimuthToLayoutAngleRad(deg),
      azimuthDeg: deg,
    }));
  }
  const base = computePolygonOrientation(polygon);
  return [
    { angleRad: base, azimuthDeg: undefined },
    { angleRad: base + Math.PI / 2, azimuthDeg: undefined },
  ];
}

function simulateContinuousAtOrientation(input: {
  polygon: LatLngPoint[];
  targetCount: number;
  kind: "land" | "roof";
  angleRad: number;
  azimuthDeg?: number;
}): {
  modules: ModuleRect[];
  placedModuleCount: number;
  validSlotCount: number;
  rowModuleCounts: number[];
  score: number;
  azimuthDeg?: number;
} | null {
  const { widthM, heightM } = moduleDimensions(input.kind);
  const rowGapM = continuousRowGapM(input.kind);
  const oriented = toOrientedPolyAtAngle(input.polygon, input.angleRad);

  const rows: ModuleSlot[][] = [];
  const pitchM = heightM + rowGapM;
  for (let y = oriented.minY; y + heightM <= oriented.maxY + 0.001; y += pitchM) {
    const row = collectRowSlots(oriented, y, widthM, heightM, input.kind);
    if (row.length > 0) rows.push(row);
  }
  const validSlotCount = rows.reduce((sum, row) => sum + row.length, 0);
  if (validSlotCount === 0) return null;
  const { selected, rowModuleCounts } = selectLandContinuousRows(rows, input.targetCount);
  if (selected.length === 0) return null;
  const modules = selected.map((slot) =>
    makePortraitModuleRect(slot.x, slot.y, widthM, heightM, oriented.origin, oriented.angleRad),
  );
  let score = selected.length * 1000 - Math.abs(selected.length - input.targetCount) * 200;
  if (input.azimuthDeg === 180) score += 2500;
  if (input.azimuthDeg === 225) score += 1600;
  return {
    modules,
    placedModuleCount: modules.length,
    validSlotCount,
    rowModuleCounts,
    score,
    azimuthDeg: input.azimuthDeg,
  };
}

function simulateDualAtOrientation(input: {
  polygon: LatLngPoint[];
  targetCount: number;
  kind: "land" | "roof";
  angleRad: number;
  azimuthDeg?: number;
  orientationIndex?: number;
  maxFill?: boolean;
  roofToleranceM?: number;
}): {
  modules: ModuleRect[];
  placedModuleCount: number;
  validSlotCount: number;
  rowModuleCounts: number[];
  score: number;
  azimuthDeg?: number;
} | null {
  const { widthM, heightM } = moduleDimensions(input.kind);
  const innerTierGapM = layoutPolicy.innerTierGapM;
  const setAisleM = layoutPolicy.dualArraySetAisleM;
  const roofToleranceM: number = input.roofToleranceM ?? ROOF_PRODUCTION_EDGE_TOLERANCE_M;
  const useMaxFill = input.maxFill ?? (input.kind === "roof" && input.targetCount >= MAX_FILL_TARGET);
  const oriented = toOrientedPolyAtAngle(input.polygon, input.angleRad);
  const setPitchM = heightM * TIER_ROWS + innerTierGapM + setAisleM;
  const offsets = [0, setPitchM * 0.2, setPitchM * 0.4, setPitchM * 0.6, setPitchM * 0.8];

  let best: {
    modules: ModuleRect[];
    placedModuleCount: number;
    validSlotCount: number;
    rowModuleCounts: number[];
    score: number;
  } | null = null;

  for (const offsetM of offsets) {
    const sets = collectTwoTierRowSets(
      oriented,
      widthM,
      heightM,
      innerTierGapM,
      setAisleM,
      offsetM,
      input.kind,
      roofToleranceM,
    );
    const validSlotCount = sets.reduce((sum, set) => sum + set.capacity, 0);
    if (validSlotCount === 0) continue;
    const { selected, rowModuleCounts } = useMaxFill
      ? selectTwoTierRowSetsMaxFill(sets)
      : selectTwoTierRowSets(sets, input.targetCount);
    if (selected.length === 0) continue;
    let score = useMaxFill
      ? selected.length * 1000
      : selected.length * 1000 - Math.abs(selected.length - input.targetCount) * 250;
    if (input.kind === "roof" && input.orientationIndex === 1) score += 6000;
    if (input.azimuthDeg === 180) score += 2500;
    if (input.azimuthDeg === 225) score += 1600;
    const modules = selected.map((slot) =>
      makePortraitModuleRect(slot.x, slot.y, widthM, heightM, oriented.origin, oriented.angleRad),
    );
    if (!best || score > best.score) {
      best = {
        modules,
        placedModuleCount: modules.length,
        validSlotCount,
        rowModuleCounts,
        score,
      };
    }
  }

  if (!best) return null;
  return { ...best, azimuthDeg: input.azimuthDeg };
}

function pickBestSimulation<T extends { score: number }>(
  attempts: (T | null)[],
): T | null {
  let best: T | null = null;
  for (const attempt of attempts) {
    if (!attempt) continue;
    if (!best || attempt.score > best.score) best = attempt;
  }
  return best;
}

/** Diagnostics: per-orientation roof continuous simulation (portrait/landscape × grid rotation). */
export function probeRoofContinuousOrientations(
  polygon: LatLngPoint[],
  targetCount: number,
): {
  selectedOrientationIndex: number;
  selectedLabel: string;
  selectedPlaced: number;
  candidates: Array<{
    orientationIndex: number;
    label: string;
    angleDeg: number;
    moduleOrientationMode: ModuleOrientationMode;
    gridRotationDeg: 0 | 90;
    placedModuleCount: number;
    validSlotCount: number;
    rowModuleCounts: number[];
  }>;
} {
  const attempts = buildRoofContinuousAttempts(polygon, targetCount, true);
  const results = attempts.map((sim, orientationIndex) => ({
    orientationIndex,
    label: `${sim.moduleOrientationMode}_grid_${sim.gridRotationDeg}_gap_${sim.rowGapM}`,
    angleDeg: sim.orientationDegrees,
    moduleOrientationMode: sim.moduleOrientationMode,
    gridRotationDeg: sim.gridRotationDeg,
    rowGapM: sim.rowGapM,
    placedModuleCount: sim.placedModuleCount,
    validSlotCount: sim.validSlotCount,
    rowModuleCounts: sim.rowModuleCounts,
    unselectedValidSlotCount: sim.unselectedValidSlotCount,
    bandSelectionReason: sim.bandSelectionReason,
  }));

  const best = results.reduce(
    (acc, cur) =>
      !acc || cur.placedModuleCount > acc.placedModuleCount ? cur : acc,
    null as (typeof results)[number] | null,
  );

  return {
    selectedOrientationIndex: best?.orientationIndex ?? 0,
    selectedLabel: best?.label ?? "portrait_grid_0",
    selectedPlaced: best?.placedModuleCount ?? 0,
    candidates: results,
  };
}

export function simulateContinuousArray(input: {
  polygon: LatLngPoint[];
  targetCount: number;
  kind: "land" | "roof";
}): ArrayLayoutResult | null {
  if (input.targetCount <= 0 || input.polygon.length < 3) return null;
  if (input.kind === "roof") {
    return simulateRoofContinuousArray({
      polygon: input.polygon,
      targetCount: input.targetCount,
    });
  }
  const candidates = orientationCandidates(input.polygon, input.kind);
  const best = pickBestSimulation(
    candidates.map((candidate) =>
      simulateContinuousAtOrientation({
        polygon: input.polygon,
        targetCount: input.targetCount,
        kind: input.kind,
        angleRad: candidate.angleRad,
        azimuthDeg: candidate.azimuthDeg,
      }),
    ),
  );
  if (!best) return null;
  return {
    modules: best.modules,
    placedModuleCount: best.placedModuleCount,
    validSlotCount: best.validSlotCount,
    rowModuleCounts: best.rowModuleCounts,
    diagnostics: {
      layoutMode: "continuous_array",
      layoutSelectionReason: "continuous_under_30kw",
      continuousPlacedModuleCount: best.placedModuleCount,
      continuousPlacedKw: toKw(best.placedModuleCount),
      dualPlacedModuleCount: 0,
      dualPlacedKw: 0,
      selectedPlacedModuleCount: best.placedModuleCount,
      selectedPlacedKw: toKw(best.placedModuleCount),
      innerTierGapM: layoutPolicy.innerTierGapM,
      dualArraySetAisleM: layoutPolicy.dualArraySetAisleM,
      roofContinuousRowGapM: layoutPolicy.roofContinuousRowGapM,
      selectedAzimuthDegrees: best.azimuthDeg,
    },
  };
}

export function simulateDualArray(input: {
  polygon: LatLngPoint[];
  targetCount: number;
  kind: "land" | "roof";
  maxFill?: boolean;
  roofToleranceM?: number;
}): ArrayLayoutResult | null {
  if (input.targetCount <= 0 || input.polygon.length < 3) return null;
  const useMaxFill =
    input.maxFill ?? (input.kind === "roof" && input.targetCount >= MAX_FILL_TARGET);
  const candidates = orientationCandidates(input.polygon, input.kind);
  const best = pickBestSimulation(
    candidates.map((candidate, orientationIndex) =>
      simulateDualAtOrientation({
        polygon: input.polygon,
        targetCount: input.targetCount,
        kind: input.kind,
        angleRad: candidate.angleRad,
        azimuthDeg: candidate.azimuthDeg,
        orientationIndex,
        maxFill: useMaxFill,
        roofToleranceM: input.roofToleranceM,
      }),
    ),
  );
  if (!best) return null;
  const roofFitting =
    input.kind === "roof"
      ? {
          ...buildModuleFittingDiagnostics("portrait"),
          ...buildRoofFittingPolicyDiagnostics({
            strictPlacedModuleCount: roofDualMaxFillAtTolerance(input.polygon, 0),
            edgeTolerancePlacedModuleCount: best.placedModuleCount,
          }),
        }
      : {};
  return {
    modules: best.modules,
    placedModuleCount: best.placedModuleCount,
    validSlotCount: best.validSlotCount,
    rowModuleCounts: best.rowModuleCounts,
    diagnostics: {
      layoutMode: "dual_array",
      layoutSelectionReason: "dual_required_continuous_ge_30kw",
      continuousPlacedModuleCount: 0,
      continuousPlacedKw: 0,
      dualPlacedModuleCount: best.placedModuleCount,
      dualPlacedKw: toKw(best.placedModuleCount),
      selectedPlacedModuleCount: best.placedModuleCount,
      selectedPlacedKw: toKw(best.placedModuleCount),
      innerTierGapM: layoutPolicy.innerTierGapM,
      dualArraySetAisleM: layoutPolicy.dualArraySetAisleM,
      roofContinuousRowGapM: layoutPolicy.roofContinuousRowGapM,
      selectedAzimuthDegrees: best.azimuthDeg,
      ...roofFitting,
    },
  };
}

export function resolveArrayLayout(input: {
  polygon: LatLngPoint[];
  targetCount: number;
  kind: "land" | "roof";
  forceMode?: ArrayLayoutMode;
}): ArrayLayoutResult {
  const emptyDiagnostics: ArrayLayoutDiagnostics = {
    layoutMode: "continuous_array",
    layoutSelectionReason: "layout_failed",
    continuousPlacedModuleCount: 0,
    continuousPlacedKw: 0,
    dualPlacedModuleCount: 0,
    dualPlacedKw: 0,
    selectedPlacedModuleCount: 0,
    selectedPlacedKw: 0,
    innerTierGapM: layoutPolicy.innerTierGapM,
    dualArraySetAisleM: layoutPolicy.dualArraySetAisleM,
    roofContinuousRowGapM: layoutPolicy.roofContinuousRowGapM,
  };

  if (input.targetCount <= 0 || input.polygon.length < 3) {
    return {
      modules: [],
      placedModuleCount: 0,
      validSlotCount: 0,
      rowModuleCounts: [],
      diagnostics: emptyDiagnostics,
    };
  }

  const continuousMaxFill =
    input.kind === "roof"
      ? (simulateRoofContinuousArray({ polygon: input.polygon, targetCount: MAX_FILL_TARGET })
          ?.placedModuleCount ?? 0)
      : 0;
  const dualMaxFill =
    input.kind === "roof"
      ? (simulateDualArray({
          polygon: input.polygon,
          targetCount: MAX_FILL_TARGET,
          kind: "roof",
          maxFill: true,
        })?.placedModuleCount ?? 0)
      : 0;
  const dualAtMaxFill =
    input.kind === "roof"
      ? simulateDualArray({
          polygon: input.polygon,
          targetCount: MAX_FILL_TARGET,
          kind: "roof",
          maxFill: true,
        })
      : null;
  const dualRowModuleCountsForDiagnostics = dualAtMaxFill?.rowModuleCounts;

  const continuous =
    input.kind === "roof"
      ? simulateRoofContinuousArray({
          polygon: input.polygon,
          targetCount: input.targetCount,
        })
      : simulateContinuousArray(input);
  const continuousCount = continuous?.placedModuleCount ?? 0;
  const continuousKw = toKw(continuousCount);
  const roofUnder30Kw = input.kind === "roof" && continuousMaxFill < ARRAY_MODE_THRESHOLD_MODULES;

  if (input.forceMode === "continuous_array") {
    if (input.kind === "roof") {
      return resolveRoofContinuousUnder30Kw({
        polygon: input.polygon,
        targetCount: input.targetCount,
        continuousMaxFill,
        dualMaxFill,
        dualRowModuleCounts: dualRowModuleCountsForDiagnostics,
      });
    }
    if (!continuous) {
      return {
        modules: [],
        placedModuleCount: 0,
        validSlotCount: 0,
        rowModuleCounts: [],
        diagnostics: emptyDiagnostics,
      };
    }
    return {
      ...continuous,
      diagnostics: withRoofDualDiagnostics(
        {
          ...continuous.diagnostics,
          continuousPlacedModuleCount: continuousCount,
          continuousPlacedKw: continuousKw,
          layoutSelectionReason: "continuous_under_30kw",
        },
        {
          kind: input.kind,
          rowModuleCounts: continuous.rowModuleCounts,
          continuousMaxFill,
          dualMaxFill,
          dualRowModuleCounts: dualRowModuleCountsForDiagnostics,
        },
      ),
    };
  }

  if (input.forceMode === "dual_array") {
    const dual =
      input.kind === "roof"
        ? simulateDualArray({
            polygon: input.polygon,
            targetCount: MAX_FILL_TARGET,
            kind: "roof",
            maxFill: true,
          })
        : simulateDualArray(input);
    if (dual) {
      return {
        ...dual,
        diagnostics: withRoofDualDiagnostics(
          {
            ...dual.diagnostics,
            continuousPlacedModuleCount: continuousCount,
            continuousPlacedKw: continuousKw,
            layoutSelectionReason: "dual_required_continuous_ge_30kw",
          },
          {
            kind: input.kind,
            rowModuleCounts: dual.rowModuleCounts,
            continuousMaxFill,
            dualMaxFill,
            dualRowModuleCounts: dualRowModuleCountsForDiagnostics,
          },
        ),
      };
    }
    if (continuous) {
      return {
        ...continuous,
        diagnostics: withRoofDualDiagnostics(
          {
            ...continuous.diagnostics,
            continuousPlacedModuleCount: continuousCount,
            continuousPlacedKw: continuousKw,
            dualPlacedModuleCount: 0,
            dualPlacedKw: 0,
            layoutSelectionReason: "dual_failed_fallback_continuous",
          },
          {
            kind: input.kind,
            rowModuleCounts: continuous.rowModuleCounts,
            continuousMaxFill,
            dualMaxFill,
            dualRowModuleCounts: dualRowModuleCountsForDiagnostics,
          },
        ),
      };
    }
    return {
      modules: [],
      placedModuleCount: 0,
      validSlotCount: 0,
      rowModuleCounts: [],
      diagnostics: emptyDiagnostics,
    };
  }

  if (roofUnder30Kw) {
    return resolveRoofContinuousUnder30Kw({
      polygon: input.polygon,
      targetCount: input.targetCount,
      continuousMaxFill,
      dualMaxFill,
      dualRowModuleCounts: dualRowModuleCountsForDiagnostics,
    });
  }

  if (input.kind === "land" && continuousCount < ARRAY_MODE_THRESHOLD_MODULES) {
    if (!continuous) {
      return {
        modules: [],
        placedModuleCount: 0,
        validSlotCount: 0,
        rowModuleCounts: [],
        diagnostics: emptyDiagnostics,
      };
    }
    return {
      ...continuous,
      diagnostics: withRoofDualDiagnostics(
        {
          ...continuous.diagnostics,
          continuousPlacedModuleCount: continuousCount,
          continuousPlacedKw: continuousKw,
          dualPlacedModuleCount: 0,
          dualPlacedKw: 0,
          layoutSelectionReason: "continuous_under_30kw",
        },
        {
          kind: input.kind,
          rowModuleCounts: continuous.rowModuleCounts,
          continuousMaxFill,
          dualMaxFill,
          dualRowModuleCounts: dualRowModuleCountsForDiagnostics,
        },
      ),
    };
  }

  const dual =
    input.kind === "roof"
      ? simulateDualArray({
          polygon: input.polygon,
          targetCount: MAX_FILL_TARGET,
          kind: "roof",
          maxFill: true,
        })
      : simulateDualArray(input);
  if (dual) {
    return {
      ...dual,
      diagnostics: withRoofDualDiagnostics(
        {
          ...dual.diagnostics,
          continuousPlacedModuleCount: continuousCount,
          continuousPlacedKw: continuousKw,
          dualPlacedModuleCount: dual.placedModuleCount,
          dualPlacedKw: toKw(dual.placedModuleCount),
          selectedPlacedModuleCount: dual.placedModuleCount,
          selectedPlacedKw: toKw(dual.placedModuleCount),
          layoutMode: "dual_array",
          layoutSelectionReason: "dual_required_continuous_ge_30kw",
        },
        {
          kind: input.kind,
          rowModuleCounts: dual.rowModuleCounts,
          continuousMaxFill,
          dualMaxFill,
          dualRowModuleCounts: dualRowModuleCountsForDiagnostics,
        },
      ),
    };
  }

  if (continuous) {
    return {
      ...continuous,
      diagnostics: withRoofDualDiagnostics(
        {
          ...continuous.diagnostics,
          continuousPlacedModuleCount: continuousCount,
          continuousPlacedKw: continuousKw,
          dualPlacedModuleCount: 0,
          dualPlacedKw: 0,
          layoutSelectionReason: "dual_failed_fallback_continuous",
        },
        {
          kind: input.kind,
          rowModuleCounts: continuous.rowModuleCounts,
          continuousMaxFill,
          dualMaxFill,
          dualRowModuleCounts: dualRowModuleCountsForDiagnostics,
        },
      ),
    };
  }

  return {
    modules: [],
    placedModuleCount: 0,
    validSlotCount: 0,
    rowModuleCounts: [],
    diagnostics: emptyDiagnostics,
  };
}
