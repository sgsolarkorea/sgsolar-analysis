import {
  fetchBuildingPolygonByPnu,
  fetchCadastralPolygonAtCoordinates,
  fetchCadastralPolygonByPnu,
} from "@/lib/api/vworld";
import type { InstallTypeOption } from "@/data/resultUx";
import { moduleLayoutConfig } from "@/data/moduleLayoutConfig";
import { createVirtualParcelRectangle } from "@/lib/solar/moduleLayout";
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

/** VWorld Polygon 원본 수집 — 설치유형 전환 시 재사용 */
export async function fetchSiteGeometryBundle(input: {
  pnu?: string | null;
  lat: number;
  lng: number;
  landAreaSqm?: number | null;
  buildingAreaSqm?: number | null;
}): Promise<SiteGeometryBundle> {
  const cadastralPolygon = await resolveCadastralRing(input.pnu, input.lat, input.lng);
  let buildingPolygon: LatLngPoint[] | null = null;

  if (input.pnu) {
    const building = await fetchBuildingPolygonByPnu(input.pnu, input.lat, input.lng);
    buildingPolygon = building?.ring?.length ? building.ring : null;
  }

  return {
    landAreaSqm: input.landAreaSqm ?? null,
    buildingAreaSqm: input.buildingAreaSqm ?? null,
    cadastralPolygon,
    cadastralAreaSqm: ringArea(cadastralPolygon),
    buildingPolygon,
    buildingFootprintAreaSqm: ringArea(buildingPolygon),
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
    if (bundle.cadastralPolygon && bundle.cadastralPolygon.length >= 3) {
      const { sourceBoundary, setbackBoundary, boundary } = withSetback(
        bundle.cadastralPolygon,
        moduleLayoutConfig.landSetbackM,
      );
      const capacityAreaSqm =
        bundle.cadastralAreaSqm ?? bundle.landAreaSqm ?? polygonAreaSqm(sourceBoundary);
      return {
        installType: input.installType,
        capacityBasis: "land",
        layoutBoundarySource: "cadastral",
        landAreaSqm: bundle.landAreaSqm,
        buildingFootprintAreaSqm: bundle.buildingFootprintAreaSqm,
        roofUsableAreaSqm: null,
        landUsableAreaSqm: ringArea(boundary),
        capacityAreaSqm,
        layoutBoundary: boundary,
        sourceBoundary,
        setbackBoundary,
        polygonSource: "cadastral",
      };
    }

    const virtualRing = closeRing(
      createVirtualParcelRectangle(center, input.capacityKw, input.installType),
    );
    const capacityAreaSqm = bundle.landAreaSqm ?? polygonAreaSqm(virtualRing);
    return {
      installType: input.installType,
      capacityBasis: "land",
      layoutBoundarySource: "virtual",
      landAreaSqm: bundle.landAreaSqm,
      buildingFootprintAreaSqm: bundle.buildingFootprintAreaSqm,
      roofUsableAreaSqm: null,
      landUsableAreaSqm: ringArea(virtualRing),
      capacityAreaSqm,
      layoutBoundary: virtualRing,
      sourceBoundary: virtualRing,
      setbackBoundary: virtualRing,
      polygonSource: "virtual",
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
    };
  }

  const { sourceBoundary, setbackBoundary, boundary } = withSetback(
    buildingSource.ring,
    moduleLayoutConfig.roofSetbackM,
  );
  const footprintArea =
    bundle.buildingFootprintAreaSqm ?? ringArea(sourceBoundary) ?? bundle.buildingAreaSqm ?? 0;
  const roofUsable = ringArea(boundary) ?? 0;

  return {
    installType: input.installType,
    capacityBasis: "buildingRoof",
    layoutBoundarySource: buildingSource.layoutBoundarySource,
    landAreaSqm: bundle.landAreaSqm,
    buildingFootprintAreaSqm: footprintArea,
    roofUsableAreaSqm: roofUsable,
    landUsableAreaSqm: null,
    capacityAreaSqm: footprintArea,
    layoutBoundary: boundary,
    sourceBoundary,
    setbackBoundary,
    referenceCadastral,
    polygonSource: buildingSource.polygonSource,
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
