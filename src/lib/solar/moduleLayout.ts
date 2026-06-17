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
  mode: ModuleLayoutMode;
  rowSpacingM: number;
  tiltDeg: number;
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

function polygonExtents(localPoly: LocalPoint[]) {
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
  return { minX, maxX, minY, maxY };
}

function maxModulesPerRow(
  polyWidth: number,
  widthM: number,
  colGapM: number,
  fallback: number,
): number {
  const fit = Math.floor((polyWidth + colGapM) / (widthM + colGapM));
  return Math.max(3, fit > 0 ? fit : fallback);
}

function buildRowCounts(targetCount: number, modulesPerRow: number): number[] {
  const rows: number[] = [];
  let remaining = targetCount;
  while (remaining > 0) {
    rows.push(Math.min(modulesPerRow, remaining));
    remaining -= rows[rows.length - 1];
  }
  return rows;
}

/**
 * 통판형 / Row 공통 — 행 단위 배치.
 * - 통판형: 모듈끼리 최소 간격, 행 간도 좁게
 * - Row: 행 내 모듈 밀착, 행 간만 이격
 */
function placeModules(
  polygon: LatLngPoint[],
  targetCount: number,
  params: LayoutParams,
  origin: LatLngPoint,
): ModuleRect[] {
  if (targetCount <= 0) return [];

  const { widthM, heightM, colGapM } = getVisualModuleDimensions(params.mode);
  const rowGapM =
    params.mode === "row"
      ? getVisualRowSpacingM(params.kind, params.mode)
      : getVisualModuleDimensions(params.mode).rowGapM;

  const localPoly = toLocal(polygon, origin);
  const { minX, maxX, minY, maxY } = polygonExtents(localPoly);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const polyWidth = Math.max(
    maxX - minX - moduleLayoutConfig.boundaryInsetM * 2,
    widthM * 3,
  );

  let modulesPerRow = maxModulesPerRow(
    polyWidth,
    widthM,
    colGapM,
    moduleLayoutConfig.defaultModulesPerRow,
  );
  modulesPerRow = Math.min(modulesPerRow, moduleLayoutConfig.defaultModulesPerRow);

  let rowCounts = buildRowCounts(targetCount, modulesPerRow);
  let gridHeight =
    rowCounts.length * heightM + Math.max(0, rowCounts.length - 1) * rowGapM;
  let startY = centerY - gridHeight / 2;

  const modules: ModuleRect[] = [];

  const placeRows = (counts: number[], baseY: number) => {
    modules.length = 0;
    let y = baseY;
    for (const countThisRow of counts) {
      const rowWidth = countThisRow * widthM + Math.max(0, countThisRow - 1) * colGapM;
      const startX = centerX - rowWidth / 2;
      for (let col = 0; col < countThisRow; col += 1) {
        const x = startX + col * (widthM + colGapM);
        modules.push(makePortraitModuleRect(x, y, widthM, heightM, origin));
      }
      y += heightM + rowGapM;
    }
  };

  placeRows(rowCounts, startY);

  if (modules.length < targetCount) {
    modulesPerRow = Math.min(
      maxModulesPerRow(polyWidth, widthM, colGapM, modulesPerRow + 2),
      targetCount,
    );
    rowCounts = buildRowCounts(targetCount, modulesPerRow);
    gridHeight =
      rowCounts.length * heightM + Math.max(0, rowCounts.length - 1) * rowGapM;
    startY = centerY - gridHeight / 2;
    placeRows(rowCounts, startY);
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
  const params = getLayoutParams(input.installType, input.capacityKw);
  const targetModuleCount =
    input.moduleCount != null && input.moduleCount > 0
      ? Math.floor(input.moduleCount)
      : Math.max(0, Math.floor((input.capacityKw * 1000) / modulePowerW));

  const origin = centroid(input.boundary);
  const modules = placeModules(input.boundary, targetModuleCount, params, origin);

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
      layoutMode: params.mode,
      tiers: params.mode === "row" && params.kind === "land" ? 2 : 1,
      rowSpacingM: params.rowSpacingM,
      tiltDeg: params.tiltDeg,
      installType: input.installType,
    },
  };
}
