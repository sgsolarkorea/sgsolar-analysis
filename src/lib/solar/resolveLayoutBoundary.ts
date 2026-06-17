import { fetchCadastralPolygonByPnu } from "@/lib/api/vworld";
import type { InstallTypeOption } from "@/data/resultUx";
import { moduleLayoutConfig } from "@/data/moduleLayoutConfig";
import {
  applySetback,
  createBuildingFootprintRectangle,
  deriveBuildingFootprintInParcel,
} from "@/lib/solar/polygonGeometry";
import { createVirtualParcelRectangle } from "@/lib/solar/moduleLayout";
import type { LatLngPoint, ModuleLayoutPolygonSource } from "@/types/moduleLayout";

export type LayoutFootprintKind = "building" | "parcel" | "virtual";

export interface ResolvedLayoutBoundary {
  boundary: LatLngPoint[];
  polygonSource: ModuleLayoutPolygonSource;
  footprintKind: LayoutFootprintKind;
}

export async function resolveLayoutBoundary(input: {
  pnu?: string | null;
  lat: number;
  lng: number;
  capacityKw: number;
  installType: InstallTypeOption | string;
  buildingAreaSqm?: number;
  landAreaSqm?: number;
}): Promise<ResolvedLayoutBoundary> {
  const center: LatLngPoint = { lat: input.lat, lng: input.lng };
  const isLand = input.installType === "토지형";
  const buildingArea = input.buildingAreaSqm ?? 0;

  let cadastralRing: LatLngPoint[] | null = null;
  if (input.pnu) {
    const cadastral = await fetchCadastralPolygonByPnu(input.pnu, input.lat, input.lng);
    if (cadastral?.ring?.length) {
      cadastralRing = cadastral.ring;
    }
  }

  if (!isLand && buildingArea > 0) {
    if (cadastralRing) {
      const footprint = deriveBuildingFootprintInParcel(cadastralRing, buildingArea);
      return {
        boundary: applySetback(footprint, moduleLayoutConfig.roofSetbackM),
        polygonSource: "cadastral",
        footprintKind: "building",
      };
    }

    return {
      boundary: applySetback(
        createBuildingFootprintRectangle(center, buildingArea),
        moduleLayoutConfig.roofSetbackM,
      ),
      polygonSource: "virtual",
      footprintKind: "building",
    };
  }

  if (cadastralRing) {
    const setback = isLand ? moduleLayoutConfig.landSetbackM : moduleLayoutConfig.roofSetbackM;
    return {
      boundary: applySetback(cadastralRing, setback),
      polygonSource: "cadastral",
      footprintKind: "parcel",
    };
  }

  return {
    boundary: createVirtualParcelRectangle(center, input.capacityKw, input.installType),
    polygonSource: "virtual",
    footprintKind: "virtual",
  };
}
