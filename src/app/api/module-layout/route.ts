import { NextResponse } from "next/server";
import type { InstallTypeOption } from "@/data/resultUx";
import { INSTALL_TYPE_OPTIONS } from "@/data/resultUx";
import { layoutPolicy } from "@/data/moduleLayoutConfig";
import { computeModuleLayout, computeMultiBuildingRoofModuleLayout } from "@/lib/solar/moduleLayout";
import { resolveLayoutBoundary } from "@/lib/solar/resolveLayoutBoundary";
import type { SiteGeometryResult } from "@/types/siteGeometry";
import {
  computePolygonOrientation,
  polygonAreaSqm,
} from "@/lib/solar/polygonGeometry";
import type { LatLngPoint, ModuleLayoutDiagnostics } from "@/types/moduleLayout";
import type { LandBlockPlacementDiagnostics } from "@/lib/solar/landBlockLayout";
import type { RoofPlacementDiagnostics } from "@/lib/solar/moduleLayout";
import { resolveFinalCapacity } from "@/lib/solar/capacityResolution";
import { probeRoofFittingPolicies } from "@/lib/solar/roofFittingProbe";

function parseOptionalNumber(value: string | null): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function ringsMatch(a: LatLngPoint[], b: LatLngPoint[], tolerance = 1e-9): boolean {
  if (a.length !== b.length || a.length < 3) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i].lat - b[i].lat) > tolerance || Math.abs(a[i].lng - b[i].lng) > tolerance) {
      return false;
    }
  }
  return true;
}

function pointInLatLngPolygon(point: LatLngPoint, polygon: LatLngPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const denominator = yj - yi;
    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng <
        ((xj - xi) * (point.lat - yi)) /
          (Math.abs(denominator) < 1e-12 ? 1e-12 : denominator) +
          xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function countOutsideModules(input: {
  modules: { corners: LatLngPoint[] }[];
  boundary: LatLngPoint[];
}): number {
  if (input.boundary.length < 3) return 0;
  return input.modules.filter((mod) =>
    mod.corners.some((corner) => !pointInLatLngPolygon(corner, input.boundary)),
  ).length;
}

function buildDiagnostics(input: {
  geometry: SiteGeometryResult;
  polygonSource: ModuleLayoutDiagnostics["polygonSource"];
  boundary: LatLngPoint[];
  sourceBoundary: LatLngPoint[];
  setbackBoundary: LatLngPoint[];
  targetModuleCount: number;
  placedModuleCount: number;
  layoutMode: ModuleLayoutDiagnostics["layoutMode"];
  validSlotCount: number;
  layoutRowCount: number;
  rowModuleCounts: number[];
  polygonUtilizationPct: number;
  landLayout?: LandBlockPlacementDiagnostics;
  roofLayout?: RoofPlacementDiagnostics;
  arrayLayout?: import("@/lib/solar/arrayLayoutEngine").ArrayLayoutDiagnostics;
  polygonOutsideModuleCount?: number;
  multiBuildingLayoutRule?: string;
  placedModuleCountByBuilding?: number[];
  areaBasedCapacityKw: number;
  installType: InstallTypeOption;
}): ModuleLayoutDiagnostics {
  const orientationRad = computePolygonOrientation(input.boundary);
  const rawRing = input.sourceBoundary.length >= 3 ? input.sourceBoundary : input.boundary;
  const g = input.geometry;
  const land = input.landLayout;
  const roof = input.roofLayout;
  const array = input.arrayLayout;
  const layoutCapacityKw =
    array?.selectedPlacedKw ??
    land?.selectedPlacedKw ??
    (input.placedModuleCount > 0
      ? Math.round(input.placedModuleCount * 0.64 * 100) / 100
      : null);
  const capacityResolution = resolveFinalCapacity({
    installType: input.installType,
    areaBasedCapacityKw: input.areaBasedCapacityKw,
    layoutCapacityKw,
  });
  return {
    polygonSource: input.polygonSource,
    boundaryPointCount: input.boundary.length,
    polygonAreaSqm: Math.round(polygonAreaSqm(rawRing) * 100) / 100,
    usableAreaSqm: Math.round(polygonAreaSqm(input.boundary) * 100) / 100,
    setbackAreaSqm:
      input.setbackBoundary.length >= 3
        ? Math.round(polygonAreaSqm(input.setbackBoundary) * 100) / 100
        : undefined,
    boundaryMatchesSetback:
      input.setbackBoundary.length >= 3
        ? ringsMatch(input.boundary, input.setbackBoundary)
        : undefined,
    targetModuleCount: input.targetModuleCount,
    placedModuleCount: input.placedModuleCount,
    layoutMode: input.layoutMode,
    orientationDegrees: Math.round(((orientationRad * 180) / Math.PI) * 100) / 100,
    validSlotCount: input.validSlotCount,
    layoutRowCount: input.layoutRowCount,
    rowModuleCounts: input.rowModuleCounts,
    polygonUtilizationPct: input.polygonUtilizationPct,
    renderModuleCount: input.placedModuleCount,
    installType: String(g.installType),
    capacityBasis: g.capacityBasis,
    landAreaSqm: g.landAreaSqm,
    buildingFootprintAreaSqm: g.buildingFootprintAreaSqm,
    buildingPolygonCount: g.buildingPolygonCount,
    buildingFootprintAreaSumSqm: g.buildingFootprintAreaSumSqm,
    roofUsableAreaSqm: g.roofUsableAreaSqm,
    layoutBoundarySource: g.layoutBoundarySource,
    layoutTier: land?.layoutTier,
    blockCount: land?.blockCount,
    blockModuleCounts: land?.blockModuleCounts,
    rowCount: land?.rowCount,
    selectedAzimuthDegrees: land?.selectedAzimuthDegrees,
    candidateAzimuths: land?.candidateAzimuths,
    candidateScores: land?.candidateScores,
    candidatePlacedCounts: land?.candidatePlacedCounts,
    selectedReason: land?.selectedReason,
    capacityLayoutRule: land?.capacityLayoutRule,
    singleBlockRejectedReason: land?.singleBlockRejectedReason,
    unusedAreaReason: land?.unusedAreaReason,
    arrayCount: land?.arrayCount,
    arrayTierCount: land?.arrayTierCount,
    tierRowsPerArray: land?.tierRowsPerArray,
    arrayModuleCounts: land?.arrayModuleCounts,
    aisleM: land?.aisleM,
    aisleApplied: land?.aisleApplied,
    fillStrategy: land?.fillStrategy,
    medianSplitUsed: land?.medianSplitUsed,
    rowGenerationPattern: land?.rowGenerationPattern,
    unusedAreaRatio: land?.unusedAreaRatio,
    twoTierSetCount: land?.twoTierSetCount,
    twoTierSetModuleCounts: land?.twoTierSetModuleCounts,
    innerTierGapM: land?.innerTierGapM,
    setAisleM: land?.setAisleM,
    visualScale: land?.visualScale,
    arrayBlockCount: land?.arrayBlockCount,
    arrayBlocks: land?.arrayBlocks,
    mainAisleM: land?.mainAisleM,
    mainAisleApplied: land?.mainAisleApplied,
    arrayBlockModuleCounts: land?.arrayBlockModuleCounts,
    arrayBlockRowCounts: land?.arrayBlockRowCounts,
    arrayBlockBoundingBoxes: land?.arrayBlockBoundingBoxes,
    polygonOutsideModuleCount: input.polygonOutsideModuleCount,
    roofFillStrategy: roof?.roofFillStrategy,
    roofCenteringApplied: roof?.roofCenteringApplied,
    roofUnusedAreaRatio: roof?.roofUnusedAreaRatio,
    selectedSlotBoundingBox: roof?.selectedSlotBoundingBox,
    roofPolygonBoundingBox: roof?.roofPolygonBoundingBox,
    centerOffsetM: roof?.centerOffsetM,
    sequentialFillRejectedReason: roof?.sequentialFillRejectedReason,
    registryBuildingAreaSqm: g.registryBuildingAreaSqm,
    detectedBuildingCount: g.detectedBuildingCount,
    usedBuildingCount: g.usedBuildingCount,
    excludedBuildingCount: g.excludedBuildingCount,
    excludedBuildingReasons: g.excludedBuildingReasons,
    multiBuildingLayoutRule: input.multiBuildingLayoutRule,
    roofEdgeSetbackM: g.roofEdgeSetbackM,
    parcelBoundarySetbackM: g.parcelBoundarySetbackM,
    landOriginalAreaSqm: g.landOriginalAreaSqm,
    landUsableAreaSqm: g.landUsableAreaSqm,
    dualArraySetAisleM: layoutPolicy.dualArraySetAisleM,
    roofDualArraySetAisleM: layoutPolicy.roofDualArraySetAisleM,
    roofContinuousRowGapM: layoutPolicy.roofContinuousRowGapM,
    mergedParcelCount: g.mergedParcelCount,
    mergedParcelPnus: g.mergedParcelPnus,
    unionComponentCount: g.unionComponentCount,
    mergedParcelRingCount: g.mergedParcelRingCount,
    narrowZonePolicyApplied: g.narrowZone?.narrowZonePolicyApplied,
    usableComponentCount: g.narrowZone?.usableComponentCount,
    selectedComponentAreaSqm: g.narrowZone?.selectedComponentAreaSqm,
    excludedComponentAreaSqm: g.narrowZone?.excludedComponentAreaSqm,
    excludedNarrowAreaSqm: g.narrowZone?.excludedNarrowAreaSqm,
    narrowZoneReason: g.narrowZone?.narrowZoneReason,
    estimatedMinWidthM: g.narrowZone?.estimatedMinWidthM,
    minLocalWidthM: g.narrowZone?.minLocalWidthM,
    narrowWidthThresholdM: g.narrowZone?.narrowWidthThresholdM,
    landUsableAreaSqmBeforeNarrowZone: g.landUsableAreaSqmBeforeNarrowZone,
    dualSetCount: array?.dualSetCount,
    continuousMaxFill: array?.continuousMaxFill,
    dualMaxFill: array?.dualMaxFill,
    appliedDualAisleM: array?.appliedDualAisleM,
    dualAisleEffective: array?.dualAisleEffective,
    roofDualReason: array?.roofDualReason,
    moduleOrientationMode: array?.moduleOrientationMode,
    portraitPlacedModuleCount: array?.portraitPlacedModuleCount,
    landscapePlacedModuleCount: array?.landscapePlacedModuleCount,
    mixedPlacedModuleCount: array?.mixedPlacedModuleCount,
    selectedOrientationMode: array?.selectedOrientationMode,
    selectedOrientationDegrees: array?.selectedOrientationDegrees,
    maxFillPlacedModuleCount: array?.maxFillPlacedModuleCount,
    targetQuotaPlacedModuleCount: array?.targetQuotaPlacedModuleCount,
    targetQuotaLimited: array?.targetQuotaLimited,
    strictPlacedModuleCount: array?.strictPlacedModuleCount,
    edgeTolerancePlacedModuleCount: array?.edgeTolerancePlacedModuleCount,
    selectedFittingPolicy: array?.selectedFittingPolicy,
    selectedToleranceM: array?.selectedToleranceM,
    targetQuotaUsedForLayout: array?.targetQuotaUsedForLayout,
    dualTargetQuotaLimited: array?.dualTargetQuotaLimited,
    roofContinuousReason: array?.roofContinuousReason,
    actualModuleShortM: array?.actualModuleShortM,
    actualModuleLongM: array?.actualModuleLongM,
    renderScale: array?.renderScale,
    fittingModuleWidthM: array?.fittingModuleWidthM,
    fittingModuleHeightM: array?.fittingModuleHeightM,
    selectedRowGapM: array?.selectedRowGapM,
    roofContinuousRowGapReferenceM: array?.roofContinuousRowGapReferenceM,
    selectedBandSlotCount: array?.selectedBandSlotCount,
    unselectedValidSlotCount: array?.unselectedValidSlotCount,
    bandSelectionReason: array?.bandSelectionReason,
    continuousPlacedModuleCount: array?.continuousPlacedModuleCount ?? land?.continuousPlacedModuleCount,
    continuousPlacedKw: array?.continuousPlacedKw ?? land?.continuousPlacedKw,
    dualPlacedModuleCount: array?.dualPlacedModuleCount ?? land?.dualPlacedModuleCount,
    dualPlacedKw: array?.dualPlacedKw ?? land?.dualPlacedKw,
    selectedPlacedModuleCount: array?.selectedPlacedModuleCount ?? land?.selectedPlacedModuleCount ?? input.placedModuleCount,
    selectedPlacedKw: layoutCapacityKw ?? undefined,
    layoutSelectionReason: array?.layoutSelectionReason ?? land?.layoutSelectionReason,
    areaBasedCapacityKw: capacityResolution.areaBasedCapacityKw,
    layoutCapacityKw: capacityResolution.layoutCapacityKw ?? undefined,
    capacityResolutionPolicy: capacityResolution.policy,
    capacityLimitingFactor: capacityResolution.capacityLimitingFactor,
    finalPlacedModuleCount:
      input.installType === "토지형"
        ? capacityResolution.finalModuleCount
        : (array?.selectedPlacedModuleCount ?? input.placedModuleCount),
    finalCapacityKw: capacityResolution.finalCapacityKw,
    placedModuleCountByBuilding: input.placedModuleCountByBuilding,
  };
}

function parseParcelRefs(raw: string | null): Array<{ pnu: string; lat: number; lng: number }> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const pnu = typeof record.pnu === "string" ? record.pnu.trim() : "";
        const lat = Number(record.lat);
        const lng = Number(record.lng);
        if (!pnu || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { pnu, lat, lng };
      })
      .filter((item): item is { pnu: string; lat: number; lng: number } => item != null);
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pnu = searchParams.get("pnu")?.trim() ?? "";
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const capacityKw = Number(searchParams.get("capacityKw"));
  const installTypeRaw = searchParams.get("installType")?.trim() ?? "토지형";
  const moduleCountRaw = searchParams.get("moduleCount");
  const buildingAreaSqm = parseOptionalNumber(searchParams.get("buildingAreaSqm"));
  const landAreaSqm = parseOptionalNumber(searchParams.get("landAreaSqm"));
  const polygonDebug = searchParams.get("polygonDebug");
  const overlayRaw = polygonDebug === "raw";
  const overlayCompare = polygonDebug === "compare" || polygonDebug === "roof";
  const overlayRoofDebug = polygonDebug === "roof";
  const roofFittingProbeEnabled =
    searchParams.get("roofFittingProbe") === "1" || overlayRoofDebug;
  const overlayOnly =
    (overlayRaw ||
      overlayCompare ||
      searchParams.get("overlayOnly") === "1" ||
      polygonDebug === "1") &&
    !overlayRoofDebug;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  if (!Number.isFinite(capacityKw) || capacityKw <= 0) {
    return NextResponse.json({ error: "capacityKw required" }, { status: 400 });
  }

  const installType = INSTALL_TYPE_OPTIONS.includes(installTypeRaw as InstallTypeOption)
    ? (installTypeRaw as InstallTypeOption)
    : "토지형";

  const moduleCount =
    moduleCountRaw != null && moduleCountRaw !== ""
      ? Number(moduleCountRaw)
      : undefined;

  const parcelRefs = parseParcelRefs(searchParams.get("parcels"));
  const multiParcelLand = installType === "토지형" && parcelRefs.length > 1;

  const { boundary, sourceBoundary, setbackBoundary, polygonSource, geometry } =
    await resolveLayoutBoundary({
      pnu: pnu || undefined,
      lat,
      lng,
      capacityKw,
      installType,
      buildingAreaSqm,
      landAreaSqm,
      parcels: multiParcelLand ? parcelRefs : undefined,
    });

  if (boundary.length < 3) {
    return NextResponse.json(
      {
        error:
          "필지·건물 경계를 불러오지 못했습니다. VWorld 폴리곤 조회를 확인해 주세요.",
      },
      { status: 503 },
    );
  }

  const layout =
    installType !== "토지형" &&
    geometry.buildingLayoutBoundaries &&
    geometry.buildingLayoutBoundaries.length > 1
      ? computeMultiBuildingRoofModuleLayout({
          boundaries: geometry.buildingLayoutBoundaries,
          polygonSource,
          capacityKw,
          installType,
          moduleCount: Number.isFinite(moduleCount) ? moduleCount : undefined,
          centerLat: lat,
          centerLng: lng,
        })
      : computeModuleLayout({
          boundary,
          polygonSource,
          capacityKw,
          installType,
          moduleCount: Number.isFinite(moduleCount) ? moduleCount : undefined,
          centerLat: lat,
          centerLng: lng,
        });

  const diagnostics = buildDiagnostics({
    geometry,
    polygonSource,
    boundary: layout.boundary,
    sourceBoundary: sourceBoundary.length >= 3 ? sourceBoundary : layout.boundary,
    setbackBoundary: setbackBoundary.length >= 3 ? setbackBoundary : layout.boundary,
    targetModuleCount: layout.stats.targetModuleCount,
    placedModuleCount: layout.stats.placedModuleCount,
    layoutMode: layout.stats.layoutMode,
    validSlotCount: layout.stats.validSlotCount,
    layoutRowCount: layout.stats.layoutRowCount,
    rowModuleCounts: layout.stats.rowModuleCounts,
    polygonUtilizationPct: layout.stats.polygonUtilizationPct,
    landLayout: layout.landLayoutDiagnostics,
    roofLayout: layout.roofLayoutDiagnostics,
    arrayLayout: layout.arrayLayoutDiagnostics,
    placedModuleCountByBuilding: layout.arrayLayoutDiagnostics?.placedModuleCountByBuilding,
    polygonOutsideModuleCount: countOutsideModules({
      modules: layout.modules,
      boundary: layout.boundary,
    }),
    multiBuildingLayoutRule: layout.stats.capacityLayoutRule?.startsWith("multi-building-roof")
      ? layout.stats.capacityLayoutRule
      : undefined,
    areaBasedCapacityKw: capacityKw,
    installType,
  });

  if (!overlayOnly && layout.stats.placedModuleCount <= 0) {
    return NextResponse.json(
      { error: "배치 가능한 모듈 영역을 찾지 못했습니다.", diagnostics },
      { status: 503 },
    );
  }

  const includePolygonDebugFields = overlayRaw || overlayCompare || overlayRoofDebug;

  const roofFittingProbe =
    roofFittingProbeEnabled &&
    installType !== "토지형" &&
    sourceBoundary.length >= 3 &&
    boundary.length >= 3
      ? probeRoofFittingPolicies({
          sourceBoundary,
          layoutBoundary: boundary,
          setbackBoundary: setbackBoundary.length >= 3 ? setbackBoundary : boundary,
          placedModules: layout.modules,
          address: searchParams.get("address") ?? undefined,
        })
      : undefined;

  return NextResponse.json({
    ...layout,
    modules: overlayOnly ? [] : layout.modules,
    sourceBoundary:
      includePolygonDebugFields && sourceBoundary.length >= 3 ? sourceBoundary : undefined,
    setbackBoundary:
      includePolygonDebugFields && setbackBoundary.length >= 3 ? setbackBoundary : undefined,
    diagnostics,
    overlayOnly,
    overlayRaw,
    overlayCompare,
    overlayRoofDebug,
    roofFittingProbe,
    roofDebugOverlay: roofFittingProbe?.debugOverlay,
    referenceCadastral:
      geometry.referenceCadastral && geometry.referenceCadastral.length >= 3
        ? geometry.referenceCadastral
        : undefined,
  });
}
