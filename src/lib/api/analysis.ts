/**
 * SG SOLAR 입지검토 API 연동 레이어
 */

import { areaPerKwByType } from "@/data/solarConfig";
import { unstable_cache } from "next/cache";
import { getTodayString, result } from "@/data/sampleData";
import { deriveSiteRecommendation, resolveDefaultInstallType } from "@/data/resultUx";
import type { InstallTypeOption } from "@/data/resultUx";
import { getBuildingRegistryLookup } from "@/lib/api/buildingRegistry";
import {
  hasLandRecord,
  resolveInfoDataSource,
  unavailableLandInfo,
} from "@/lib/api/infoFallbacks";
import { parseJibunLot } from "@/lib/api/jibunParser";
import { fetchLegalDongCodesByCoord, searchAddressByKakao } from "@/lib/api/kakao";
import { getMarketPrice } from "@/lib/api/market";
import { buildPnu } from "@/lib/api/pnu";
import { parseCapacityKw, type CaseRecommendInput } from "@/lib/api/recommendCases";
import { recommendCaseStudies } from "@/lib/api/recommendCaseStudies";
import type { RecommendedCaseStudy } from "@/data/caseStudies";
import { getLandInfoByPnu, getLandInfoByVworld } from "@/lib/api/vworld";
import { resolveRegionDistrictAnalysis } from "@/lib/regulatory/resolveRegionDistrictAnalysis";
import { buildLayerARegulatoryAnalysis } from "@/lib/regulatory/buildLayerARegulatory";
import { buildSetbackFromGis } from "@/lib/regulatory/buildSetbackFromGis";
import { buildDefaultSetbackReview } from "@/lib/regulatory/resolveRegulatoryReview";
import { resolveSiteIntel } from "@/lib/gis/siteIntel";
import type { LandInfoDetail } from "@/types/landInfo";
import { resolveBuildingCapacityFootprintSqm } from "@/lib/solar/buildingFootprintSelection";
import {
  fetchSiteGeometryBundle,
  resolveSiteGeometryFromBundle,
} from "@/lib/solar/resolveSiteGeometry";
import {
  calculateSolarMetrics,
  formatCapacityDisplay,
  formatConstructionDisplay,
  formatGenerationDisplay,
  formatRevenueDisplay,
  getFieldValue,
  parseAreaSqm,
} from "@/lib/solar/calculate";
import { extractAreasForDebug, logSolarCalculationDebug } from "@/lib/solar/debug";
import type {
  GridInfo,
  InfoField,
  Profitability,
  ResolvedSiteReview,
  SolarMetrics,
} from "@/types/siteReview";
import type { SiteGeometryBundle } from "@/types/siteGeometry";

export interface ProfitabilityInput {
  address: string;
  jibunAddress?: string;
  landInfo: InfoField[];
  buildingInfo: InfoField[];
}

export async function getBuildingInfo(input: {
  pnu: string | null;
  buildingName?: string;
}): Promise<InfoField[]> {
  const result = await getBuildingRegistryLookup(input);
  return result.fields;
}

export async function getGridInfo(input: {
  lat: number;
  lng: number;
  address: string;
  jibunAddress: string;
  capacityKw: number;
  pnu?: string;
  poleId?: string;
}): Promise<GridInfo> {
  const { resolveGridConnection } = await import("@/lib/grid/resolve");
  return resolveGridConnection(input);
}

export async function calculateSolarProfitability(
  input: ProfitabilityInput & {
    hasRoadAddress?: boolean;
    capacityAreaSqm?: number;
    capacityBasis?: "land" | "buildingRoof";
    displayLandAreaSqm?: number | null;
    displayBuildingFootprintAreaSqm?: number | null;
    buildingPolygonCount?: number;
    buildingFootprintAreaSumSqm?: number | null;
    displayRoofUsableAreaSqm?: number | null;
    displayUsableAreaSqm?: number | null;
    detectedBuildingCount?: number;
    usedBuildingCount?: number;
    excludedBuildingCount?: number;
    registryBuildingAreaSqm?: number | null;
    /** When provided, skips duplicate market fetch (core path parallelization). */
    marketPreloaded?: Awaited<ReturnType<typeof getMarketPrice>>;
  },
): Promise<{
  profitability: Profitability;
  solarMetrics: SolarMetrics;
  monthlyGeneration: ReturnType<typeof calculateSolarMetrics>["monthlyGeneration"];
  installType: ReturnType<typeof resolveDefaultInstallType>;
}> {
  const market =
    input.marketPreloaded ??
    (await getMarketPrice({
      address: input.address,
      jibunAddress: input.jibunAddress,
    }));
  const marketSnapshot = {
    smpPrice: market.smpPrice,
    recPrice: market.recPrice,
    smpDate: market.smpDate,
    recDate: market.recDate,
    source: market.source,
    isFallback: market.isFallback,
    smpRegion: market.smpRegion,
    smpChange: market.smpChange,
    recChange: market.recChange,
  };
  const installType = resolveDefaultInstallType("", input.landInfo, input.buildingInfo, {
    hasRoadAddress: input.hasRoadAddress,
  });

  const calc = calculateSolarMetrics({
    installType,
    landInfo: input.landInfo,
    buildingInfo: input.buildingInfo,
    market: marketSnapshot,
    capacityAreaSqm: input.capacityAreaSqm,
    capacityBasis: input.capacityBasis,
    displayLandAreaSqm: input.displayLandAreaSqm,
    displayBuildingFootprintAreaSqm: input.displayBuildingFootprintAreaSqm,
    buildingPolygonCount: input.buildingPolygonCount,
    buildingFootprintAreaSumSqm: input.buildingFootprintAreaSumSqm,
    displayRoofUsableAreaSqm: input.displayRoofUsableAreaSqm,
    displayUsableAreaSqm: input.displayUsableAreaSqm,
    detectedBuildingCount: input.detectedBuildingCount,
    usedBuildingCount: input.usedBuildingCount,
    excludedBuildingCount: input.excludedBuildingCount,
    registryBuildingAreaSqm: input.registryBuildingAreaSqm,
  });

  const areas = extractAreasForDebug(input.landInfo, input.buildingInfo);
  logSolarCalculationDebug({
    address: input.address,
    buildingArea: areas.buildingArea,
    landArea: areas.landArea,
    buildingUse: areas.buildingUse,
    buildingAreaRaw: areas.buildingAreaRaw,
    landAreaRaw: areas.landAreaRaw,
    defaultInstallType: calc.metrics.installType,
    estimatedCapacity: calc.profitability.estimatedCapacity ?? formatCapacityDisplay(calc.capacityKw),
    calculatedCapacityKw: calc.capacityKw,
    buildingDataSource: resolveInfoDataSource(input.buildingInfo, "건축면적"),
    landDataSource: resolveInfoDataSource(input.landInfo, "면적"),
    source: "calculateSolarProfitability",
  });

  return {
    profitability: calc.profitability,
    solarMetrics: calc.metrics,
    monthlyGeneration: calc.monthlyGeneration,
    installType,
  };
}

export async function getRecommendedCases(
  input: CaseRecommendInput & {
    installType?: InstallTypeOption;
    capacityKw?: number;
  },
): Promise<RecommendedCaseStudy[]> {
  const installType =
    input.installType ??
    resolveDefaultInstallType(input.recommendation, input.landInfo, input.buildingInfo);
  const capacityKw =
    input.capacityKw != null && input.capacityKw > 0
      ? input.capacityKw
      : parseCapacityKw(input.capacity);

  return recommendCaseStudies({
    installType,
    capacityKw,
    address: input.address,
    jibunAddress: input.jibunAddress,
  });
}

async function resolvePnuForBuildingLookup(
  geo: Awaited<ReturnType<typeof searchAddressByKakao>>,
  vworldPnu: string | null,
): Promise<{ pnu: string | null; pnuSource: "vworld" | "kakao-jibun-fallback" | "none" }> {
  if (vworldPnu) {
    return { pnu: vworldPnu, pnuSource: "vworld" };
  }

  const lot = parseJibunLot(geo.jibunAddress);
  const legalDong = await fetchLegalDongCodesByCoord(geo.lat, geo.lng);

  if (!lot || !legalDong) {
    console.warn("[Analysis] PNU fallback unavailable — missing jibun lot or legal dong code", {
      jibunAddress: geo.jibunAddress,
      lot,
      legalDong,
    });
    return { pnu: null, pnuSource: "none" };
  }

  const pnu = buildPnu({
    sigunguCd: legalDong.sigunguCd,
    bjdongCd: legalDong.bjdongCd,
    platGbCd: lot.platGbCd,
    bun: lot.bun,
    ji: lot.ji,
  });

  console.info("[Analysis] PNU resolved via Kakao coord + jibun fallback", { pnu });
  return { pnu, pnuSource: "kakao-jibun-fallback" };
}

function hasRoadAddress(address: string): boolean {
  return /(?:\d+\s*(?:번길|길|로|대로))/.test(address);
}

export async function analyzeSolarSite(
  address: string,
  options?: { phase?: "core" | "full" },
): Promise<ResolvedSiteReview> {
  const perfLabel = `[Analysis] ${address.trim()}`;
  const t0 = Date.now();
  console.info(`${perfLabel} start`);

  const geo = await searchAddressByKakao(address);
  console.info(`${perfLabel} geocoding ${Date.now() - t0}ms`);

  // Start market fetch immediately — independent of land/building/geometry
  const marketPromise = getMarketPrice({
    address: geo.address,
    jibunAddress: geo.jibunAddress,
  });

  // Prefer VWorld land (includes PNU). Only hit Kakao PNU fallback when needed.
  const tLand = Date.now();
  let landResult = await getLandInfoByVworld(geo.lat, geo.lng);
  let pnu = landResult.pnu;
  let pnuSource: "vworld" | "kakao-jibun-fallback" | "none" = landResult.pnu ? "vworld" : "none";

  if (!pnu) {
    const resolved = await resolvePnuForBuildingLookup(geo, null);
    pnu = resolved.pnu;
    pnuSource = resolved.pnuSource;
    if (pnu && !hasLandRecord(landResult.landInfo)) {
      const landByPnu = await getLandInfoByPnu(pnu);
      if (landByPnu && hasLandRecord(landByPnu.landInfo)) {
        landResult = landByPnu;
        console.info("[Analysis] Land info resolved via Kakao PNU fallback", { pnu });
      }
    }
  }
  console.info(`${perfLabel} land ${Date.now() - tLand}ms`);

  const effectivePnu = landResult.pnu ?? pnu;
  let landInfo = landResult.landInfo;
  let landInfoDetail: LandInfoDetail = landResult.landDetail;
  if (!hasLandRecord(landInfo)) {
    landInfo = unavailableLandInfo();
    if (effectivePnu) {
      console.warn("[Analysis] Land info unavailable after VWorld + PNU lookup", { pnu: effectivePnu });
    }
  }

  const landAreaSqm = parseAreaSqm(getFieldValue(landInfo, "면적"));
  const isCorePhase = options?.phase === "core";

  const tBldGeom = Date.now();
  let buildingLookup: Awaited<ReturnType<typeof getBuildingRegistryLookup>>;
  let siteGeometryBundleRaw: SiteGeometryBundle;

  if (isCorePhase) {
    // First-useful: skip VWorld polygon round-trips. Capacity uses land/building registry areas;
    // background `full` enrich fills cadastral/building polygons for map layout.
    buildingLookup = await getBuildingRegistryLookup({
      pnu: effectivePnu,
      buildingName: geo.buildingName,
    });
    const provisionalBuildingArea = parseAreaSqm(
      getFieldValue(buildingLookup.fields, "건축면적"),
    );
    siteGeometryBundleRaw = {
      landAreaSqm,
      buildingAreaSqm: provisionalBuildingArea,
      cadastralPolygon: null,
      cadastralAreaSqm: null,
      buildingPolygons: [],
      buildingPolygon: null,
      buildingFootprintAreaSqm: provisionalBuildingArea ?? 0,
      buildingPolygonCount: 0,
      buildingFootprintAreaSumSqm: null,
      registryBuildingAreaSqm: provisionalBuildingArea,
      detectedBuildingCount: buildingLookup.itemCount,
      usedBuildingCount: provisionalBuildingArea && provisionalBuildingArea > 0 ? Math.max(1, buildingLookup.itemCount) : 0,
      excludedBuildingCount: 0,
    };
    console.info(`${perfLabel} building+geometry(core-deferred) ${Date.now() - tBldGeom}ms`);
  } else {
    [buildingLookup, siteGeometryBundleRaw] = await Promise.all([
      getBuildingRegistryLookup({
        pnu: effectivePnu,
        buildingName: geo.buildingName,
      }),
      fetchSiteGeometryBundle({
        pnu: effectivePnu,
        lat: geo.lat,
        lng: geo.lng,
        landAreaSqm,
        buildingAreaSqm: null,
        registryBuildingCount: 0,
      }),
    ]);
    console.info(`${perfLabel} building+geometry ${Date.now() - tBldGeom}ms`);
  }

  const buildingInfo = buildingLookup.fields;
  const registryBuildingCount = buildingLookup.itemCount;
  const buildingAreaSqm = parseAreaSqm(getFieldValue(buildingInfo, "건축면적"));

  // Re-apply registry footprint without a second network round-trip
  const siteGeometryBundle: SiteGeometryBundle = {
    ...siteGeometryBundleRaw,
    buildingAreaSqm,
    registryBuildingAreaSqm: buildingAreaSqm,
    buildingFootprintAreaSqm: resolveBuildingCapacityFootprintSqm({
      polygonFootprintSumSqm: siteGeometryBundleRaw.buildingFootprintAreaSumSqm ?? null,
      registryBuildingAreaSqm: buildingAreaSqm,
      usedBuildingCount: siteGeometryBundleRaw.usedBuildingCount ?? 0,
      registryBuildingCount,
    }),
  };

  const defaultInstallType = resolveDefaultInstallType("", landInfo, buildingInfo, {
    hasRoadAddress: hasRoadAddress(geo.address),
  });

  const siteGeometry = resolveSiteGeometryFromBundle(siteGeometryBundle, {
    lat: geo.lat,
    lng: geo.lng,
    capacityKw: 1,
    installType: defaultInstallType,
  });

  const tMarket = Date.now();
  const marketPreloaded = await marketPromise;
  console.info(`${perfLabel} market(ready) ${Date.now() - tMarket}ms (parallel overlap)`);

  const solarResult = await calculateSolarProfitability({
    address: geo.address,
    jibunAddress: geo.jibunAddress,
    landInfo,
    buildingInfo,
    hasRoadAddress: hasRoadAddress(geo.address),
    capacityAreaSqm: siteGeometry.capacityAreaSqm,
    capacityBasis: siteGeometry.capacityBasis,
    displayLandAreaSqm: siteGeometry.landAreaSqm,
    displayBuildingFootprintAreaSqm: siteGeometry.buildingFootprintAreaSqm,
    buildingPolygonCount: siteGeometry.buildingPolygonCount,
    buildingFootprintAreaSumSqm: siteGeometry.buildingFootprintAreaSumSqm,
    displayRoofUsableAreaSqm: siteGeometry.roofUsableAreaSqm,
    displayUsableAreaSqm: siteGeometry.landUsableAreaSqm ?? siteGeometry.roofUsableAreaSqm,
    detectedBuildingCount: siteGeometry.detectedBuildingCount,
    usedBuildingCount: siteGeometry.usedBuildingCount,
    excludedBuildingCount: siteGeometry.excludedBuildingCount,
    registryBuildingAreaSqm: siteGeometry.registryBuildingAreaSqm,
    marketPreloaded,
  });

  const { profitability, solarMetrics, monthlyGeneration } = solarResult;

  const recommendation = deriveSiteRecommendation(
    solarMetrics.installType as ReturnType<typeof resolveDefaultInstallType>,
    buildingInfo,
  );

  const capacity = formatCapacityDisplay(solarMetrics.capacityKw);
  const annualGeneration = formatGenerationDisplay(solarMetrics.annualGenerationKwh);
  const annualRevenue = formatRevenueDisplay(solarMetrics.totalRevenueWon);
  const constructionCost = formatConstructionDisplay(solarMetrics.constructionCostWon);

  logSolarCalculationDebug({
    address: geo.address,
    ...extractAreasForDebug(landInfo, buildingInfo),
    defaultInstallType: solarMetrics.installType,
    estimatedCapacity: profitability.estimatedCapacity ?? formatCapacityDisplay(solarMetrics.capacityKw),
    calculatedCapacityKw: solarMetrics.capacityKw,
    buildingDataSource: resolveInfoDataSource(buildingInfo, "건축면적"),
    landDataSource: resolveInfoDataSource(landInfo, "면적"),
    pnu: effectivePnu,
    pnuSource: landResult.pnu ? "vworld" : pnuSource,
    source: "analyzeSolarSite",
  });

  const skipGisDetail = options?.phase === "core";

  const [recommendedCasesResult, gridInfo, siteIntel] = await Promise.all([
    getRecommendedCases({
      address: geo.address,
      jibunAddress: geo.jibunAddress,
      landInfo,
      buildingInfo,
      capacity,
      recommendation,
      installType: solarMetrics.installType as InstallTypeOption,
      capacityKw: solarMetrics.capacityKw,
    }),
    skipGisDetail
      ? import("@/lib/grid/resolve").then(({ resolveGridConnectionDeferred }) =>
          resolveGridConnectionDeferred({
            lat: geo.lat,
            lng: geo.lng,
            address: geo.address,
            jibunAddress: geo.jibunAddress,
            capacityKw: solarMetrics.capacityKw,
            pnu: effectivePnu ?? undefined,
          }),
        )
      : getGridInfo({
          lat: geo.lat,
          lng: geo.lng,
          address: geo.address,
          jibunAddress: geo.jibunAddress,
          capacityKw: solarMetrics.capacityKw,
          pnu: effectivePnu ?? undefined,
        }),
    skipGisDetail || effectivePnu == null || effectivePnu === ""
      ? Promise.resolve(null)
      : resolveSiteIntel({ pnu: effectivePnu, lat: geo.lat, lng: geo.lng }),
  ]);

  const recommendedCases = recommendedCasesResult;

  const regionDistrictAnalysis = resolveRegionDistrictAnalysis(
    landInfo,
    landInfoDetail,
    siteIntel?.landUseAttributes,
    siteIntel?.meta.collectedAt,
  );
  const layerARegulatoryAnalysis = buildLayerARegulatoryAnalysis(
    siteIntel?.landUseAttributes ?? [],
    siteIntel?.meta.collectedAt,
  );

  const setbackReview =
    !skipGisDetail && siteIntel?.parcel
      ? await buildSetbackFromGis(siteIntel.parcel, {
          installType: solarMetrics.installType,
          address: geo.address,
          jibunAddress: geo.jibunAddress,
        })
      : buildDefaultSetbackReview(solarMetrics.installType, geo.address, geo.jibunAddress);

  console.info(`${perfLabel} complete ${Date.now() - t0}ms`);

  return {
    address: geo.address,
    jibunAddress: geo.jibunAddress,
    pnu: effectivePnu ?? "",
    lat: geo.lat,
    lng: geo.lng,
    buildingName: geo.buildingName,
    zoneNo: geo.zoneNo,
    analyzedAt: getTodayString(),
    consultationDefaultAddress: geo.address,
    landInfo,
    landInfoDetail,
    regionDistrictAnalysis,
    layerARegulatoryAnalysis,
    setbackReview,
    buildingInfo,
    gridInfo,
    profitability,
    solarMetrics,
    monthlyGeneration,
    recommendation,
    capacity,
    annualGeneration,
    annualRevenue,
    constructionCost,
    recommendedCases,
    recommendedBusinessTypes: result.recommendedBusinessTypes,
    businessTypeOptions: result.businessTypeOptions,
    ordinanceInfo: result.ordinanceInfo,
    suitability: result.suitability,
    siteGeometryBundle,
  };
}

/** 로딩 화면 prefetch와 결과 페이지 SSR 간 중복 분석 방지 */
const ANALYSIS_CACHE_SALT = `roof-${areaPerKwByType.roof}-usable-v1`;
const MEMORY_CACHE_TTL_MS = 120_000;
const memoryCache = new Map<string, { expires: number; value: ResolvedSiteReview }>();

function normalizeAnalysisAddress(address: string): string {
  return address.trim().replace(/\s+/g, " ");
}

function cacheKey(address: string, phase: "core" | "full") {
  return `${phase}:${address}`;
}

export async function getCachedAnalyzeSolarSite(
  address: string,
  options?: { phase?: "core" | "full" },
): Promise<ResolvedSiteReview> {
  const phase = options?.phase ?? "full";
  const normalized = normalizeAnalysisAddress(address);
  const now = Date.now();
  const key = cacheKey(normalized, phase);

  // Prefer full cache when requesting full (or when full already warmed)
  if (phase === "full") {
    const fullCached = memoryCache.get(cacheKey(normalized, "full"));
    if (fullCached && fullCached.expires > now) {
      console.info(`[Analysis] memory cache hit (full) for "${normalized}"`);
      return fullCached.value;
    }
  } else {
    // Core request: use full if already available (better data), else core
    const fullCached = memoryCache.get(cacheKey(normalized, "full"));
    if (fullCached && fullCached.expires > now) {
      console.info(`[Analysis] memory cache hit (full→core) for "${normalized}"`);
      return fullCached.value;
    }
    const coreCached = memoryCache.get(key);
    if (coreCached && coreCached.expires > now) {
      console.info(`[Analysis] memory cache hit (core) for "${normalized}"`);
      return coreCached.value;
    }
  }

  const value = await unstable_cache(
    () => analyzeSolarSite(normalized, { phase }),
    ["analyze-solar-site", ANALYSIS_CACHE_SALT, phase, normalized],
    { revalidate: 120 },
  )();

  memoryCache.set(key, { value, expires: now + MEMORY_CACHE_TTL_MS });

  // After core completes, warm full analysis in background so /result is fast
  if (phase === "core") {
    void getCachedAnalyzeSolarSite(normalized, { phase: "full" }).catch((error) => {
      console.warn("[Analysis] background full enrich failed", error);
    });
  }

  return value;
}
