import type { InstallTypeOption } from "@/data/resultUx";
import { resolveSiteGeometry } from "@/lib/solar/resolveSiteGeometry";
import {
  resolveMultiParcelSiteGeometry,
  type ParcelRef,
} from "@/lib/solar/resolveMultiParcelGeometry";
import type { LatLngPoint, ModuleLayoutPolygonSource } from "@/types/moduleLayout";
import type { SiteGeometryResult } from "@/types/siteGeometry";

export type { ParcelRef } from "@/lib/solar/resolveMultiParcelGeometry";

export type LayoutFootprintKind = "building" | "parcel" | "virtual";

export interface ResolvedLayoutBoundary {
  boundary: LatLngPoint[];
  sourceBoundary: LatLngPoint[];
  setbackBoundary: LatLngPoint[];
  polygonSource: ModuleLayoutPolygonSource;
  footprintKind: LayoutFootprintKind;
  geometry: SiteGeometryResult;
}

function footprintKindFromGeometry(geometry: SiteGeometryResult): LayoutFootprintKind {
  if (geometry.layoutBoundarySource === "building" || geometry.layoutBoundarySource === "roof") {
    return "building";
  }
  if (geometry.layoutBoundarySource === "virtual") return "virtual";
  return "parcel";
}

export async function resolveLayoutBoundary(input: {
  pnu?: string | null;
  lat: number;
  lng: number;
  capacityKw: number;
  installType: InstallTypeOption | string;
  buildingAreaSqm?: number;
  landAreaSqm?: number;
  /** 다중 필지 — 2개 이상이면 union 후 단일 layout boundary */
  parcels?: ParcelRef[];
}): Promise<ResolvedLayoutBoundary> {
  const isLand = input.installType === "토지형";
  const parcelRefs =
    input.parcels?.filter((parcel) => parcel.pnu && Number.isFinite(parcel.lat) && Number.isFinite(parcel.lng)) ??
    [];

  let geometry: SiteGeometryResult;
  if (isLand && parcelRefs.length > 1) {
    geometry = await resolveMultiParcelSiteGeometry({
      parcels: parcelRefs,
      capacityKw: input.capacityKw,
      registryLandAreaSqm: input.landAreaSqm,
    });
  } else {
    geometry = await resolveSiteGeometry({
      pnu: input.pnu,
      lat: input.lat,
      lng: input.lng,
      capacityKw: input.capacityKw,
      installType: input.installType,
      landAreaSqm: input.landAreaSqm,
      buildingAreaSqm: input.buildingAreaSqm,
    });
  }

  return {
    boundary: geometry.layoutBoundary,
    sourceBoundary: geometry.sourceBoundary,
    setbackBoundary: geometry.setbackBoundary,
    polygonSource: geometry.polygonSource,
    footprintKind: footprintKindFromGeometry(geometry),
    geometry,
  };
}
