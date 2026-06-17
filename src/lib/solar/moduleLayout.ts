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
  polyWidth: number,
  polyHeight: number,
  targetCount: number,
  mode: ModuleLayoutMode,
): number {
  const base = moduleLayoutConfig.visualScale;
  const moduleUnitArea = moduleLayoutConfig.moduleShortM * moduleLayoutConfig.moduleLongM;
  const polyArea = Math.max(polyWidth * polyHeight, 1);
  const fillTarget = mode === "flush" ? 0.68 : 0.55;
  const ideal = Math.sqrt((polyArea * fillTarget) / Math.max(targetCount * moduleUnitArea, 1));
  return Math.min(Math.max(ideal, base * 0.82), base * 1.18);
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

  const { origin, angleRad, localPoly, minX, maxX, minY, maxY } = toOrientedPoly(polygon);
  const polyWidth = maxX - minX;
  const polyHeight = maxY - minY;

  const scale = resolveModuleScale(polyWidth, polyHeight, targetCount, params.mode);
  const widthM = moduleLayoutConfig.moduleShortM * scale;
  const heightM = moduleLayoutConfig.moduleLongM * scale;
  const colGapM = 0;
  const rowGapM =
    params.mode === "row" ? getVisualRowSpacingM(params.kind, params.mode) : 0;

  const modules: ModuleRect[] = [];
  let y = minY;

  while (y + heightM <= maxY + 0.001 && modules.length < targetCount) {
    let x = minX;
    while (x + widthM <= maxX + 0.001 && modules.length < targetCount) {
      const center = { x: x + widthM / 2, y: y + heightM / 2 };
      if (pointInPolygon(center, localPoly)) {
        modules.push(makePortraitModuleRect(x, y, widthM, heightM, origin, angleRad));
      }
      x += widthM + colGapM;
    }
    y += heightM + rowGapM;
  }

  return modules.slice(0, targetCount);
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
  const origin = computeOrientedBounds(input.boundary).origin;

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
