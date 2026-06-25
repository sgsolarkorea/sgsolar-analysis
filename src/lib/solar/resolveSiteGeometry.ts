import {
  fetchBuildingPolygonByPnu,
  fetchCadastralPolygonAtCoordinates,
  fetchCadastralPolygonByPnu,
} from "@/lib/api/vworld";
import type { InstallTypeOption } from "@/data/resultUx";
import { layoutPolicy } from "@/data/moduleLayoutConfig";
import {
  resolveBuildingCapacityFootprintSqm,
  selectParcelBuildingPolygons,
} from "@/lib/solar/buildingFootprintSelection";
import { createVirtualParcelRectangle } from "@/lib/solar/moduleLayout";
import { finalizeLandLayoutBoundary } from "@/lib/solar/finalizeLandLayoutBoundary";
import {
  applySetback,
  closeRing,
  createBuildingFootprintRectangle,
  deriveBuildingFootprintInParcel,
  normalizeRing,
  polygonAreaSqm,
} from "@/lib/solar/polygonGeometry";
import type {
  LayoutBoundarySource,
  SiteGeometryBundle,
  SiteGeometryResult,
} from "@/types/siteGeometry";
import type { LatLngPoint, ModuleLayoutPolygonSource } from "@/types/moduleLayout";

export type { SiteGeometryBundle, SiteGeometryResult } from "@/types/siteGeometry";

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

function withSetback(sourceRing: LatLngPoint[], setbackM: number) {
  const sourceBoundary = closeRing(normalizeRing(sourceRing));
  const setbackBoundary = closeRing(applySetback(sourceBoundary, setbackM));
  return { sourceBoundary, setbackBoundary, boundary: setbackBoundary };
}

function ringArea(ring: LatLngPoint[] | null | undefined): number | null {
  if (!ring || ring.length < 3) return null;
  return Math.round(polygonAreaSqm(ring) * 100) / 100;
}

function ringsAreaSum(rings: LatLngPoint[][] | null | undefined): number | null {
  if (!rings?.length) return null;
  const sum = rings.reduce((total, ring) => total + (ringArea(ring) ?? 0), 0);
  return sum > 0 ? Math.round(sum * 100) / 100 : null;
}

function setbackRingsAreaSum(rings: LatLngPoint[][] | null | undefined, setbackM: number): number | null {
  if (!rings?.length) return null;
  const sum = rings.reduce((total, ring) => {
    if (ring.length < 3) return total;
    const setback = closeRing(applySetback(closeRing(normalizeRing(ring)), setbackM));
    return total + (ringArea(setback) ?? 0);
  }, 0);
  return sum > 0 ? Math.round(sum * 100) / 100 : null;
}

/** VWorld Polygon 원본 수집 — 설치유형 전환 시 재사용 */
export async function fetchSiteGeometryBundle(input: {
  pnu?: string | null;
  lat: number;
  lng: number;
  landAreaSqm?: number | null;
  buildingAreaSqm?: number | null;
  registryBuildingCount?: number;
}): Promise<SiteGeometryBundle> {
  const cadastralPolygon = await resolveCadastralRing(input.pnu, input.lat, input.lng);
  const cadastralAreaSqm = ringArea(cadastralPolygon);
  let buildingPolygon: LatLngPoint[] | null = null;
  let buildingPolygons: LatLngPoint[][] = [];

  if (input.pnu) {
    const building = await fetchBuildingPolygonByPnu(
      input.pnu,
      input.lat,
      input.lng,
      cadastralPolygon,
    );
    buildingPolygon = building?.ring?.length ? building.ring : null;
    buildingPolygons = building?.rings?.length ? building.rings : buildingPolygon ? [buildingPolygon] : [];
  }

  const selection = selectParcelBuildingPolygons({
    cadastralRing: cadastralPolygon,
    buildingRings: buildingPolygons,
    cadastralAreaSqm,
  });
  buildingPolygons = selection.usedPolygons;
  buildingPolygon = buildingPolygons[0] ?? null;

  const polygonFootprintSumSqm = selection.polygonFootprintSumSqm;
  const registryBuildingAreaSqm = input.buildingAreaSqm ?? null;
  const buildingFootprintAreaSqm = resolveBuildingCapacityFootprintSqm({
    polygonFootprintSumSqm,
    registryBuildingAreaSqm,
    usedBuildingCount: selection.usedBuildingCount,
    registryBuildingCount: input.registryBuildingCount,
  });

  return {
    landAreaSqm: input.landAreaSqm ?? null,
    buildingAreaSqm: input.buildingAreaSqm ?? null,
    cadastralPolygon,
    cadastralAreaSqm,
    buildingPolygons,
    buildingPolygon,
    buildingFootprintAreaSqm,
    buildingPolygonCount: selection.detectedBuildingCount,
    buildingFootprintAreaSumSqm: polygonFootprintSumSqm,
    registryBuildingAreaSqm,
    detectedBuildingCount: selection.detectedBuildingCount,
    usedBuildingCount: selection.usedBuildingCount,
    excludedBuildingCount: selection.excludedBuildingCount,
    excludedBuildingReasons: selection.excluded.map((item) => item.reason),
  };
}

function resolveBuildingSourceRing(
  bundle: SiteGeometryBundle,
  center: LatLngPoint,
): { ring: LatLngPoint[]; layoutBoundarySource: LayoutBoundarySource; polygonSource: ModuleLayoutPolygonSource } | null {
  if (bundle.buildingPolygon && bundle.buildingPolygon.length >= 3) {
    const buildingArea = ringArea(bundle.buildingPolygon);
    const cadastralArea = bundle.cadastralAreaSqm;
    const looksLikeParcel =
      cadastralArea != null &&
      buildingArea != null &&
      buildingArea >= cadastralArea * 0.85;
    if (!looksLikeParcel) {
      return {
        ring: bundle.buildingPolygon,
        layoutBoundarySource: "building",
        polygonSource: "building",
      };
    }
  }

  const registryArea = bundle.buildingAreaSqm;
  if (registryArea != null && registryArea > 0) {
    if (bundle.cadastralPolygon && bundle.cadastralPolygon.length >= 3) {
      return {
        ring: deriveBuildingFootprintInParcel(bundle.cadastralPolygon, registryArea),
        layoutBoundarySource: "roof",
        polygonSource: "building",
      };
    }
    return {
      ring: createBuildingFootprintRectangle(center, registryArea),
      layoutBoundarySource: "roof",
      polygonSource: "building",
    };
  }

  return null;
}

/** 설치유형별 용량·가배치 기준 Polygon resolve */
export function resolveSiteGeometryFromBundle(
  bundle: SiteGeometryBundle,
  input: {
    lat: number;
    lng: number;
    capacityKw: number;
    installType: InstallTypeOption | string;
  },
): SiteGeometryResult {
  const center: LatLngPoint = { lat: input.lat, lng: input.lng };
  const isLand = input.installType === "토지형";
  const referenceCadastral =
    !isLand && bundle.cadastralPolygon && bundle.cadastralPolygon.length >= 3
      ? closeRing(normalizeRing(bundle.cadastralPolygon))
      : undefined;

  if (isLand) {
    const parcelSetbackM = layoutPolicy.parcelBoundarySetbackM;

    if (bundle.cadastralPolygon && bundle.cadastralPolygon.length >= 3) {
      const { sourceBoundary, setbackBoundary, boundary: setbackOnlyBoundary } = withSetback(
        bundle.cadastralPolygon,
        parcelSetbackM,
      );
      const finalized = finalizeLandLayoutBoundary({
        setbackBoundary: setbackOnlyBoundary,
        unionComponentCount: 1,
      });
      const landOriginalAreaSqm =
        bundle.cadastralAreaSqm ?? bundle.landAreaSqm ?? ringArea(sourceBoundary);
      const capacityAreaSqm =
        landOriginalAreaSqm ?? polygonAreaSqm(sourceBoundary);
      return {
        installType: input.installType,
        capacityBasis: "land",
        layoutBoundarySource: "cadastral",
        landAreaSqm: bundle.landAreaSqm,
        buildingFootprintAreaSqm: bundle.buildingFootprintAreaSqm,
        roofUsableAreaSqm: null,
        landOriginalAreaSqm,
        landUsableAreaSqm: finalized.landUsableAreaSqm,
        landUsableAreaSqmBeforeNarrowZone: ringArea(setbackOnlyBoundary),
        parcelBoundarySetbackM: parcelSetbackM,
        capacityAreaSqm,
        layoutBoundary: finalized.layoutBoundary,
        sourceBoundary,
        setbackBoundary: setbackOnlyBoundary,
        polygonSource: "cadastral",
        narrowZone: finalized.narrowZone,
      };
    }

    const virtualSource = closeRing(
      createVirtualParcelRectangle(center, input.capacityKw, input.installType),
    );
    const { sourceBoundary, setbackBoundary, boundary: setbackOnlyBoundary } = withSetback(
      virtualSource,
      parcelSetbackM,
    );
    const finalized = finalizeLandLayoutBoundary({
      setbackBoundary: setbackOnlyBoundary,
      unionComponentCount: 1,
    });
    const landOriginalAreaSqm = bundle.landAreaSqm ?? ringArea(sourceBoundary);
    const capacityAreaSqm = landOriginalAreaSqm ?? polygonAreaSqm(sourceBoundary);
    return {
      installType: input.installType,
      capacityBasis: "land",
      layoutBoundarySource: "virtual",
      landAreaSqm: bundle.landAreaSqm,
      buildingFootprintAreaSqm: bundle.buildingFootprintAreaSqm,
      roofUsableAreaSqm: null,
      landOriginalAreaSqm,
      landUsableAreaSqm: finalized.landUsableAreaSqm,
      landUsableAreaSqmBeforeNarrowZone: ringArea(setbackOnlyBoundary),
      parcelBoundarySetbackM: parcelSetbackM,
      capacityAreaSqm,
      layoutBoundary:
        finalized.layoutBoundary.length >= 3 ? finalized.layoutBoundary : setbackOnlyBoundary,
      sourceBoundary,
      setbackBoundary: setbackOnlyBoundary,
      polygonSource: "virtual",
      narrowZone: finalized.narrowZone,
    };
  }

  const buildingSource = resolveBuildingSourceRing(bundle, center);
  if (!buildingSource) {
    return {
      installType: input.installType,
      capacityBasis: "buildingRoof",
      layoutBoundarySource: "building",
      landAreaSqm: bundle.landAreaSqm,
      buildingFootprintAreaSqm: null,
      roofUsableAreaSqm: null,
      landUsableAreaSqm: null,
      capacityAreaSqm: 0,
      layoutBoundary: [],
      sourceBoundary: [],
      setbackBoundary: [],
      referenceCadastral,
      polygonSource: "building",
      detectedBuildingCount: bundle.detectedBuildingCount,
      usedBuildingCount: bundle.usedBuildingCount,
      excludedBuildingCount: bundle.excludedBuildingCount,
      excludedBuildingReasons: bundle.excludedBuildingReasons,
      registryBuildingAreaSqm: bundle.registryBuildingAreaSqm ?? bundle.buildingAreaSqm,
    };
  }

  const roofSetbackM = layoutPolicy.roofEdgeSetbackM;
  const buildingLayoutBoundaries: LatLngPoint[][] = [];
  const buildingSourceBoundaries: LatLngPoint[][] = [];
  for (const ring of bundle.buildingPolygons ?? []) {
    if (ring.length < 3) continue;
    const { sourceBoundary, setbackBoundary, boundary } = withSetback(ring, roofSetbackM);
    buildingSourceBoundaries.push(sourceBoundary);
    buildingLayoutBoundaries.push(boundary.length >= 3 ? boundary : setbackBoundary);
  }

  const primaryRing =
    buildingLayoutBoundaries[0]?.length >= 3
      ? bundle.buildingPolygons?.[0] ?? buildingSource.ring
      : buildingSource.ring;
  const { sourceBoundary, setbackBoundary, boundary } = withSetback(primaryRing, roofSetbackM);

  const footprintArea =
    bundle.buildingFootprintAreaSqm ??
    bundle.buildingFootprintAreaSumSqm ??
    ringArea(sourceBoundary) ??
    bundle.buildingAreaSqm ??
    0;
  const roofUsable =
    setbackRingsAreaSum(bundle.buildingPolygons, roofSetbackM) ?? ringArea(boundary) ?? 0;

  return {
    installType: input.installType,
    capacityBasis: "buildingRoof",
    layoutBoundarySource: buildingSource.layoutBoundarySource,
    landAreaSqm: bundle.landAreaSqm,
    buildingFootprintAreaSqm: footprintArea,
    buildingPolygonCount: bundle.buildingPolygonCount,
    buildingFootprintAreaSumSqm: bundle.buildingFootprintAreaSumSqm,
    roofUsableAreaSqm: roofUsable,
    landUsableAreaSqm: null,
    roofEdgeSetbackM: roofSetbackM,
    capacityAreaSqm: roofUsable,
    layoutBoundary: buildingLayoutBoundaries[0]?.length >= 3 ? buildingLayoutBoundaries[0] : boundary,
    sourceBoundary: buildingSourceBoundaries[0]?.length >= 3 ? buildingSourceBoundaries[0] : sourceBoundary,
    setbackBoundary: buildingLayoutBoundaries[0]?.length >= 3 ? buildingLayoutBoundaries[0] : setbackBoundary,
    buildingLayoutBoundaries:
      buildingLayoutBoundaries.length > 0 ? buildingLayoutBoundaries : undefined,
    buildingSourceBoundaries:
      buildingSourceBoundaries.length > 0 ? buildingSourceBoundaries : undefined,
    referenceCadastral,
    polygonSource: buildingSource.polygonSource,
    detectedBuildingCount: bundle.detectedBuildingCount,
    usedBuildingCount: bundle.usedBuildingCount ?? buildingLayoutBoundaries.length,
    excludedBuildingCount: bundle.excludedBuildingCount,
    excludedBuildingReasons: bundle.excludedBuildingReasons,
    registryBuildingAreaSqm: bundle.registryBuildingAreaSqm ?? bundle.buildingAreaSqm,
  };
}

export async function resolveSiteGeometry(input: {
  pnu?: string | null;
  lat: number;
  lng: number;
  capacityKw: number;
  installType: InstallTypeOption | string;
  landAreaSqm?: number | null;
  buildingAreaSqm?: number | null;
}): Promise<SiteGeometryResult> {
  const bundle = await fetchSiteGeometryBundle({
    pnu: input.pnu,
    lat: input.lat,
    lng: input.lng,
    landAreaSqm: input.landAreaSqm,
    buildingAreaSqm: input.buildingAreaSqm,
  });
  return resolveSiteGeometryFromBundle(bundle, input);
}

/** @deprecated resolveSiteGeometry 사용 */
export async function resolveLayoutBoundaryFromGeometry(input: {
  pnu?: string | null;
  lat: number;
  lng: number;
  capacityKw: number;
  installType: InstallTypeOption | string;
  landAreaSqm?: number | null;
  buildingAreaSqm?: number | null;
}) {
  const geometry = await resolveSiteGeometry(input);
  return {
    boundary: geometry.layoutBoundary,
    sourceBoundary: geometry.sourceBoundary,
    setbackBoundary: geometry.setbackBoundary,
    polygonSource: geometry.polygonSource,
    footprintKind:
      geometry.layoutBoundarySource === "building" || geometry.layoutBoundarySource === "roof"
        ? ("building" as const)
        : geometry.layoutBoundarySource === "virtual"
          ? ("virtual" as const)
          : ("parcel" as const),
    geometry,
  };
}
