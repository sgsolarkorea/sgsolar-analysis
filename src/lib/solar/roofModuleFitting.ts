import { layoutPolicy } from "@/data/moduleLayoutConfig";
import { pointInPolygon, type LocalPoint } from "@/lib/solar/polygonGeometry";

export const ROOF_PRODUCTION_EDGE_TOLERANCE_M = layoutPolicy.roofEdgeToleranceM;
export const ROOF_PRODUCTION_FITTING_POLICY = "edge_tolerance_0.1m" as const;

function segmentDistance(p: LocalPoint, a: LocalPoint, b: LocalPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(p.x - proj.x, p.y - proj.y);
}

function minDistanceToPolygonBoundary(p: LocalPoint, poly: LocalPoint[]): number {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    min = Math.min(min, segmentDistance(p, a, b));
  }
  return min;
}

export function moduleCornerPoints(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
): LocalPoint[] {
  return [
    { x, y },
    { x: x + widthM, y },
    { x: x + widthM, y: y + heightM },
    { x, y: y + heightM },
  ];
}

function pointInsideOrWithinTolerance(
  p: LocalPoint,
  poly: LocalPoint[],
  toleranceM: number,
): boolean {
  if (pointInPolygon(p, poly)) return true;
  if (toleranceM <= 0) return false;
  return minDistanceToPolygonBoundary(p, poly) <= toleranceM + 1e-6;
}

/** 건물형 모듈 fitting — edge_tolerance 또는 strict (toleranceM=0) */
export function moduleFitsWithRoofTolerance(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  localPoly: LocalPoint[],
  toleranceM: number,
): boolean {
  const corners = moduleCornerPoints(x, y, widthM, heightM);
  return corners.every((corner) => pointInsideOrWithinTolerance(corner, localPoly, toleranceM));
}

export function moduleFitsRoofProduction(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  localPoly: LocalPoint[],
): boolean {
  return moduleFitsWithRoofTolerance(
    x,
    y,
    widthM,
    heightM,
    localPoly,
    ROOF_PRODUCTION_EDGE_TOLERANCE_M,
  );
}

export function moduleFitsRoofStrict(
  x: number,
  y: number,
  widthM: number,
  heightM: number,
  localPoly: LocalPoint[],
): boolean {
  return moduleFitsWithRoofTolerance(x, y, widthM, heightM, localPoly, 0);
}
