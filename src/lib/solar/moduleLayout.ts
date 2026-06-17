import type { InstallTypeOption } from "@/data/resultUx";
import {
  getVisualModuleDimensions,
  moduleLayoutConfig,
  resolveModuleLayoutKind,
  type ModuleLayoutInstallKind,
} from "@/data/moduleLayoutConfig";
import { areaPerKwByType, modulePowerW } from "@/data/solarConfig";
import { installTypeToCategory } from "@/lib/solar/calculate";
import type {
  LatLngPoint,
  ModuleLayoutPolygonSource,
  ModuleLayoutResult,
  ModuleRect,
} from "@/types/moduleLayout";

const M_PER_DEG_LAT = 110_540;

function mPerDegLng(lat: number): number {
  return 111_320 * Math.cos((lat * Math.PI) / 180);
}

interface LocalPoint {
  x: number;
  y: number;
}

interface LayoutParams {
  kind: ModuleLayoutInstallKind;
  rowSpacingM: number;
  tiltDeg: number;
}

function getLayoutParams(installType: InstallTypeOption | string): LayoutParams {
  const kind = resolveModuleLayoutKind(installType);
  const spec = moduleLayoutConfig[kind];
  return { kind, rowSpacingM: spec.rowSpacingM, tiltDeg: spec.tiltDeg };
}

function toLocal(ring: LatLngPoint[], origin: LatLngPoint): LocalPoint[] {
  const lngScale = mPerDegLng(origin.lat);
  return ring.map((point) => ({
    x: (point.lng - origin.lng) * lngScale,
    y: (point.lat - origin.lat) * M_PER_DEG_LAT,
  }));
}

function toLatLng(local: LocalPoint, origin: LatLngPoint): LatLngPoint {
  const lngScale = mPerDegLng(origin.lat);
  return {
    lat: origin.lat + local.y / M_PER_DEG_LAT,
    lng: origin.lng + local.x / lngScale,
  };
}

function centroid(ring: LatLngPoint[]): LatLngPoint {
  let sumLat = 0;
  let sumLng = 0;
  for (const point of ring) {
    sumLat += point.lat;
    sumLng += point.lng;
  }
  return { lat: sumLat / ring.length, lng: sumLng / ring.length };
}

function boundsFromRing(ring: LatLngPoint[]): ModuleLayoutResult["bounds"] {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const point of ring) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }
  return { minLat, maxLat, minLng, maxLng };
}

function expandBounds(
  bounds: ModuleLayoutResult["bounds"],
  ring: LatLngPoint[],
): ModuleLayoutResult["bounds"] {
  const extra = boundsFromRing(ring);
  return {
    minLat: Math.min(bounds.minLat, extra.minLat),
    maxLat: Math.max(bounds.maxLat, extra.maxLat),
    minLng: Math.min(bounds.minLng, extra.minLng),
    maxLng: Math.max(bounds.maxLng, extra.maxLng),
  };
}

function pointInPolygon(point: LocalPoint, polygon: LocalPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function makePortraitModuleRect(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  origin: LatLngPoint,
): ModuleRect {
  const localCorners: LocalPoint[] = [
    { x, y },
    { x: x + widthM, y },
    { x: x + widthM, y: y + heightM },
    { x, y: y + heightM },
  ];
  return {
    corners: localCorners.map((corner) => toLatLng(corner, origin)) as ModuleRect["corners"],
  };
}

/** 행(Row) 단위 배치 — 목표 모듈수 우선, 마지막 행 부분 채움 허용 */
function placeModulesRowBased(
  polygon: LatLngPoint[],
  targetCount: number,
  params: LayoutParams,
  origin: LatLngPoint,
): ModuleRect[] {
  if (targetCount <= 0) return [];

  const { widthM, heightM, colGapM, rowGapM } = getVisualModuleDimensions();
  const visualRowGap = rowGapM + params.rowSpacingM * moduleLayoutConfig.visualScale * 0.15;

  const localPoly = toLocal(polygon, origin);
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

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const polyWidth = Math.max(maxX - minX - moduleLayoutConfig.boundaryInsetM * 2, widthM * 2);

  let modulesPerRow = Math.max(
    3,
    Math.min(
      moduleLayoutConfig.defaultModulesPerRow,
      Math.floor((polyWidth + colGapM) / (widthM + colGapM)),
    ),
  );

  const totalRows = Math.ceil(targetCount / modulesPerRow);
  const gridHeight = totalRows * heightM + Math.max(0, totalRows - 1) * visualRowGap;
  let startY = centerY - gridHeight / 2;

  const modules: ModuleRect[] = [];

  for (let row = 0; row < totalRows && modules.length < targetCount; row += 1) {
    const remaining = targetCount - modules.length;
    const countThisRow = Math.min(modulesPerRow, remaining);
    const rowWidth = countThisRow * widthM + Math.max(0, countThisRow - 1) * colGapM;
    let startX = centerX - rowWidth / 2;
    const y = startY + row * (heightM + visualRowGap);

    for (let col = 0; col < countThisRow; col += 1) {
      const x = startX + col * (widthM + colGapM);
      const center = { x: x + widthM / 2, y: y + heightM / 2 };
      const inside = pointInPolygon(center, localPoly);

      if (inside || modules.length >= Math.floor(targetCount * 0.85)) {
        modules.push(makePortraitModuleRect(x, y, widthM, heightM, origin));
      }
    }
  }

  if (modules.length < targetCount) {
    modulesPerRow = Math.max(3, Math.min(modulesPerRow + 2, targetCount));
    const retryRows = Math.ceil(targetCount / modulesPerRow);
    const retryHeight = retryRows * heightM + Math.max(0, retryRows - 1) * visualRowGap;
    startY = centerY - retryHeight / 2;
    modules.length = 0;

    for (let row = 0; row < retryRows && modules.length < targetCount; row += 1) {
      const remaining = targetCount - modules.length;
      const countThisRow = Math.min(modulesPerRow, remaining);
      const rowWidth = countThisRow * widthM + Math.max(0, countThisRow - 1) * colGapM;
      const startX = centerX - rowWidth / 2;
      const y = startY + row * (heightM + visualRowGap);

      for (let col = 0; col < countThisRow; col += 1) {
        const x = startX + col * (widthM + colGapM);
        modules.push(makePortraitModuleRect(x, y, widthM, heightM, origin));
      }
    }
  }

  return modules.slice(0, targetCount);
}

export function createVirtualParcelRectangle(
  center: LatLngPoint,
  capacityKw: number,
  installType: InstallTypeOption | string,
): LatLngPoint[] {
  const category = installTypeToCategory(installType as InstallTypeOption);
  const areaSqm = Math.max(capacityKw * areaPerKwByType[category], 120);
  const aspect = 1.6;
  const heightM = Math.sqrt(areaSqm / aspect);
  const widthM = areaSqm / heightM;
  const halfW = widthM / 2;
  const halfH = heightM / 2;

  return [
    toLatLng({ x: -halfW, y: -halfH }, center),
    toLatLng({ x: halfW, y: -halfH }, center),
    toLatLng({ x: halfW, y: halfH }, center),
    toLatLng({ x: -halfW, y: halfH }, center),
  ];
}

export function computeModuleLayout(input: {
  boundary: LatLngPoint[];
  polygonSource: ModuleLayoutPolygonSource;
  capacityKw: number;
  installType: InstallTypeOption | string;
  moduleCount?: number;
}): ModuleLayoutResult {
  const params = getLayoutParams(input.installType);
  const targetModuleCount =
    input.moduleCount != null && input.moduleCount > 0
      ? Math.floor(input.moduleCount)
      : Math.max(0, Math.floor((input.capacityKw * 1000) / modulePowerW));

  const origin = centroid(input.boundary);
  const modules = placeModulesRowBased(
    input.boundary,
    targetModuleCount,
    params,
    origin,
  );

  let bounds = boundsFromRing(input.boundary);
  for (const mod of modules) {
    bounds = expandBounds(bounds, mod.corners);
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
      tiers: moduleLayoutConfig.tiers,
      rowSpacingM: params.rowSpacingM,
      tiltDeg: params.tiltDeg,
      installType: input.installType,
    },
  };
}
