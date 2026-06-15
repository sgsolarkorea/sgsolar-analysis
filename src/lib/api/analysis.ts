/**
 * SG SOLAR 입지검토 API 연동 레이어
 */

import { getTodayString, result } from "@/data/sampleData";
import { deriveSiteRecommendation, resolveDefaultInstallType } from "@/data/resultUx";
import { getBuildingInfoByRegistry } from "@/lib/api/buildingRegistry";
import { searchAddressByKakao } from "@/lib/api/kakao";
import { getMarketPrice } from "@/lib/api/market";
import { recommendConstructionCases, type CaseRecommendInput } from "@/lib/api/recommendCases";
import { getLandInfoByVworld } from "@/lib/api/vworld";
import {
  calculateSolarMetrics,
  formatCapacityDisplay,
  formatConstructionDisplay,
  formatGenerationDisplay,
  formatRevenueDisplay,
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

export async function getGridInfo(lat: number, lng: number): Promise<GridInfo> {
  void lat;
  void lng;
  return result.gridInfo;
}

function deriveGrade(capacityKw: number): Grade {
  return deriveGradeFromCapacity(capacityKw);
}

export async function calculateSolarProfitability(
  input: ProfitabilityInput,
): Promise<{
  profitability: Profitability;
  solarMetrics: SolarMetrics;
  monthlyGeneration: ReturnType<typeof calculateSolarMetrics>["monthlyGeneration"];
  installType: ReturnType<typeof resolveDefaultInstallType>;
}> {
  const market = await getMarketPrice();
  const installType = resolveDefaultInstallType("", input.landInfo, input.buildingInfo);

  const calc = calculateSolarMetrics({
    installType,
    landInfo: input.landInfo,
    buildingInfo: input.buildingInfo,
    market,
  });

  const areas = extractAreasForDebug(input.landInfo, input.buildingInfo);
  logSolarCalculationDebug({
    address: input.address,
    buildingArea: areas.buildingArea,
    landArea: areas.landArea,
    buildingUse: areas.buildingUse,
    defaultInstallType: calc.metrics.installType,
    calculatedCapacityKw: calc.capacityKw,
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

export async function analyzeSolarSite(address: string): Promise<ResolvedSiteReview> {
  const geo = await searchAddressByKakao(address);
  const landResult = await getLandInfoByVworld(geo.lat, geo.lng);

  const buildingInfo = await getBuildingInfo({
    pnu: landResult.pnu ?? geo.pnu,
    buildingName: geo.buildingName,
  });

  const solarResult = await calculateSolarProfitability({
    address: geo.address,
    landInfo: landResult.landInfo,
    buildingInfo,
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
    ...extractAreasForDebug(landResult.landInfo, buildingInfo),
    defaultInstallType: solarMetrics.installType,
    calculatedCapacityKw: solarMetrics.capacityKw,
    source: "analyzeSolarSite",
  });

  const recommendedCases = await getRecommendedCases({
    address: geo.address,
    jibunAddress: geo.jibunAddress,
    landInfo: landResult.landInfo,
    buildingInfo,
    capacity,
    recommendation,
  });

  const gridInfo = await getGridInfo(geo.lat, geo.lng);

  return {
    address: geo.address,
    jibunAddress: geo.jibunAddress,
    pnu: landResult.pnu ?? geo.pnu ?? "",
    lat: geo.lat,
    lng: geo.lng,
    buildingName: geo.buildingName,
    zoneNo: geo.zoneNo,
    analyzedAt: getTodayString(),
    consultationDefaultAddress: geo.address,
    landInfo: landResult.landInfo,
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
  };
}
