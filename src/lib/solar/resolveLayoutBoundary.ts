import {
  fetchBuildingPolygonByPnu,
  fetchCadastralPolygonAtCoordinates,
  fetchCadastralPolygonByPnu,
} from "@/lib/api/vworld";
import type { InstallTypeOption } from "@/data/resultUx";
import { moduleLayoutConfig } from "@/data/moduleLayoutConfig";
import { applySetback } from "@/lib/solar/polygonGeometry";
import { createVirtualParcelRectangle } from "@/lib/solar/moduleLayout";
import type { LatLngPoint, ModuleLayoutPolygonSource } from "@/types/moduleLayout";

export type LayoutFootprintKind = "building" | "parcel" | "virtual";

export interface ResolvedLayoutBoundary {
  boundary: LatLngPoint[];
  polygonSource: ModuleLayoutPolygonSource;
  footprintKind: LayoutFootprintKind;
}

async function resolveCadastralRing(
  pnu: string | null | undefined,
  lat: number,
  lng: number,
): Promise<LatLngPoint[] | null> {
  if (pnu) {
    const cadastral = await fetchCadastralPolygonByPnu(pnu, lat, lng);
    if (cadastral?.ring?.length) return cadastral.ring;
  }

  if (!pnu) {
    const fromCoords = await fetchCadastralPolygonAtCoordinates(lat, lng);
    return fromCoords?.ring?.length ? fromCoords.ring : null;
  }

  return null;
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

  const cadastralRing = await resolveCadastralRing(input.pnu, input.lat, input.lng);

  if (!isLand) {
    if (cadastralRing && input.pnu) {
      const building = await fetchBuildingPolygonByPnu(input.pnu, input.lat, input.lng);
      if (building?.ring?.length) {
        return {
          boundary: applySetback(building.ring, moduleLayoutConfig.roofSetbackM),
          polygonSource: "building",
          footprintKind: "building",
        };
      }
    }

    if (cadastralRing) {
      return {
        boundary: applySetback(cadastralRing, moduleLayoutConfig.roofSetbackM),
        polygonSource: "cadastral",
        footprintKind: "parcel",
      };
    }

    return {
      boundary: [],
      polygonSource: "cadastral",
      footprintKind: "parcel",
    };
  }

  if (cadastralRing) {
    return {
      boundary: applySetback(cadastralRing, moduleLayoutConfig.landSetbackM),
      polygonSource: "cadastral",
      footprintKind: "parcel",
    };
  }

  if (input.pnu) {
    return {
      boundary: [],
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
