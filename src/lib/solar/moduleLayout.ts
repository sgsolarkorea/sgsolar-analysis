import type { InstallTypeOption } from "@/data/resultUx";
import {
  getVisualModuleDimensions,
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

function resolveModuleScale(
  polyArea: number,
  targetCount: number,
  mode: ModuleLayoutMode,
): number {
  const base = moduleLayoutConfig.visualScale;
  const moduleUnitArea = moduleLayoutConfig.moduleShortM * moduleLayoutConfig.moduleLongM;
  const fillTarget = mode === "flush" ? 0.9 : 0.875;
  const ideal = Math.sqrt((polyArea * fillTarget) / Math.max(targetCount * moduleUnitArea, 1));
  return Math.min(Math.max(ideal, base * 0.82), base * 1.18);
}

function moduleFitsInPolygon(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  localPoly: LocalPoint[],
): boolean {
  const center = { x: x + widthM / 2, y: y + heightM / 2 };
  if (pointInPolygon(center, localPoly)) return true;

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

function trimSlotsToTarget(slots: ModuleSlot[], targetCount: number): ModuleSlot[] {
  if (slots.length <= targetCount) return slots;
  const skip = Math.floor((slots.length - targetCount) / 2);
  return slots.slice(skip, skip + targetCount);
}

function selectSpreadSlots(slots: ModuleSlot[], targetCount: number): ModuleSlot[] {
  if (slots.length <= targetCount) return slots;

  const selected: ModuleSlot[] = [];
  const step = slots.length / targetCount;
  for (let i = 0; i < targetCount; i++) {
    const index = Math.min(Math.floor(i * step + step / 2), slots.length - 1);
    selected.push(slots[index]);
  }
  return selected;
}

function countSlotsAtScale(
  oriented: OrientedPoly,
  scale: number,
  params: LayoutParams,
): ModuleSlot[] {
  const widthM = moduleLayoutConfig.moduleShortM * scale;
  const heightM = moduleLayoutConfig.moduleLongM * scale;
  const rowGapM =
    params.mode === "row" ? getVisualRowSpacingM(params.kind, params.mode) : 0;
  return collectValidSlots(oriented, widthM, heightM, rowGapM);
}

function findOptimalScale(
  oriented: OrientedPoly,
  targetCount: number,
  params: LayoutParams,
  polyArea: number,
): number {
  const base = moduleLayoutConfig.visualScale;
  let lo = base * 0.72;
  let hi = base * 1.22;
  let best = resolveModuleScale(polyArea, targetCount, params.mode);

  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    const slots = countSlotsAtScale(oriented, mid, params);

    if (slots.length >= targetCount) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  let refined = best;
  for (let step = 0; step < 12; step++) {
    const next = refined * 1.015;
    const slots = countSlotsAtScale(oriented, next, params);
    if (slots.length >= targetCount) {
      refined = next;
    } else {
      break;
    }
  }

  return refined;
}

/**
 * 사용 가능 영역 전체를 행 단위로 스캔하며 목표 모듈수 배치.
 * 통판형: 모듈 밀착·행간 없음. Row: 행 내 밀착·행 간만 이격.
 */
function placeModulesInFootprint(
  polygon: LatLngPoint[],
  targetCount: number,
  params: LayoutParams,
): ModuleRect[] {
  if (targetCount <= 0 || polygon.length < 3) return [];

  const oriented = toOrientedPoly(polygon);
  const polyArea = polygonAreaSqm(polygon);
  const scale = findOptimalScale(oriented, targetCount, params, polyArea);
  const widthM = moduleLayoutConfig.moduleShortM * scale;
  const heightM = moduleLayoutConfig.moduleLongM * scale;
  const rowGapM =
    params.mode === "row" ? getVisualRowSpacingM(params.kind, params.mode) : 0;

  const slots = collectValidSlots(oriented, widthM, heightM, rowGapM);
  const selected =
    params.mode === "row"
      ? selectSpreadSlots(slots, targetCount)
      : trimSlotsToTarget(slots, targetCount);

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
      : { lat: 0, lng: 0 };

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
