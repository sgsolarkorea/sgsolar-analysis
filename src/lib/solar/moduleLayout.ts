import type { InstallTypeOption } from "@/data/resultUx";
import {
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

function rectInsidePolygon(corners: LocalPoint[], polygon: LocalPoint[]): boolean {
  return corners.every((corner) => pointInPolygon(corner, polygon));
}

function makeModuleRect(
  x: number,
  y: number,
  lengthM: number,
  depthM: number,
  origin: LatLngPoint,
): ModuleRect {
  const localCorners: LocalPoint[] = [
    { x, y },
    { x: x + lengthM, y },
    { x: x + lengthM, y: y + depthM },
    { x, y: y + depthM },
  ];
  return {
    corners: localCorners.map((corner) => toLatLng(corner, origin)) as ModuleRect["corners"],
  };
}

function moduleUnitDepth(): number {
  const { tiers, moduleWidthM, tierGapM } = moduleLayoutConfig;
  return tiers * moduleWidthM + (tiers - 1) * tierGapM;
}

function placeModulesInPolygon(
  polygon: LatLngPoint[],
  targetCount: number,
  params: LayoutParams,
  origin: LatLngPoint,
): ModuleRect[] {
  const localPoly = toLocal(polygon, origin);
  const inset = moduleLayoutConfig.boundaryInsetM;
  const lengthM = moduleLayoutConfig.moduleLengthM;
  const depthM = moduleUnitDepth();
  const colGap = moduleLayoutConfig.colGapM;
  const rowPitch = params.rowSpacingM;

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

  minX += inset;
  minY += inset;
  maxX -= inset;
  maxY -= inset;

  const modules: ModuleRect[] = [];
  const polyWidth = maxX - minX;
  const polyHeight = maxY - minY;
  const placeAlongX = polyWidth >= polyHeight;

  const rowStep = placeAlongX ? rowPitch : lengthM + colGap;
  const colStep = placeAlongX ? lengthM + colGap : rowPitch;
  const unitW = placeAlongX ? lengthM : depthM;
  const unitH = placeAlongX ? depthM : lengthM;

  for (let row = 0; row * rowStep + unitH <= polyHeight + 0.01; row += 1) {
    for (let col = 0; col * colStep + unitW <= polyWidth + 0.01; col += 1) {
      if (modules.length >= targetCount) return modules;

      const baseX = minX + col * colStep;
      const baseY = minY + row * rowStep;
      const corners: LocalPoint[] = [
        { x: baseX, y: baseY },
        { x: baseX + unitW, y: baseY },
        { x: baseX + unitW, y: baseY + unitH },
        { x: baseX, y: baseY + unitH },
      ];

      if (rectInsidePolygon(corners, localPoly)) {
        modules.push(makeModuleRect(baseX, baseY, unitW, unitH, origin));
      }
    }
  }

  return modules;
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
  const origin = center;
  const halfW = widthM / 2;
  const halfH = heightM / 2;

  return [
    toLatLng({ x: -halfW, y: -halfH }, origin),
    toLatLng({ x: halfW, y: -halfH }, origin),
    toLatLng({ x: halfW, y: halfH }, origin),
    toLatLng({ x: -halfW, y: halfH }, origin),
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
  const modules = placeModulesInPolygon(
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
