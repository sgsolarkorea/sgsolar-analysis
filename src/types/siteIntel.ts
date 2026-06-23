import type { LatLngPoint } from "@/types/moduleLayout";

export interface ParcelBbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface ParcelContext {
  pnu: string;
  lat: number;
  lng: number;
  centroid: LatLngPoint;
  polygon: LatLngPoint[];
  polygonPointCount: number;
  polygonAreaSqm: number;
  bbox: ParcelBbox;
  /** intersect용 envelope + buffer(m) bbox */
  bboxBuffered: ParcelBbox;
  bufferM: number;
}

export type LandUseCategory =
  | "용도지역"
  | "용도지구"
  | "용도구역"
  | "지구단위계획"
  | "도시계획시설"
  | "기타";

export interface LandUseAttrItem {
  name: string;
  category: LandUseCategory;
  code?: string;
  conflictLevel?: number;
  areaSqm?: number;
  areaRatio?: number;
  raw?: Record<string, string>;
}

export type GisLayerGroup =
  | "zoning"
  | "district"
  | "restriction"
  | "cultural"
  | "road"
  | "river"
  | "building"
  | "other";

export interface GisLayerHit {
  layerId: string;
  layerName: string;
  group: GisLayerGroup;
  featureName?: string;
  relation?: "contains" | "intersects" | "adjacent" | "unknown";
  properties?: Record<string, string>;
}

export interface SiteIntelMeta {
  collectedAt: string;
  dataSource: "vworld-gis";
  partial: boolean;
  cacheHit: boolean;
  apiCallCount: number;
  errors: string[];
}

export interface SiteIntelBundle {
  pnu: string;
  parcel: ParcelContext;
  landUseAttributes: LandUseAttrItem[];
  /** Step 2+ */
  regionDistrictHits: GisLayerHit[];
  regulatoryHits: GisLayerHit[];
  meta: SiteIntelMeta;
}

export interface ResolveSiteIntelInput {
  pnu: string;
  lat: number;
  lng: number;
  skipCache?: boolean;
}
