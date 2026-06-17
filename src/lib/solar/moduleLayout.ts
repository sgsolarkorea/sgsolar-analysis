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

function evenlySample<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const result: T[] = [];
  const step = items.length / count;
  for (let i = 0; i < count; i += 1) {
    result.push(items[Math.min(items.length - 1, Math.floor(i * step + step / 2))]);
  }
  return result;
}

/**
 * 사용 가능 영역 전체에 그리드 슬롯 생성 → 목표 모듈수만큼 균등 분산 배치
 * - 통판형: 모듈 밀착, 행간 없음
 * - Row: 행 내 밀착, 행 간만 이격
 */
function placeModulesDistributed(
  polygon: LatLngPoint[],
  targetCount: number,
  params: LayoutParams,
): ModuleRect[] {
  if (targetCount <= 0 || polygon.length < 3) return [];

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

  const { widthM, heightM, colGapM } = getVisualModuleDimensions(params.mode);
  const rowGapM =
    params.mode === "row"
      ? getVisualRowSpacingM(params.kind, params.mode)
      : getVisualModuleDimensions(params.mode).rowGapM;

  const slots: LocalPoint[] = [];
  let y = minY;
  while (y + heightM <= maxY + 0.001) {
    let x = minX;
    while (x + widthM <= maxX + 0.001) {
      const center = { x: x + widthM / 2, y: y + heightM / 2 };
      if (pointInPolygon(center, localPoly)) {
        slots.push({ x, y });
      }
      x += widthM + colGapM;
    }
    y += heightM + rowGapM;
  }

  if (slots.length === 0) {
    const cx = (minX + maxX) / 2 - widthM / 2;
    const cy = (minY + maxY) / 2 - heightM / 2;
    slots.push({ x: cx, y: cy });
  }

  const selected = evenlySample(slots, targetCount);
  return selected.map(({ x, y }) =>
    makePortraitModuleRect(x, y, widthM, heightM, origin, angleRad),
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

  const modules = placeModulesDistributed(input.boundary, targetModuleCount, params);
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
    bounds.minLng = Math.min(bounds.minLng, point.lng);
    bounds.maxLng = Math.max(bounds.maxLng, point.lng);
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
