/**
 * SG SOLAR 입지검토 API 연동 레이어
 */

import { unstable_cache } from "next/cache";
import { getTodayString, result } from "@/data/sampleData";
import { deriveSiteRecommendation, resolveDefaultInstallType } from "@/data/resultUx";
import { getBuildingInfoByRegistry } from "@/lib/api/buildingRegistry";
import {
  hasLandRecord,
  resolveInfoDataSource,
  unavailableLandInfo,
} from "@/lib/api/infoFallbacks";
import { parseJibunLot } from "@/lib/api/jibunParser";
import { fetchLegalDongCodesByCoord, searchAddressByKakao } from "@/lib/api/kakao";
import { getMarketPrice } from "@/lib/api/market";
import { buildPnu } from "@/lib/api/pnu";
import { recommendConstructionCases, type CaseRecommendInput } from "@/lib/api/recommendCases";
import { getLandInfoByPnu, getLandInfoByVworld } from "@/lib/api/vworld";
import { resolveRegionDistrictAnalysis } from "@/lib/regulatory/resolveRegionDistrictAnalysis";
import { buildLayerARegulatoryAnalysis } from "@/lib/regulatory/buildLayerARegulatory";
import { buildSetbackFromGis } from "@/lib/regulatory/buildSetbackFromGis";
import { buildDefaultSetbackReview } from "@/lib/regulatory/resolveRegulatoryReview";
import { resolveSiteIntel } from "@/lib/gis/siteIntel";
import type { LandInfoDetail } from "@/types/landInfo";
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
import { deriveGradeFromCapacity } from "@/lib/solar/grade";
import type {
  Grade,
  GridInfo,
  InfoField,
  Profitability,
  RecommendedConstructionCase,
  ResolvedSiteReview,
  SolarMetrics,
} from "@/types/siteReview";
import type { SiteGeometryBundle } from "@/types/siteGeometry";

export interface ProfitabilityInput {
  address: string;
  landInfo: InfoField[];
  buildingInfo: InfoField[];
}

export async function getBuildingInfo(input: {
  pnu: string | null;
  buildingName?: string;
}): Promise<InfoField[]> {
  return getBuildingInfoByRegistry(input);
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

function deriveGrade(capacityKw: number): Grade {
  return deriveGradeFromCapacity(capacityKw);
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
  },
): Promise<{
  profitability: Profitability;
  solarMetrics: SolarMetrics;
  monthlyGeneration: ReturnType<typeof calculateSolarMetrics>["monthlyGeneration"];
  installType: ReturnType<typeof resolveDefaultInstallType>;
}> {
  const market = await getMarketPrice();
  const installType = resolveDefaultInstallType("", input.landInfo, input.buildingInfo, {
    hasRoadAddress: input.hasRoadAddress,
  });

  const calc = calculateSolarMetrics({
    installType,
    landInfo: input.landInfo,
    buildingInfo: input.buildingInfo,
    market,
    capacityAreaSqm: input.capacityAreaSqm,
    capacityBasis: input.capacityBasis,
    displayLandAreaSqm: input.displayLandAreaSqm,
    displayBuildingFootprintAreaSqm: input.displayBuildingFootprintAreaSqm,
    buildingPolygonCount: input.buildingPolygonCount,
    buildingFootprintAreaSumSqm: input.buildingFootprintAreaSumSqm,
    displayRoofUsableAreaSqm: input.displayRoofUsableAreaSqm,
    displayUsableAreaSqm: input.displayUsableAreaSqm,
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
  input: CaseRecommendInput,
): Promise<RecommendedConstructionCase[]> {
  const { cases } = await import("@/data/sampleData");
  return recommendConstructionCases(input, cases);
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

export async function analyzeSolarSite(address: string): Promise<ResolvedSiteReview> {
  const geo = await searchAddressByKakao(address);
  const { pnu, pnuSource } = await resolvePnuForBuildingLookup(geo, null);

  const [landResult, landByPnu] = await Promise.all([
    getLandInfoByVworld(geo.lat, geo.lng),
    pnu ? getLandInfoByPnu(pnu) : Promise.resolve(null),
  ]);

  const effectivePnu = landResult.pnu ?? pnu;
  let landInfo = landResult.landInfo;
  let landInfoDetail: LandInfoDetail = landResult.landDetail;
  if (!hasLandRecord(landInfo) && landByPnu && hasLandRecord(landByPnu.landInfo)) {
    console.info("[Analysis] Land info resolved via parallel PNU lookup", { pnu: effectivePnu });
    landInfo = landByPnu.landInfo;
    landInfoDetail = landByPnu.landDetail;
  } else if (!hasLandRecord(landInfo)) {
    landInfo = unavailableLandInfo();
    if (effectivePnu) {
      console.warn("[Analysis] Land info unavailable after VWorld + PNU lookup", { pnu: effectivePnu });
    }
  }

  const buildingInfo = await getBuildingInfo({
    pnu: effectivePnu,
    buildingName: geo.buildingName,
  });

  const landAreaSqm = parseAreaSqm(getFieldValue(landInfo, "면적"));
  const buildingAreaSqm = parseAreaSqm(getFieldValue(buildingInfo, "건축면적"));
  const defaultInstallType = resolveDefaultInstallType("", landInfo, buildingInfo, {
    hasRoadAddress: hasRoadAddress(geo.address),
  });

  const siteGeometryBundle: SiteGeometryBundle = await fetchSiteGeometryBundle({
    pnu: effectivePnu,
    lat: geo.lat,
    lng: geo.lng,
    landAreaSqm,
    buildingAreaSqm,
  });

  const siteGeometry = resolveSiteGeometryFromBundle(siteGeometryBundle, {
    lat: geo.lat,
    lng: geo.lng,
    capacityKw: 1,
    installType: defaultInstallType,
  });

  const solarResult = await calculateSolarProfitability({
    address: geo.address,
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
  const grade = deriveGrade(solarMetrics.capacityKw);

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

  const recommendedCases = await getRecommendedCases({
    address: geo.address,
    jibunAddress: geo.jibunAddress,
    landInfo,
    buildingInfo,
    capacity,
    recommendation,
  });

  const gridInfo = await getGridInfo({
    lat: geo.lat,
    lng: geo.lng,
    address: geo.address,
    jibunAddress: geo.jibunAddress,
    capacityKw: solarMetrics.capacityKw,
    pnu: effectivePnu ?? undefined,
  });

  const siteIntel =
    effectivePnu != null && effectivePnu !== ""
      ? await resolveSiteIntel({ pnu: effectivePnu, lat: geo.lat, lng: geo.lng })
      : null;

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

  const setbackReview = siteIntel?.parcel
    ? await buildSetbackFromGis(siteIntel.parcel, {
        installType: solarMetrics.installType,
        address: geo.address,
        jibunAddress: geo.jibunAddress,
      })
    : buildDefaultSetbackReview(solarMetrics.installType, geo.address, geo.jibunAddress);

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
    grade,
    recommendedCases,
    recommendedBusinessTypes: result.recommendedBusinessTypes,
    businessTypeOptions: result.businessTypeOptions,
    ordinanceInfo: result.ordinanceInfo,
    suitability: result.suitability,
    siteGeometryBundle,
  };
}

/** 로딩 화면 prefetch와 결과 페이지 SSR 간 중복 분석 방지 (2분 캐시) */
export async function getCachedAnalyzeSolarSite(address: string): Promise<ResolvedSiteReview> {
  const normalized = address.trim();
  return unstable_cache(
    () => analyzeSolarSite(normalized),
    ["analyze-solar-site", normalized],
    { revalidate: 120 },
  )();
}
