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
  toLocal,
  type LocalPoint,
} from "@/lib/solar/polygonGeometry";
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

/** 장축 Row 순서로 유효 슬롯 채우기 — 목표 초과 시 경계 밖 배치 없음 */
function selectSlotsForTarget(
  slots: ModuleSlot[],
  targetCount: number,
  heightM: number,
): ModuleSlot[] {
  if (targetCount <= 0 || slots.length === 0) return [];
  if (slots.length <= targetCount) return slots;

  const selected: ModuleSlot[] = [];
  for (const row of groupSlotsByRow(slots, heightM)) {
    for (const slot of row) {
      selected.push(slot);
      if (selected.length >= targetCount) return selected;
    }
  }
  return selected;
}

/**
 * Polygon 전체 후보 스캔 → 4꼭짓점 검증 → Row 단위 배치.
 * 모듈 크기는 고정(visualScale) — 목표 수량 맞추려 축척을 키우지 않음.
 */
function placeModulesInFootprint(
  polygon: LatLngPoint[],
  targetCount: number,
  params: LayoutParams,
): ModuleRect[] {
  if (targetCount <= 0 || polygon.length < 3) return [];

  const oriented = toOrientedPoly(polygon);
  const scale = moduleLayoutConfig.visualScale;
  const widthM = moduleLayoutConfig.moduleShortM * scale;
  const heightM = moduleLayoutConfig.moduleLongM * scale;
  const rowGapM =
    params.mode === "row" ? getVisualRowSpacingM(params.kind, params.mode) : 0;

  const slots = collectValidSlots(oriented, widthM, heightM, rowGapM);
  const selected = selectSlotsForTarget(slots, targetCount, heightM);

  return selected.map((slot) =>
    makePortraitModuleRect(slot.x, slot.y, widthM, heightM, oriented.origin, oriented.angleRad),
  );
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

  const modules = placeModulesInFootprint(input.boundary, targetModuleCount, params);
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
      tiers: params.mode === "row" && params.kind === "land" ? 2 : 1,
      rowSpacingM: params.rowSpacingM,
      tiltDeg: params.tiltDeg,
      installType: input.installType,
    },
  };
}
