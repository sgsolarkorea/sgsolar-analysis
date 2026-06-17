import {
  fetchBuildingPolygonByPnu,
  fetchCadastralPolygonAtCoordinates,
  fetchCadastralPolygonByPnu,
} from "@/lib/api/vworld";
import type { InstallTypeOption } from "@/data/resultUx";
import { moduleLayoutConfig } from "@/data/moduleLayoutConfig";
import { applySetback, closeRing, normalizeRing } from "@/lib/solar/polygonGeometry";
import { createVirtualParcelRectangle } from "@/lib/solar/moduleLayout";
import type { LatLngPoint, ModuleLayoutPolygonSource } from "@/types/moduleLayout";

export type LayoutFootprintKind = "building" | "parcel" | "virtual";

export interface ResolvedLayoutBoundary {
  /** setback 적용 후 배치 경계 */
  boundary: LatLngPoint[];
  /** setback 적용 전 원본 Polygon */
  sourceBoundary: LatLngPoint[];
  /** sourceBoundary에 setback 적용 결과 (boundary와 동일해야 함) */
  setbackBoundary: LatLngPoint[];
  polygonSource: ModuleLayoutPolygonSource;
  footprintKind: LayoutFootprintKind;
}

function withSetback(
  sourceRing: LatLngPoint[],
  setbackM: number,
): Pick<ResolvedLayoutBoundary, "sourceBoundary" | "setbackBoundary" | "boundary"> {
  const sourceBoundary = closeRing(normalizeRing(sourceRing));
  const setbackBoundary = closeRing(applySetback(sourceBoundary, setbackM));
  return { sourceBoundary, setbackBoundary, boundary: setbackBoundary };
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

  const fromCoords = await fetchCadastralPolygonAtCoordinates(lat, lng);
  return fromCoords?.ring?.length ? fromCoords.ring : null;
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
    if (input.pnu) {
      const building = await fetchBuildingPolygonByPnu(input.pnu, input.lat, input.lng);
      if (building?.ring?.length) {
        const { sourceBoundary, setbackBoundary, boundary } = withSetback(
          building.ring,
          moduleLayoutConfig.roofSetbackM,
        );
        return {
          sourceBoundary,
          setbackBoundary,
          boundary,
          polygonSource: "building",
          footprintKind: "building",
        };
      }
    }

    if (cadastralRing) {
      const { sourceBoundary, setbackBoundary, boundary } = withSetback(
        cadastralRing,
        moduleLayoutConfig.roofSetbackM,
      );
      return {
        sourceBoundary,
        setbackBoundary,
        boundary,
        polygonSource: "cadastral",
        footprintKind: "parcel",
      };
    }

    return {
      sourceBoundary: [],
      setbackBoundary: [],
      boundary: [],
      polygonSource: "cadastral",
      footprintKind: "parcel",
    };
  }

  if (cadastralRing) {
    const { sourceBoundary, setbackBoundary, boundary } = withSetback(
      cadastralRing,
      moduleLayoutConfig.landSetbackM,
    );
    return {
      sourceBoundary,
      setbackBoundary,
      boundary,
      polygonSource: "cadastral",
      footprintKind: "parcel",
    };
  }

  if (input.pnu) {
    return {
      sourceBoundary: [],
      setbackBoundary: [],
      boundary: [],
      polygonSource: "cadastral",
      footprintKind: "parcel",
    };
  }

  const virtualRing = closeRing(createVirtualParcelRectangle(center, input.capacityKw, input.installType));
  return {
    sourceBoundary: virtualRing,
    setbackBoundary: virtualRing,
    boundary: virtualRing,
    polygonSource: "virtual",
    footprintKind: "virtual",
  };
}
