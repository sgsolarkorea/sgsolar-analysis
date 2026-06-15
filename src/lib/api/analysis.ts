/**
 * SG SOLAR 입지검토 API 연동 레이어
 */

import { getTodayString, result } from "@/data/sampleData";
import { inferDefaultInstallType } from "@/data/resultUx";
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
  lat: number;
  lng: number;
  landInfo: InfoField[];
  buildingInfo: InfoField[];
  recommendation: string;
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
  if (capacityKw >= 50) return "A";
  if (capacityKw >= 20) return "B";
  if (capacityKw >= 5) return "C";
  return "D";
}

export async function calculateSolarProfitability(
  input: ProfitabilityInput,
): Promise<{ profitability: Profitability; solarMetrics: SolarMetrics; monthlyGeneration: ReturnType<typeof calculateSolarMetrics>["monthlyGeneration"] }> {
  const market = await getMarketPrice();
  const installType = inferDefaultInstallType(input.recommendation);

  const calc = calculateSolarMetrics({
    installType,
    landInfo: input.landInfo,
    buildingInfo: input.buildingInfo,
    market,
  });

  return {
    profitability: calc.profitability,
    solarMetrics: calc.metrics,
    monthlyGeneration: calc.monthlyGeneration,
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

  const [gridInfo, solarResult] = await Promise.all([
    getGridInfo(geo.lat, geo.lng),
    calculateSolarProfitability({
      address: geo.address,
      lat: geo.lat,
      lng: geo.lng,
      landInfo: landResult.landInfo,
      buildingInfo,
      recommendation: result.recommendation,
    }),
  ]);

  const { profitability, solarMetrics, monthlyGeneration } = solarResult;

  const recommendedCases = await getRecommendedCases({
    address: geo.address,
    jibunAddress: geo.jibunAddress,
    landInfo: landResult.landInfo,
    buildingInfo,
    capacity: formatCapacityDisplay(solarMetrics.capacityKw),
    recommendation: result.recommendation,
  });

  return {
    ...result,
    address: geo.address,
    jibunAddress: geo.jibunAddress,
    pnu: landResult.pnu ?? geo.pnu,
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
    capacity: formatCapacityDisplay(solarMetrics.capacityKw),
    annualGeneration: formatGenerationDisplay(solarMetrics.annualGenerationKwh),
    annualRevenue: formatRevenueDisplay(solarMetrics.totalRevenueWon),
    constructionCost: formatConstructionDisplay(solarMetrics.constructionCostWon),
    grade: deriveGrade(solarMetrics.capacityKw),
    recommendedCases,
  };
}
