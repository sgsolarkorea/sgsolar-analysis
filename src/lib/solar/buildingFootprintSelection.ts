import type { LatLngPoint } from "@/types/moduleLayout";
import { centroid, pointInLatLngPolygon, polygonAreaSqm } from "@/lib/solar/polygonGeometry";

/** 부속건물·차고 등 제외 — 최소 건물 footprint (㎡) */
export const MIN_PARCEL_BUILDING_FOOTPRINT_SQM = 15;

/** 건물 polygon이 필지 전체로 오인되는 면적 비율 상한 */
export const PARCEL_LIKE_BUILDING_AREA_RATIO = 0.85;

export type BuildingExclusionReason =
  | "too_small"
  | "parcel_like_area"
  | "outside_parcel"
  | "invalid_polygon";

export interface ExcludedBuildingPolygon {
  areaSqm: number;
  reason: BuildingExclusionReason;
}

export interface ParcelBuildingSelection {
  detectedBuildingCount: number;
  usedBuildingCount: number;
  excludedBuildingCount: number;
  usedPolygons: LatLngPoint[][];
  excluded: ExcludedBuildingPolygon[];
  polygonFootprintSumSqm: number | null;
}

function ringAreaSqm(ring: LatLngPoint[] | null | undefined): number | null {
  if (!ring || ring.length < 3) return null;
  const area = polygonAreaSqm(ring);
  return area > 0 ? Math.round(area * 100) / 100 : null;
}

function buildingIntersectsParcel(ring: LatLngPoint[], parcelRing: LatLngPoint[]): boolean {
  if (pointInLatLngPolygon(centroid(ring), parcelRing)) return true;
  return ring.some((point) => pointInLatLngPolygon(point, parcelRing));
}

function dedupeRingsByArea(rings: LatLngPoint[][]): LatLngPoint[][] {
  const seen = new Set<string>();
  const unique: LatLngPoint[][] = [];
  for (const ring of rings) {
    const area = ringAreaSqm(ring);
    if (area == null) continue;
    const key = `${Math.round(area)}:${ring.length}:${ring[0]?.lat.toFixed(6)}:${ring[0]?.lng.toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(ring);
  }
  return unique;
}

export function selectParcelBuildingPolygons(input: {
  cadastralRing: LatLngPoint[] | null;
  buildingRings: LatLngPoint[][];
  cadastralAreaSqm: number | null;
}): ParcelBuildingSelection {
  const detected = dedupeRingsByArea(input.buildingRings);
  const usedPolygons: LatLngPoint[][] = [];
  const excluded: ExcludedBuildingPolygon[] = [];

  for (const ring of detected) {
    const areaSqm = ringAreaSqm(ring);
    if (areaSqm == null) {
      excluded.push({ areaSqm: 0, reason: "invalid_polygon" });
      continue;
    }

    if (areaSqm < MIN_PARCEL_BUILDING_FOOTPRINT_SQM) {
      excluded.push({ areaSqm, reason: "too_small" });
      continue;
    }

    if (
      input.cadastralAreaSqm != null &&
      areaSqm >= input.cadastralAreaSqm * PARCEL_LIKE_BUILDING_AREA_RATIO
    ) {
      excluded.push({ areaSqm, reason: "parcel_like_area" });
      continue;
    }

    if (input.cadastralRing && input.cadastralRing.length >= 3) {
      if (!buildingIntersectsParcel(ring, input.cadastralRing)) {
        excluded.push({ areaSqm, reason: "outside_parcel" });
        continue;
      }
    }

    usedPolygons.push(ring);
  }

  usedPolygons.sort((a, b) => (ringAreaSqm(b) ?? 0) - (ringAreaSqm(a) ?? 0));

  const polygonFootprintSumSqm =
    usedPolygons.length > 0
      ? Math.round(
          usedPolygons.reduce((sum, ring) => sum + (ringAreaSqm(ring) ?? 0), 0) * 100,
        ) / 100
      : null;

  return {
    detectedBuildingCount: detected.length,
    usedBuildingCount: usedPolygons.length,
    excludedBuildingCount: excluded.length,
    usedPolygons,
    excluded,
    polygonFootprintSumSqm,
  };
}

/** GIS polygon 합산 vs 건축물대장 건축면적 — 과대 산정 방지 */
export function resolveBuildingCapacityFootprintSqm(input: {
  polygonFootprintSumSqm: number | null;
  registryBuildingAreaSqm: number | null;
  usedBuildingCount: number;
  registryBuildingCount?: number;
}): number {
  const polygonSum = input.polygonFootprintSumSqm ?? 0;
  const registry = input.registryBuildingAreaSqm ?? 0;

  if (polygonSum <= 0 && registry <= 0) return 0;
  if (polygonSum <= 0) return registry;
  if (registry <= 0) return polygonSum;

  if (input.usedBuildingCount >= 2) return polygonSum;
  if ((input.registryBuildingCount ?? 0) >= 2 && registry > polygonSum) return registry;
  if (registry > polygonSum * 1.12) return registry;
  return polygonSum;
}
