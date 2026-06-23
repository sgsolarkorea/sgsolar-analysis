import { bboxToGeomFilter, expandParcelBbox } from "@/lib/gis/parcelContext";
import { fetchVworldDataFeature, type VworldFetchCounter } from "@/lib/gis/vworldClient";
import { centroid, pointInPolygon, toLocal, type LocalPoint } from "@/lib/solar/polygonGeometry";
import type { LatLngPoint } from "@/types/moduleLayout";
import type { ParcelBbox, ParcelContext } from "@/types/siteIntel";

interface VworldFeatureGeometry {
  type?: string;
  coordinates?: unknown;
}

export interface VworldGisFeature {
  geometry?: VworldFeatureGeometry;
  properties?: Record<string, string>;
}

interface VworldFeatureCollection {
  response?: {
    result?: {
      featureCollection?: {
        features?: VworldGisFeature[];
      };
    };
    error?: { text?: string };
  };
}

export interface SetbackTargetSpec {
  key: string;
  label: string;
  detail?: string;
  standardM: number;
  layerIds: string[];
  searchRadiusM: number;
  featureSize?: number;
}

export interface SetbackMeasureResult {
  key: string;
  distanceM: number | null;
  layerId?: string;
  featureLabel?: string;
  error?: string;
}

function pointToSegmentDistance(p: LocalPoint, a: LocalPoint, b: LocalPoint): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) return Math.hypot(apx, apy);
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  return Math.hypot(apx - t * abx, apy - t * aby);
}

function segmentToSegmentDistance(a1: LocalPoint, a2: LocalPoint, b1: LocalPoint, b2: LocalPoint): number {
  return Math.min(
    pointToSegmentDistance(a1, b1, b2),
    pointToSegmentDistance(a2, b1, b2),
    pointToSegmentDistance(b1, a1, a2),
    pointToSegmentDistance(b2, a1, a2),
  );
}

function coordsToRing(coords: number[][]): LatLngPoint[] {
  return coords.map(([lng, lat]) => ({ lat, lng }));
}

function collectGeometryPaths(geometry?: VworldFeatureGeometry): LatLngPoint[][] {
  if (!geometry?.coordinates) return [];

  const coords = geometry.coordinates;
  const paths: LatLngPoint[][] = [];

  if (geometry.type === "Point" && Array.isArray(coords) && coords.length >= 2) {
    return [];
  }

  if (geometry.type === "LineString" && Array.isArray(coords)) {
    paths.push(coordsToRing(coords as number[][]));
    return paths;
  }

  if (geometry.type === "MultiLineString" && Array.isArray(coords)) {
    for (const line of coords as number[][][]) {
      if (Array.isArray(line) && line.length >= 2) paths.push(coordsToRing(line));
    }
    return paths;
  }

  if (geometry.type === "Polygon" && Array.isArray(coords) && Array.isArray(coords[0])) {
    paths.push(coordsToRing((coords as number[][][])[0]));
    return paths;
  }

  if (geometry.type === "MultiPolygon" && Array.isArray(coords)) {
    for (const poly of coords as number[][][][]) {
      if (Array.isArray(poly?.[0]) && poly[0].length >= 3) paths.push(coordsToRing(poly[0]));
    }
    return paths;
  }

  return paths;
}

function collectGeometryPoints(geometry?: VworldFeatureGeometry): LatLngPoint[] {
  if (!geometry?.coordinates) return [];
  const coords = geometry.coordinates;
  if (geometry.type === "Point" && Array.isArray(coords) && coords.length >= 2) {
    return [{ lng: coords[0] as number, lat: coords[1] as number }];
  }
  if (geometry.type === "MultiPoint" && Array.isArray(coords)) {
    return (coords as number[][]).map(([lng, lat]) => ({ lat, lng }));
  }
  return [];
}

function minDistanceParcelToPaths(parcel: LatLngPoint[], paths: LatLngPoint[][]): number | null {
  if (!parcel.length || paths.length === 0) return null;

  const origin = centroid(parcel);
  const localParcel = toLocal(parcel, origin);
  let min = Infinity;

  for (const path of paths) {
    if (path.length < 2) continue;
    const localPath = toLocal(path, origin);

    for (const vertex of localParcel) {
      for (let i = 0; i < localPath.length - 1; i++) {
        min = Math.min(min, pointToSegmentDistance(vertex, localPath[i], localPath[i + 1]));
      }
    }

    for (let i = 0; i < localParcel.length; i++) {
      const j = (i + 1) % localParcel.length;
      for (let k = 0; k < localPath.length - 1; k++) {
        min = Math.min(
          min,
          segmentToSegmentDistance(localParcel[i], localParcel[j], localPath[k], localPath[k + 1]),
        );
      }
    }
  }

  return Number.isFinite(min) ? min : null;
}

function minDistanceParcelToPoints(parcel: LatLngPoint[], points: LatLngPoint[]): number | null {
  if (!parcel.length || points.length === 0) return null;

  const origin = centroid(parcel);
  const localParcel = toLocal(parcel, origin);
  let min = Infinity;

  for (const point of points) {
    const localPoint = toLocal([point], origin)[0];
    for (let i = 0; i < localParcel.length; i++) {
      const j = (i + 1) % localParcel.length;
      min = Math.min(min, pointToSegmentDistance(localPoint, localParcel[i], localParcel[j]));
    }
  }

  return Number.isFinite(min) ? min : null;
}

function featureLabel(feature: VworldGisFeature): string | undefined {
  const props = feature.properties ?? {};
  const candidates = [
    props.name,
    props.NAME,
    props.road_nm,
    props.RIVER_NM,
    props.schul_nm,
    props.ccba_knm,
    props.layer,
  ];
  return candidates.find((value) => value && String(value).trim().length > 0)?.trim();
}

function shouldSkipBuildingFeature(parcel: LatLngPoint[], feature: VworldGisFeature): boolean {
  const paths = collectGeometryPaths(feature.geometry);
  if (paths.length === 0) return false;

  const origin = centroid(parcel);
  const localParcel = toLocal(parcel, origin);
  const featureCenter = centroid(paths[0]);
  const localCenter = toLocal([featureCenter], origin)[0];
  return pointInPolygon(localCenter, localParcel);
}

export function minDistanceParcelToFeatureM(
  parcel: LatLngPoint[],
  feature: VworldGisFeature,
): number | null {
  const points = collectGeometryPoints(feature.geometry);
  const paths = collectGeometryPaths(feature.geometry);

  const pointDist = minDistanceParcelToPoints(parcel, points);
  const pathDist = minDistanceParcelToPaths(parcel, paths);

  if (pointDist == null) return pathDist;
  if (pathDist == null) return pointDist;
  return Math.min(pointDist, pathDist);
}

export async function fetchGisFeaturesInBbox(
  layerId: string,
  bbox: ParcelBbox,
  options?: { size?: number; counter?: VworldFetchCounter },
): Promise<{ features: VworldGisFeature[]; error?: string }> {
  const params = new URLSearchParams({
    service: "data",
    request: "GetFeature",
    data: layerId,
    size: String(options?.size ?? 100),
    page: "1",
    geometry: "true",
    attribute: "true",
    crs: "EPSG:4326",
    geomFilter: bboxToGeomFilter(bbox),
  });

  const data = await fetchVworldDataFeature<VworldFeatureCollection>(params, {
    label: `setback-${layerId}`,
    counter: options?.counter,
  });

  if (!data) {
    return { features: [], error: `${layerId} request failed` };
  }

  const apiError = data.response?.error?.text;
  if (apiError) {
    return { features: [], error: apiError };
  }

  const features = data.response?.result?.featureCollection?.features ?? [];
  return { features };
}

export async function measureSetbackTarget(
  parcel: ParcelContext,
  target: SetbackTargetSpec,
  counter?: VworldFetchCounter,
): Promise<SetbackMeasureResult> {
  const searchBbox = expandParcelBbox(parcel.bbox, target.searchRadiusM, parcel.centroid.lat);
  let lastError: string | undefined;
  let bestDistance: number | null = null;
  let bestLayerId: string | undefined;
  let bestLabel: string | undefined;

  for (const layerId of target.layerIds) {
    const { features, error } = await fetchGisFeaturesInBbox(layerId, searchBbox, {
      size: target.featureSize ?? 100,
      counter,
    });

    if (error && features.length === 0) {
      lastError = error;
      continue;
    }

    for (const feature of features) {
      if (target.key === "building" && shouldSkipBuildingFeature(parcel.polygon, feature)) {
        continue;
      }

      const distanceM = minDistanceParcelToFeatureM(parcel.polygon, feature);
      if (distanceM == null) continue;

      if (bestDistance == null || distanceM < bestDistance) {
        bestDistance = distanceM;
        bestLayerId = layerId;
        bestLabel = featureLabel(feature);
      }
    }

    if (bestDistance != null) {
      return {
        key: target.key,
        distanceM: Math.round(bestDistance * 10) / 10,
        layerId: bestLayerId,
        featureLabel: bestLabel,
      };
    }

    if (features.length === 0 && !error) {
      lastError = `${layerId}: no features in search area`;
    }
  }

  return {
    key: target.key,
    distanceM: null,
    error: lastError ?? "no matching features",
  };
}

export async function measureAllSetbackTargets(
  parcel: ParcelContext,
  targets: SetbackTargetSpec[],
  counter?: VworldFetchCounter,
): Promise<SetbackMeasureResult[]> {
  const results: SetbackMeasureResult[] = [];
  for (const target of targets) {
    results.push(await measureSetbackTarget(parcel, target, counter));
  }
  return results;
}
