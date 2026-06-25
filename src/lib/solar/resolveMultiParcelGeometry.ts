import { fetchCadastralPolygonByPnu } from "@/lib/api/vworld";
import { layoutPolicy } from "@/data/moduleLayoutConfig";
import {
  applySetback,
  closeRing,
  normalizeRing,
  polygonAreaSqm,
} from "@/lib/solar/polygonGeometry";
import { unionCadastralRings } from "@/lib/solar/parcelUnion";
import { finalizeLandLayoutBoundary } from "@/lib/solar/finalizeLandLayoutBoundary";
import type { SiteGeometryResult } from "@/types/siteGeometry";
import type { LatLngPoint } from "@/types/moduleLayout";

export interface ParcelRef {
  pnu: string;
  lat: number;
  lng: number;
}

async function fetchCadastralRing(parcel: ParcelRef): Promise<LatLngPoint[] | null> {
  if (!parcel.pnu) return null;
  const cadastral = await fetchCadastralPolygonByPnu(parcel.pnu, parcel.lat, parcel.lng);
  return cadastral?.ring?.length ? cadastral.ring : null;
}

function ringAreaSqm(ring: LatLngPoint[] | null | undefined): number | null {
  if (!ring || ring.length < 3) return null;
  return Math.round(polygonAreaSqm(ring) * 100) / 100;
}

function withSetback(sourceRing: LatLngPoint[], setbackM: number) {
  const sourceBoundary = closeRing(normalizeRing(sourceRing));
  const setbackBoundary = closeRing(applySetback(sourceBoundary, setbackM));
  return { sourceBoundary, setbackBoundary, boundary: setbackBoundary };
}

/** 다중 필지 cadastral union → setback → layout boundary */
export async function resolveMultiParcelSiteGeometry(input: {
  parcels: ParcelRef[];
  capacityKw: number;
  registryLandAreaSqm?: number | null;
}): Promise<SiteGeometryResult> {
  const parcelSetbackM = layoutPolicy.parcelBoundarySetbackM;
  const uniqueParcels = input.parcels.filter(
    (parcel, index, all) =>
      parcel.pnu &&
      all.findIndex((item) => item.pnu === parcel.pnu) === index,
  );

  const fetched: Array<{ pnu: string; ring: LatLngPoint[] }> = [];
  for (const parcel of uniqueParcels) {
    const ring = await fetchCadastralRing(parcel);
    if (ring && ring.length >= 3) {
      fetched.push({ pnu: parcel.pnu, ring });
    }
  }

  if (fetched.length === 0) {
    return {
      installType: "토지형",
      capacityBasis: "land",
      layoutBoundarySource: "cadastral",
      landAreaSqm: input.registryLandAreaSqm ?? null,
      buildingFootprintAreaSqm: null,
      roofUsableAreaSqm: null,
      landUsableAreaSqm: null,
      landOriginalAreaSqm: input.registryLandAreaSqm ?? null,
      parcelBoundarySetbackM: parcelSetbackM,
      capacityAreaSqm: input.registryLandAreaSqm ?? 0,
      layoutBoundary: [],
      sourceBoundary: [],
      setbackBoundary: [],
      polygonSource: "cadastral",
      mergedParcelCount: uniqueParcels.length,
      mergedParcelPnus: uniqueParcels.map((parcel) => parcel.pnu),
      unionComponentCount: 0,
      mergedParcelRingCount: 0,
    };
  }

  const unionResult =
    fetched.length === 1
      ? {
          ring: closeRing(normalizeRing(fetched[0].ring)),
          componentRings: [closeRing(normalizeRing(fetched[0].ring))],
          unionComponentCount: 1,
          mergedParcelRingCount: 1,
        }
      : unionCadastralRings(fetched.map((item) => item.ring));

  if (!unionResult) {
    return {
      installType: "토지형",
      capacityBasis: "land",
      layoutBoundarySource: "cadastral",
      landAreaSqm: input.registryLandAreaSqm ?? null,
      buildingFootprintAreaSqm: null,
      roofUsableAreaSqm: null,
      landUsableAreaSqm: null,
      landOriginalAreaSqm: input.registryLandAreaSqm ?? null,
      parcelBoundarySetbackM: parcelSetbackM,
      capacityAreaSqm: input.registryLandAreaSqm ?? 0,
      layoutBoundary: [],
      sourceBoundary: [],
      setbackBoundary: [],
      polygonSource: "cadastral",
      mergedParcelCount: uniqueParcels.length,
      mergedParcelPnus: fetched.map((item) => item.pnu),
      unionComponentCount: 0,
      mergedParcelRingCount: fetched.length,
    };
  }

  const { sourceBoundary, setbackBoundary, boundary: setbackOnlyBoundary } = withSetback(
    unionResult.ring,
    parcelSetbackM,
  );
  const finalized = finalizeLandLayoutBoundary({
    setbackBoundary: setbackOnlyBoundary,
    unionComponentCount: unionResult.unionComponentCount,
  });
  const landOriginalAreaSqm = ringAreaSqm(sourceBoundary);
  const landUsableAreaSqmBeforeNarrowZone = ringAreaSqm(setbackOnlyBoundary);

  return {
    installType: "토지형",
    capacityBasis: "land",
    layoutBoundarySource: fetched.length > 1 ? "cadastral-merged" : "cadastral",
    landAreaSqm: input.registryLandAreaSqm ?? landOriginalAreaSqm,
    buildingFootprintAreaSqm: null,
    roofUsableAreaSqm: null,
    landOriginalAreaSqm,
    landUsableAreaSqm: finalized.landUsableAreaSqm,
    landUsableAreaSqmBeforeNarrowZone,
    parcelBoundarySetbackM: parcelSetbackM,
    capacityAreaSqm: landOriginalAreaSqm ?? input.registryLandAreaSqm ?? 0,
    layoutBoundary: finalized.layoutBoundary,
    sourceBoundary,
    setbackBoundary: setbackOnlyBoundary,
    referenceCadastral: sourceBoundary,
    polygonSource: "cadastral",
    mergedParcelCount: uniqueParcels.length,
    mergedParcelPnus: fetched.map((item) => item.pnu),
    unionComponentCount: unionResult.unionComponentCount,
    mergedParcelRingCount: unionResult.mergedParcelRingCount,
    narrowZone: finalized.narrowZone,
  };
}
