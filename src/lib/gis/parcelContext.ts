import { fetchCadastralPolygonByPnu } from "@/lib/api/vworld";
import { centroid, polygonAreaSqm } from "@/lib/solar/polygonGeometry";
import type { LatLngPoint } from "@/types/moduleLayout";
import type { ParcelBbox, ParcelContext } from "@/types/siteIntel";

const DEFAULT_BUFFER_M = 50;

function ringToBbox(ring: LatLngPoint[]): ParcelBbox {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const point of ring) {
    minLng = Math.min(minLng, point.lng);
    minLat = Math.min(minLat, point.lat);
    maxLng = Math.max(maxLng, point.lng);
    maxLat = Math.max(maxLat, point.lat);
  }

  return { minLng, minLat, maxLng, maxLat };
}

function expandBbox(bbox: ParcelBbox, bufferM: number, refLat: number): ParcelBbox {
  const dLng = bufferM / (111_320 * Math.cos((refLat * Math.PI) / 180));
  const dLat = bufferM / 110_540;
  return {
    minLng: bbox.minLng - dLng,
    minLat: bbox.minLat - dLat,
    maxLng: bbox.maxLng + dLng,
    maxLat: bbox.maxLat + dLat,
  };
}

export function expandParcelBbox(bbox: ParcelBbox, bufferM: number, refLat: number): ParcelBbox {
  return expandBbox(bbox, bufferM, refLat);
}

export function bboxToGeomFilter(bbox: ParcelBbox): string {
  return `BOX(${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat})`;
}

export interface ResolveParcelContextInput {
  pnu: string;
  lat: number;
  lng: number;
  bufferM?: number;
}

export async function resolveParcelContext(
  input: ResolveParcelContextInput,
): Promise<ParcelContext | null> {
  const { pnu, lat, lng } = input;
  const bufferM = input.bufferM ?? DEFAULT_BUFFER_M;

  if (!pnu) return null;

  const cadastral = await fetchCadastralPolygonByPnu(pnu, lat, lng);
  if (!cadastral?.ring?.length) return null;

  const polygon = cadastral.ring;
  const center = centroid(polygon);
  const bbox = ringToBbox(polygon);
  const bboxBuffered = expandBbox(bbox, bufferM, center.lat);

  return {
    pnu: cadastral.pnu || pnu,
    lat,
    lng,
    centroid: center,
    polygon,
    polygonPointCount: polygon.length,
    polygonAreaSqm: Math.round(polygonAreaSqm(polygon) * 100) / 100,
    bbox,
    bboxBuffered,
    bufferM,
  };
}
