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
  const angleRad = computePolygonOrientation(polygon);
  return toOrientedPolyAtAngle(polygon, angleRad);
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

function selectContiguousCentered(slots: ModuleSlot[], count: number): ModuleSlot[] {
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

function distributeRoofBandQuotas(rowCaps: number[], target: number): number[] {
  const quotas = rowCaps.map(() => 0);
  let remaining = Math.min(target, rowCaps.reduce((sum, cap) => sum + cap, 0));
  const order = rowCaps
    .map((cap, i) => ({ cap, i }))
    .sort((a, b) => b.cap - a.cap || a.i - b.i);

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

  const rows = groupSlotsByRow(slots, heightM);
  const polyBBox = {
    minX: Math.min(...localPoly.map((p) => p.x)),
    maxX: Math.max(...localPoly.map((p) => p.x)),
    minY: Math.min(...localPoly.map((p) => p.y)),
    maxY: Math.max(...localPoly.map((p) => p.y)),
  };
  const polyCenter = bboxCenter(polyBBox);

  let best:
    | {
        selected: ModuleSlot[];
        rowModuleCounts: number[];
        score: number;
      }
    | null = null;

  for (let start = 0; start < rows.length; start++) {
    for (let end = start; end < rows.length; end++) {
      const band = rows.slice(start, end + 1);
      const rowCaps = band.map((row) => row.length);
      const capacity = rowCaps.reduce((sum, cap) => sum + cap, 0);
      if (capacity < targetCount) continue;

      const quotas = distributeRoofBandQuotas(rowCaps, targetCount);
      const selected: ModuleSlot[] = [];
      const rowModuleCounts: number[] = [];

      for (let i = 0; i < band.length; i++) {
        const quota = quotas[i];
        if (quota <= 0) continue;
        const sortedByX = [...band[i]].sort((a, b) => a.x - b.x);
        const pick = selectContiguousCentered(sortedByX, quota);
        selected.push(...pick);
        rowModuleCounts.push(pick.length);
      }

      const selBBox = slotsBBox(selected, widthM, heightM);
      const selCenter = bboxCenter(selBBox);
      const selectedW = Math.max(selBBox.maxX - selBBox.minX, 0.01);
      const selectedH = Math.max(selBBox.maxY - selBBox.minY, 0.01);
      const polyW = Math.max(polyBBox.maxX - polyBBox.minX, 0.01);
      const centerOffsetM = Math.hypot(selCenter.x - polyCenter.x, selCenter.y - polyCenter.y);
      const rowCount = rowModuleCounts.length;
      const avgPerRow = selected.length / Math.max(rowCount, 1);
      const minRowFill = Math.min(
        ...rowModuleCounts.map((count, i) => count / Math.max(rowCaps[i] ?? count, 1)),
      );
      const widthCoverage = selectedW / polyW;

      let score = selected.length * 1000;
      score -= centerOffsetM * 120;
      score += avgPerRow * 520;
      score += widthCoverage * 2500;
      score += minRowFill * 1200;
      score -= rowCount * 70;
      score -= Math.abs(selectedW / Math.max(selectedH, 0.01) - 3.2) * 80;
      if (rowCount > 6) score -= 2500;
      if (avgPerRow < 8) score -= 3500;

      if (!best || score > best.score) {
        best = { selected, rowModuleCounts, score };
      }
    }
  }

  const selected = best?.selected ?? [];
  const rowModuleCounts = best?.rowModuleCounts ?? [];
  const selBBox = slotsBBox(selected, widthM, heightM);
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
  const orientationCandidates = [oriented.angleRad, oriented.angleRad + Math.PI / 2];
  const scale = params.kind === "roof" ? 0.66 : moduleLayoutConfig.visualScale;
  const widthM = moduleLayoutConfig.moduleShortM * scale;
  const heightM = moduleLayoutConfig.moduleLongM * scale;
  const rowGapM =
    params.kind === "roof"
      ? 0.25
      : params.mode === "row"
        ? getVisualRowSpacingM(params.kind, params.mode)
        : 0;

  let best:
    | {
        oriented: OrientedPoly;
        slots: ModuleSlot[];
        selected: ModuleSlot[];
        rowModuleCounts: number[];
        diagnostics: RoofPlacementDiagnostics;
        score: number;
      }
    | null = null;

  for (let orientationIndex = 0; orientationIndex < orientationCandidates.length; orientationIndex++) {
    const angleRad = orientationCandidates[orientationIndex];
    const candidate = toOrientedPolyAtAngle(polygon, angleRad);
    const slots = collectValidSlots(candidate, widthM, heightM, rowGapM);
    const { selected, rowModuleCounts, diagnostics } = selectSlotsRoofCentered(
      slots,
      targetCount,
      heightM,
      candidate.localPoly,
      widthM,
    );
    const bbox = diagnostics.selectedSlotBoundingBox;
    const selectedW = Math.max(bbox.maxX - bbox.minX, 0.01);
    const selectedH = Math.max(bbox.maxY - bbox.minY, 0.01);
    const aspect = Math.max(selectedW, selectedH) / Math.max(Math.min(selectedW, selectedH), 0.01);
    const rowCount = rowModuleCounts.length;
    const avgPerRow = selected.length / Math.max(rowCount, 1);
    const maxRowShare = Math.max(...rowModuleCounts, 0) / Math.max(selected.length, 1);
    let score = selected.length * 1000;
    if (selected.length >= targetCount) score += 1000;
    score -= Math.abs(selected.length - targetCount) * 200;
    score -= diagnostics.centerOffsetM * 80;
    score += avgPerRow * 260;
    score -= rowCount * 45;
    score -= aspect * 80;
    if (params.kind === "roof" && orientationIndex === 1) score += 6000;
    if (rowCount <= 1 || rowCount > 12 || avgPerRow < 4 || maxRowShare > 0.65) score -= 2000;

    if (!best || score > best.score) {
      best = { oriented: candidate, slots, selected, rowModuleCounts, diagnostics, score };
    }
  }

  const placement = best ?? {
    oriented,
    slots: [],
    selected: [],
    rowModuleCounts: [],
    diagnostics: selectSlotsRoofCentered([], targetCount, heightM, oriented.localPoly, widthM).diagnostics,
    score: -Infinity,
  };

  const modules = placement.selected.map((slot) =>
    makePortraitModuleRect(
      slot.x,
      slot.y,
      widthM,
      heightM,
      placement.oriented.origin,
      placement.oriented.angleRad,
    ),
  );

  return {
    modules,
    validSlotCount: placement.slots.length,
    rowModuleCounts: placement.rowModuleCounts,
    roofDiagnostics: placement.diagnostics,
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
