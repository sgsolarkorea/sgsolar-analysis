import type { InstallTypeOption } from "@/data/resultUx";
import {
  getVisualRowSpacingM,
  moduleLayoutConfig,
  resolveModuleLayoutKind,
  resolveModuleLayoutMode,
  type ModuleLayoutInstallKind,
  type ModuleLayoutMode,
} from "@/data/moduleLayoutConfig";
import { areaPerKwByType, modulePowerW } from "@/data/solarConfig";
import { installTypeToCategory } from "@/lib/solar/calculate";
import {
  computeOrientedBounds,
  computePolygonOrientation,
  localToGeo,
  pointInPolygon,
  polygonAreaSqm,
  toLocal,
  type LocalPoint,
} from "@/lib/solar/polygonGeometry";
import { placeLandBlockLayout, type LandBlockPlacementDiagnostics } from "@/lib/solar/landBlockLayout";
import type {
  LatLngPoint,
  ModuleLayoutPolygonSource,
  ModuleLayoutResult,
  ModuleRect,
} from "@/types/moduleLayout";

interface LayoutParams {
  kind: ModuleLayoutInstallKind;
  mode: ModuleLayoutMode;
  rowSpacingM: number;
  tiltDeg: number;
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

function getLayoutParams(
  installType: InstallTypeOption | string,
  capacityKw: number,
): LayoutParams {
  const kind = resolveModuleLayoutKind(installType);
  const mode = resolveModuleLayoutMode(installType, capacityKw);
  const spec = moduleLayoutConfig[kind];
  return { kind, mode, rowSpacingM: spec.rowSpacingM, tiltDeg: spec.tiltDeg };
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

function toOrientedPoly(polygon: LatLngPoint[]): OrientedPoly {
  const origin = computeOrientedBounds(polygon).origin;
  const angleRad = computePolygonOrientation(polygon);
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

/** 모듈 4꼭짓점 모두 Polygon 내부 — 외부·도로 침범 방지 */
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

function selectCentered(slots: ModuleSlot[], count: number): ModuleSlot[] {
  if (count <= 0 || slots.length === 0) return [];
  if (slots.length <= count) return [...slots];
  const start = Math.floor((slots.length - count) / 2);
  return slots.slice(start, start + count);
}

function polygonLocalCentroid(localPoly: LocalPoint[]): LocalPoint {
  let sx = 0;
  let sy = 0;
  for (const p of localPoly) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / localPoly.length, y: sy / localPoly.length };
}

function distributeRowQuotas(rowCaps: number[], target: number): number[] {
  const total = rowCaps.reduce((a, b) => a + b, 0);
  if (total === 0) return rowCaps.map(() => 0);
  const effective = Math.min(target, total);
  const quotas = rowCaps.map((cap) => Math.floor((cap / total) * effective));
  let assigned = quotas.reduce((a, b) => a + b, 0);
  const order = rowCaps.map((cap, i) => ({ i, cap })).sort((a, b) => b.cap - a.cap);
  let qi = 0;
  while (assigned < effective) {
    quotas[order[qi % order.length].i]++;
    assigned++;
    qi++;
  }
  return quotas;
}

export interface RoofPlacementDiagnostics {
  roofFillStrategy: "centered" | "distributed";
  roofCenteringApplied: boolean;
  roofUnusedAreaRatio: number;
  selectedSlotBoundingBox: { minX: number; maxX: number; minY: number; maxY: number };
  roofPolygonBoundingBox: { minX: number; maxX: number; minY: number; maxY: number };
  centerOffsetM: number;
  sequentialFillRejectedReason: string;
}

interface BBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function slotsBBox(slots: ModuleSlot[], widthM: number, heightM: number): BBox {
  if (slots.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  const xs = slots.flatMap((s) => [s.x, s.x + widthM]);
  const ys = slots.flatMap((s) => [s.y, s.y + heightM]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function bboxCenter(b: BBox): LocalPoint {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

/** 지붕 Polygon 중심 기준 균등·중앙 배치 — 좌하단 순차 채우기 금지 */
function selectSlotsRoofCentered(
  slots: ModuleSlot[],
  targetCount: number,
  heightM: number,
  localPoly: LocalPoint[],
  widthM: number,
): { selected: ModuleSlot[]; rowModuleCounts: number[]; diagnostics: RoofPlacementDiagnostics } {
  const emptyDiag: RoofPlacementDiagnostics = {
    roofFillStrategy: "centered",
    roofCenteringApplied: false,
    roofUnusedAreaRatio: 1,
    selectedSlotBoundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    roofPolygonBoundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    centerOffsetM: 0,
    sequentialFillRejectedReason: "bottom-left-sequential-fill-not-used",
  };

  if (targetCount <= 0 || slots.length === 0) {
    return { selected: [], rowModuleCounts: [], diagnostics: emptyDiag };
  }

  const centroid = polygonLocalCentroid(localPoly);
  const rows = groupSlotsByRow(slots, heightM);
  const rowsByCentrality = rows
    .map((row) => ({
      row,
      distY: Math.abs((row[0]?.y ?? 0) + heightM / 2 - centroid.y),
    }))
    .sort((a, b) => a.distY - b.distY);

  const rowCaps = rowsByCentrality.map((r) => r.row.length);
  const quotas = distributeRowQuotas(rowCaps, targetCount);

  const selected: ModuleSlot[] = [];
  const rowModuleCounts: number[] = [];

  for (let i = 0; i < rowsByCentrality.length; i++) {
    const quota = quotas[i];
    if (quota <= 0) continue;
    const row = rowsByCentrality[i].row;
    const sortedByX = [...row].sort((a, b) => a.x - b.x);
    const pick = selectCentered(sortedByX, quota);
    selected.push(...pick);
    rowModuleCounts.push(pick.length);
  }

  const polyBBox = {
    minX: Math.min(...localPoly.map((p) => p.x)),
    maxX: Math.max(...localPoly.map((p) => p.x)),
    minY: Math.min(...localPoly.map((p) => p.y)),
    maxY: Math.max(...localPoly.map((p) => p.y)),
  };
  const selBBox = slotsBBox(selected, widthM, heightM);
  const polyCenter = bboxCenter(polyBBox);
  const selCenter = bboxCenter(selBBox);
  const centerOffsetM = Math.hypot(selCenter.x - polyCenter.x, selCenter.y - polyCenter.y);

  const polyArea = (polyBBox.maxX - polyBBox.minX) * (polyBBox.maxY - polyBBox.minY) || 1;
  const selArea =
    (selBBox.maxX - selBBox.minX) * (selBBox.maxY - selBBox.minY) || 0;

  return {
    selected,
    rowModuleCounts,
    diagnostics: {
      roofFillStrategy: "centered",
      roofCenteringApplied: true,
      roofUnusedAreaRatio: Math.round((1 - selArea / polyArea) * 1000) / 1000,
      selectedSlotBoundingBox: selBBox,
      roofPolygonBoundingBox: polyBBox,
      centerOffsetM: Math.round(centerOffsetM * 100) / 100,
      sequentialFillRejectedReason: "bottom-left-sequential-fill-not-used",
    },
  };
}

function moduleRectsFootprintSqm(modules: ModuleRect[]): number {
  let total = 0;
  for (const mod of modules) {
    const origin = mod.corners[0];
    const local = toLocal([...mod.corners], origin);
    let sum = 0;
    for (let i = 0; i < local.length; i++) {
      const j = (i + 1) % local.length;
      sum += local[i].x * local[j].y - local[j].x * local[i].y;
    }
    total += Math.abs(sum) / 2;
  }
  return total;
}

interface FootprintPlacement {
  modules: ModuleRect[];
  validSlotCount: number;
  rowModuleCounts: number[];
  roofDiagnostics?: RoofPlacementDiagnostics;
}

/**
 * Polygon 전체 후보 스캔 → 4꼭짓점 검증 → Row 단위 배치.
 * 모듈 크기는 고정(visualScale) — 목표 수량 맞추려 축척을 키우지 않음.
 */
function placeModulesInFootprint(
  polygon: LatLngPoint[],
  targetCount: number,
  params: LayoutParams,
): FootprintPlacement {
  if (targetCount <= 0 || polygon.length < 3) {
    return { modules: [], validSlotCount: 0, rowModuleCounts: [] };
  }

  const oriented = toOrientedPoly(polygon);
  const scale = moduleLayoutConfig.visualScale;
  const widthM = moduleLayoutConfig.moduleShortM * scale;
  const heightM = moduleLayoutConfig.moduleLongM * scale;
  const rowGapM =
    params.mode === "row" ? getVisualRowSpacingM(params.kind, params.mode) : 0;

  const slots = collectValidSlots(oriented, widthM, heightM, rowGapM);
  const { selected, rowModuleCounts, diagnostics } = selectSlotsRoofCentered(
    slots,
    targetCount,
    heightM,
    oriented.localPoly,
    widthM,
  );

  const modules = selected.map((slot) =>
    makePortraitModuleRect(slot.x, slot.y, widthM, heightM, oriented.origin, oriented.angleRad),
  );

  return {
    modules,
    validSlotCount: slots.length,
    rowModuleCounts,
    roofDiagnostics: diagnostics,
  };
}

export function createVirtualParcelRectangle(
  center: LatLngPoint,
  capacityKw: number,
  installType: InstallTypeOption | string,
): LatLngPoint[] {
  const category = installTypeToCategory(installType as InstallTypeOption);
  const areaSqm = Math.max(capacityKw * areaPerKwByType[category], 200);
  const aspect = 1.55;
  const heightM = Math.sqrt(areaSqm / aspect);
  const widthM = areaSqm / heightM;
  const halfW = widthM / 2;
  const halfH = heightM / 2;

  const corners: LocalPoint[] = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];

  return corners.map((c) => localToGeo(c, center, 0));
}

export function computeModuleLayout(input: {
  boundary: LatLngPoint[];
  polygonSource: ModuleLayoutPolygonSource;
  capacityKw: number;
  installType: InstallTypeOption | string;
  moduleCount?: number;
  centerLat?: number;
  centerLng?: number;
}): ModuleLayoutResult {
  const params = getLayoutParams(input.installType, input.capacityKw);
  const targetModuleCount =
    input.moduleCount != null && input.moduleCount > 0
      ? Math.floor(input.moduleCount)
      : Math.max(0, Math.floor((input.capacityKw * 1000) / modulePowerW));

  let modules: ModuleRect[];
  let validSlotCount: number;
  let rowModuleCounts: number[];
  let landDiagnostics: LandBlockPlacementDiagnostics | undefined;
  let roofDiagnostics: RoofPlacementDiagnostics | undefined;

  if (params.kind === "land") {
    const landResult = placeLandBlockLayout(
      input.boundary,
      targetModuleCount,
      { kind: "land", mode: params.mode, rowSpacingM: params.rowSpacingM },
      input.capacityKw,
    );
    modules = landResult.modules;
    validSlotCount = landResult.validSlotCount;
    rowModuleCounts = landResult.rowModuleCounts;
    landDiagnostics = landResult.diagnostics;
  } else {
    const legacy = placeModulesInFootprint(input.boundary, targetModuleCount, params);
    modules = legacy.modules;
    validSlotCount = legacy.validSlotCount;
    rowModuleCounts = legacy.rowModuleCounts;
    roofDiagnostics = legacy.roofDiagnostics;
  }
  const usableAreaSqm = polygonAreaSqm(input.boundary);
  const footprintSqm = moduleRectsFootprintSqm(modules);
  const polygonUtilizationPct =
    usableAreaSqm > 0 ? Math.round((footprintSqm / usableAreaSqm) * 1000) / 10 : 0;

  const origin =
    input.boundary.length >= 3
      ? computeOrientedBounds(input.boundary).origin
      : {
          lat: input.centerLat ?? 0,
          lng: input.centerLng ?? 0,
        };

  let bounds = {
    minLat: Infinity,
    maxLat: -Infinity,
    minLng: Infinity,
    maxLng: -Infinity,
  };
  for (const point of input.boundary) {
    bounds.minLat = Math.min(bounds.minLat, point.lat);
    bounds.maxLat = Math.max(bounds.maxLat, point.lat);
    bounds.maxLng = Math.max(bounds.maxLng, point.lng);
    bounds.minLng = Math.min(bounds.minLng, point.lng);
  }
  for (const mod of modules) {
    for (const corner of mod.corners) {
      bounds.minLat = Math.min(bounds.minLat, corner.lat);
      bounds.maxLat = Math.max(bounds.maxLat, corner.lat);
      bounds.minLng = Math.min(bounds.minLng, corner.lng);
      bounds.maxLng = Math.max(bounds.maxLng, corner.lng);
    }
  }

  return {
    boundary: input.boundary,
    modules,
    center: origin,
    bounds,
    polygonSource: input.polygonSource,
    stats: {
      capacityKw: input.capacityKw,
      targetModuleCount,
      placedModuleCount: modules.length,
      modulePowerW: moduleLayoutConfig.modulePowerW,
      layoutMode: params.mode,
      tiers: landDiagnostics?.layoutTier === "double" ? 2 : params.mode === "row" && params.kind === "land" ? 2 : 1,
      rowSpacingM: params.rowSpacingM,
      tiltDeg: params.tiltDeg,
      installType: input.installType,
      validSlotCount,
      layoutRowCount: rowModuleCounts.length,
      rowModuleCounts,
      polygonUtilizationPct,
      layoutTier: landDiagnostics?.layoutTier,
      blockCount: landDiagnostics?.blockCount,
      blockModuleCounts: landDiagnostics?.blockModuleCounts,
      selectedAzimuthDegrees: landDiagnostics?.selectedAzimuthDegrees,
      capacityLayoutRule: landDiagnostics?.capacityLayoutRule,
    },
    landLayoutDiagnostics: landDiagnostics,
    roofLayoutDiagnostics: roofDiagnostics,
  };
}
