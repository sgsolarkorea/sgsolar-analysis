import type { LatLngPoint } from "@/types/moduleLayout";

const M_PER_DEG_LAT = 110_540;

function mPerDegLng(lat: number): number {
  return 111_320 * Math.cos((lat * Math.PI) / 180);
}

export interface LocalPoint {
  x: number;
  y: number;
}

export interface OrientedBounds {
  origin: LatLngPoint;
  angleRad: number;
  widthM: number;
  heightM: number;
  localRing: LocalPoint[];
}

export function toLocal(ring: LatLngPoint[], origin: LatLngPoint): LocalPoint[] {
  const lngScale = mPerDegLng(origin.lat);
  return ring.map((point) => ({
    x: (point.lng - origin.lng) * lngScale,
    y: (point.lat - origin.lat) * M_PER_DEG_LAT,
  }));
}

export function toLatLng(local: LocalPoint, origin: LatLngPoint): LatLngPoint {
  const lngScale = mPerDegLng(origin.lat);
  return {
    lat: origin.lat + local.y / M_PER_DEG_LAT,
    lng: origin.lng + local.x / lngScale,
  };
}

export function centroid(ring: LatLngPoint[]): LatLngPoint {
  let sumLat = 0;
  let sumLng = 0;
  for (const point of ring) {
    sumLat += point.lat;
    sumLng += point.lng;
  }
  return { lat: sumLat / ring.length, lng: sumLng / ring.length };
}

export function polygonAreaSqm(ring: LatLngPoint[]): number {
  const origin = centroid(ring);
  const local = toLocal(ring, origin);
  let sum = 0;
  for (let i = 0; i < local.length; i++) {
    const j = (i + 1) % local.length;
    sum += local[i].x * local[j].y - local[j].x * local[i].y;
  }
  return Math.abs(sum) / 2;
}

export function pointInLatLngPolygon(point: LatLngPoint, polygon: LatLngPoint[]): boolean {
  if (polygon.length < 3) return false;
  const origin = centroid(polygon);
  const localPoint = toLocal([point], origin)[0];
  const localPoly = toLocal(polygon, origin);
  return pointInPolygon(localPoint, localPoly);
}

export function pointInPolygon(point: LocalPoint, polygon: LocalPoint[]): boolean {
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

function rotateLocal(point: LocalPoint, angleRad: number): LocalPoint {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

/** OBB 로컬 → 비회전 로컬 (rotateLocal(·, -θ)의 역변환) */
function unrotateLocal(point: LocalPoint, angleRad: number): LocalPoint {
  return rotateLocal(point, angleRad);
}

/** GeoJSON 폐합점(첫 점 = 마지막 점) 제거 */
export function normalizeRing(ring: LatLngPoint[]): LatLngPoint[] {
  if (ring.length < 2) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (Math.abs(first.lat - last.lat) < 1e-12 && Math.abs(first.lng - last.lng) < 1e-12) {
    return ring.slice(0, -1);
  }
  return ring;
}

export function closeRing(ring: LatLngPoint[]): LatLngPoint[] {
  if (ring.length < 3) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (Math.abs(first.lat - last.lat) < 1e-12 && Math.abs(first.lng - last.lng) < 1e-12) {
    return ring;
  }
  return [...ring, { ...first }];
}

/** Polygon 장축 방향(라디안) — OBB 기반 */
export function computePolygonOrientation(ring: LatLngPoint[]): number {
  const origin = centroid(ring);
  const local = toLocal(ring, origin);
  if (local.length < 3) return 0;

  let bestAngle = 0;
  let bestArea = Infinity;

  for (let i = 0; i < local.length; i++) {
    const j = (i + 1) % local.length;
    const dx = local[j].x - local[i].x;
    const dy = local[j].y - local[i].y;
    const angle = Math.atan2(dy, dx);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const point of local) {
      const rotated = rotateLocal(point, -angle);
      minX = Math.min(minX, rotated.x);
      maxX = Math.max(maxX, rotated.x);
      minY = Math.min(minY, rotated.y);
      maxY = Math.max(maxY, rotated.y);
    }
    const area = (maxX - minX) * (maxY - minY);
    if (area < bestArea) {
      bestArea = area;
      bestAngle = angle;
    }
  }

  return bestAngle;
}

export function computeOrientedBounds(ring: LatLngPoint[]): OrientedBounds {
  const origin = centroid(ring);
  const angleRad = computePolygonOrientation(ring);
  const local = toLocal(ring, origin).map((p) => rotateLocal(p, -angleRad));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of local) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return {
    origin,
    angleRad,
    widthM: maxX - minX,
    heightM: maxY - minY,
    localRing: local,
  };
}

/** 외곽 setback — 중심 기준 균일 축소 */
export function applySetback(ring: LatLngPoint[], setbackM: number): LatLngPoint[] {
  if (ring.length < 3 || setbackM <= 0) return ring;
  const origin = centroid(ring);
  const angleRad = computePolygonOrientation(ring);
  const local = toLocal(ring, origin).map((p) => rotateLocal(p, -angleRad));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of local) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= setbackM * 2 || height <= setbackM * 2) return ring;

  const scaleX = (width - setbackM * 2) / width;
  const scaleY = (height - setbackM * 2) / height;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return local.map((point) => {
    const sx = cx + (point.x - cx) * scaleX;
    const sy = cy + (point.y - cy) * scaleY;
    const unrotated = unrotateLocal({ x: sx, y: sy }, angleRad);
    return toLatLng(unrotated, origin);
  });
}

function makeOrientedRectangle(
  origin: LatLngPoint,
  angleRad: number,
  widthM: number,
  heightM: number,
): LatLngPoint[] {
  const halfW = widthM / 2;
  const halfH = heightM / 2;
  const corners: LocalPoint[] = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];
  return corners.map((point) => {
    const rotated = rotateLocal(point, angleRad);
    return toLatLng(rotated, origin);
  });
}

/** 필지 내 건물 footprint — 건축면적 기준 OBB 정렬 사각형 */
export function deriveBuildingFootprintInParcel(
  parcelRing: LatLngPoint[],
  buildingAreaSqm: number,
): LatLngPoint[] {
  const obb = computeOrientedBounds(parcelRing);
  const longSide = Math.max(obb.widthM, obb.heightM);
  const shortSide = Math.min(obb.widthM, obb.heightM);
  const obbAspect = longSide / Math.max(shortSide, 1);

  let aspect = obbAspect >= 1.15 ? obbAspect : 1.35;
  aspect = Math.min(Math.max(aspect, 1.1), 2.8);

  let widthM = Math.sqrt(buildingAreaSqm * aspect);
  let heightM = buildingAreaSqm / widthM;

  const maxW = obb.widthM * 0.92;
  const maxH = obb.heightM * 0.92;
  if (widthM > maxW || heightM > maxH) {
    const scale = Math.min(maxW / widthM, maxH / heightM);
    widthM *= scale;
    heightM *= scale;
  }

  return makeOrientedRectangle(obb.origin, obb.angleRad, widthM, heightM);
}

/** 건축면적 기준 건물 사각형 (필지 미확보 시) */
export function createBuildingFootprintRectangle(
  center: LatLngPoint,
  buildingAreaSqm: number,
  angleRad = 0,
): LatLngPoint[] {
  const area = Math.max(buildingAreaSqm, 40);
  const aspect = 1.45;
  const widthM = Math.sqrt(area * aspect);
  const heightM = area / widthM;
  return makeOrientedRectangle(center, angleRad, widthM, heightM);
}

export function localToGeo(
  local: LocalPoint,
  origin: LatLngPoint,
  angleRad: number,
): LatLngPoint {
  const unrotated = unrotateLocal(local, angleRad);
  return toLatLng(unrotated, origin);
}
