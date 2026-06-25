import {
  areaPerKwByType,
  disclaimer,
  modulePowerW,
  monthlyGenerationWeights,
  resolveConstructionCostPerKw,
  type SolarInstallCategory,
  yearlyGenerationPerKw,
} from "@/data/solarConfig";
import type { InstallTypeOption } from "@/data/resultUx";
import { INSTALL_TYPE_OPTIONS, resolveDefaultInstallType } from "@/data/resultUx";
import { formatRecWeightDisplay } from "@/lib/solar/formatRecWeight";
import {
  formatUnifiedCapacityKw,
  resolveTargetCapacity,
} from "@/lib/solar/capacityResolution";
import { calculateIrrPercent, calculateRoiPercent, PROJECT_YEARS } from "@/lib/solar/profitability";
import { resolveRecWeight } from "@/lib/solar/recWeight";
import type { MarketPriceData } from "@/lib/api/market";
import type { InfoField, MonthlyGeneration, Profitability, SolarMetrics } from "@/types/siteReview";
import type { CapacityBasis } from "@/types/siteGeometry";

export { resolveRecWeight } from "@/lib/solar/recWeight";

export function installTypeToCategory(type: InstallTypeOption): SolarInstallCategory {
  switch (type) {
    case "토지형":
      return "land";
    case "상계거래(가정용)":
    case "지붕형":
      return "roof";
    default:
      return "unknown";
  }
}

export function parseAreaSqm(value: string): number | null {
  if (!value || value === "확인 필요") return null;
  const normalized = value.replace(/,/g, "").trim();
  const match = normalized.match(/([\d.]+)\s*(?:㎡|m²|m2)?/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getFieldValue(fields: InfoField[], label: string): string {
  return fields.find((f) => f.label === label)?.value ?? "";
}

function formatKw(kw: number): string {
  return formatUnifiedCapacityKw(kw);
}

function formatKwh(kwh: number): string {
  return `${Math.round(kwh).toLocaleString("ko-KR")}kWh/년`;
}

function formatWon(amount: number): string {
  if (amount >= 100_000_000) {
    const eok = amount / 100_000_000;
    return `약 ${eok.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억원`;
  }
  if (amount >= 10_000) {
    const man = Math.round(amount / 10_000);
    return `약 ${man.toLocaleString("ko-KR")}만원`;
  }
  return `약 ${Math.round(amount).toLocaleString("ko-KR")}원`;
}

function formatWonPerYear(amount: number): string {
  return `${formatWon(amount)}/년`;
}

function formatSqm(sqm: number): string {
  return `${sqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡`;
}

export interface CalculateSolarInput {
  installType: InstallTypeOption;
  landInfo: InfoField[];
  buildingInfo: InfoField[];
  market: MarketPriceData;
  /** 다중 필지 합산 면적 (토지형) */
  overrideLandAreaSqm?: number;
  /** 다중 필지 산식 표시용 */
  parcelCount?: number;
  /** Polygon 기준 용량 산정 면적 (㎡) — Phase 2 */
  capacityAreaSqm?: number;
  capacityBasis?: CapacityBasis;
  /** 표시용 면적 (대장·Polygon) */
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
}

export interface CalculateSolarOutput {
  metrics: SolarMetrics;
  profitability: Profitability;
  monthlyGeneration: MonthlyGeneration[];
  capacityKw: number;
  annualGenerationKwh: number;
  totalRevenueWon: number;
  constructionCostWon: number;
}

export function calculateSolarMetrics(input: CalculateSolarInput): CalculateSolarOutput {
  const buildingArea = parseAreaSqm(getFieldValue(input.buildingInfo, "건축면적"));
  const parsedLandArea = parseAreaSqm(getFieldValue(input.landInfo, "면적"));

  let installType = input.installType;
  if (!INSTALL_TYPE_OPTIONS.includes(installType as (typeof INSTALL_TYPE_OPTIONS)[number])) {
    installType = resolveDefaultInstallType("", input.landInfo, input.buildingInfo);
  }

  const category = installTypeToCategory(installType);
  const areaPerKw = areaPerKwByType[category];
  const isLand = category === "land";

  const landArea =
    isLand && input.overrideLandAreaSqm != null && input.overrideLandAreaSqm > 0
      ? input.overrideLandAreaSqm
      : parsedLandArea;

  const registryBaseAreaSqm = isLand ? (landArea ?? 0) : (buildingArea ?? 0);
  const capacityBasis: CapacityBasis =
    input.capacityBasis ?? (isLand ? "land" : "buildingRoof");
  const baseAreaSqm =
    input.capacityAreaSqm != null && input.capacityAreaSqm > 0
      ? input.capacityAreaSqm
      : registryBaseAreaSqm;

  const baseAreaLabel =
    isLand && input.parcelCount && input.parcelCount > 1
      ? input.capacityAreaSqm != null && input.capacityAreaSqm > 0
        ? `토지 Polygon Union(${input.parcelCount}필지)`
        : `토지면적(총 ${input.parcelCount}필지)`
      : isLand
        ? input.capacityAreaSqm != null && input.capacityAreaSqm > 0
          ? "토지 Polygon"
          : "토지면적"
        : input.capacityAreaSqm != null && input.capacityAreaSqm > 0
          ? input.usedBuildingCount && input.usedBuildingCount > 1
            ? `건물/지붕 Polygon(${input.usedBuildingCount}동)`
            : "건물/지붕 Polygon"
          : "건축면적";

  const rawCapacityKw = baseAreaSqm > 0 ? baseAreaSqm / areaPerKw : 0;
  // 대표 용량(A): 건물형 A-only, 토지형도 analyze 단계에서는 A 기준.
  // 토지형 min(A,B)는 layout diagnostics / Phase 3(토지형 한정)에서 resolveFinalCapacity 사용.
  const { targetModuleCount: moduleCount, capacityKw } = resolveTargetCapacity(
    installType,
    baseAreaSqm,
    areaPerKw,
  );

  const { weight: recWeight, reason: recWeightReason } = resolveRecWeight(category, capacityKw);

  const annualGenerationKwh = Math.round(capacityKw * yearlyGenerationPerKw);

  /**
   * SMP 수익 = 연간 발전량(kWh) × SMP 단가(원/kWh)
   */
  const smpRevenueWon = annualGenerationKwh * input.market.smpPrice;

  /**
   * REC 수익 = 연간 발전량(kWh) ÷ 1,000 × REC 단가(원/MWh, 1 REC = 1,000 kWh) × REC 가중치
   */
  const recRevenueWon = (annualGenerationKwh / 1000) * input.market.recPrice * recWeight;

  /** 총 연매출 = SMP 수익 + REC 수익 */
  const totalRevenueWon = smpRevenueWon + recRevenueWon;
  const revenue20YearWon = totalRevenueWon * PROJECT_YEARS;

  const constructionCostPerKw = resolveConstructionCostPerKw(capacityKw);
  const constructionCostWon = Math.round(capacityKw * constructionCostPerKw);
  const paybackYears =
    totalRevenueWon > 0 ? Math.round((constructionCostWon / totalRevenueWon) * 10) / 10 : 0;

  /** 운영비·금융비 미반영 1차 추정 순수익 */
  const annualNetProfitWon = totalRevenueWon;
  const cumulative20YearNetWon = revenue20YearWon - constructionCostWon;
  const roiPercent = calculateRoiPercent(constructionCostWon, totalRevenueWon);
  const irrPercent = calculateIrrPercent(constructionCostWon, totalRevenueWon);

  const formula =
    baseAreaSqm > 0 && moduleCount > 0
      ? `${baseAreaLabel} ${formatSqm(baseAreaSqm)} ÷ ${areaPerKw}㎡/kW → 목표 ${moduleCount.toLocaleString("ko-KR")}장 × ${modulePowerW}W = ${formatUnifiedCapacityKw(capacityKw)}`
      : baseAreaSqm > 0
        ? `${baseAreaLabel} ${formatSqm(baseAreaSqm)} ÷ ${areaPerKw}㎡/kW = ${formatUnifiedCapacityKw(Math.round(rawCapacityKw * 100) / 100)}`
        : `${baseAreaLabel} 확인 필요`;

  const monthLabels = [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ];

  const weightSum = monthlyGenerationWeights.reduce((sum, w) => sum + w, 0);
  const monthlyRaw = monthLabels.map((month, i) => ({
    month,
    kwh: annualGenerationKwh * ((monthlyGenerationWeights[i] ?? 0) / weightSum),
  }));
  const monthlyGeneration: MonthlyGeneration[] = monthlyRaw.map((item) => ({
    month: item.month,
    kwh: Math.round(item.kwh),
  }));
  const monthlySum = monthlyGeneration.reduce((sum, item) => sum + item.kwh, 0);
  const monthlyDiff = annualGenerationKwh - monthlySum;
  if (monthlyDiff !== 0 && monthlyGeneration.length > 0) {
    const peakIndex = monthlyRaw.reduce(
      (best, item, index) => (item.kwh > monthlyRaw[best].kwh ? index : best),
      0,
    );
    monthlyGeneration[peakIndex] = {
      ...monthlyGeneration[peakIndex],
      kwh: monthlyGeneration[peakIndex].kwh + monthlyDiff,
    };
  }

  const metrics: SolarMetrics = {
    installType,
    installCategory: category,
    capacityBasis,
    baseAreaSqm,
    baseAreaLabel,
    landAreaSqm: input.displayLandAreaSqm ?? parsedLandArea,
    buildingFootprintAreaSqm:
      input.displayBuildingFootprintAreaSqm ?? buildingArea,
    buildingPolygonCount: input.buildingPolygonCount,
    buildingFootprintAreaSumSqm: input.buildingFootprintAreaSumSqm,
    roofUsableAreaSqm: input.displayRoofUsableAreaSqm ?? null,
    detectedBuildingCount: input.detectedBuildingCount,
    usedBuildingCount: input.usedBuildingCount,
    excludedBuildingCount: input.excludedBuildingCount,
    registryBuildingAreaSqm: input.registryBuildingAreaSqm ?? null,
    usableAreaSqm: input.displayUsableAreaSqm ?? null,
    areaPerKw,
    capacityKw,
    modulePowerW,
    moduleCount,
    formula,
    capacityDisclaimer: disclaimer.capacity,
    recWeight,
    recWeightReason,
    market: input.market,
    marketDisclaimer: disclaimer.market,
    annualGenerationKwh,
    smpRevenueWon,
    recRevenueWon,
    totalRevenueWon,
    revenue20YearWon,
    constructionCostPerKw,
    constructionCostWon,
    constructionDisclaimer: disclaimer.construction,
    separateWorkNote: isLand ? disclaimer.constructionLandExtra : disclaimer.constructionBuildingExtra,
    paybackYears,
    recUnitNote: disclaimer.recUnit,
    annualNetProfitWon,
    cumulative20YearNetWon,
    roiPercent,
    irrPercent,
  };

  const profitability: Profitability = {
    estimatedCapacity: formatKw(capacityKw),
    estimatedInstallCost: formatWon(constructionCostWon),
    annualGeneration: formatKwh(annualGenerationKwh),
    smpRevenue: formatWonPerYear(smpRevenueWon),
    recRevenue: formatWonPerYear(recRevenueWon),
    totalRevenue: formatWonPerYear(totalRevenueWon),
    annualNetProfit: formatWonPerYear(annualNetProfitWon),
    paybackPeriod: paybackYears > 0 ? `${paybackYears}년 (참고)` : "산출 불가",
    smpPrice: `${input.market.smpPrice.toLocaleString("ko-KR")}원/kWh`,
    recPrice: `${input.market.recPrice.toLocaleString("ko-KR")}원/MWh`,
    recWeight: formatRecWeightDisplay(recWeight),
    recWeightReason,
    smpDate: input.market.smpDate,
    recDate: input.market.recDate,
    marketSource: input.market.source,
    marketFallback: input.market.isFallback,
    cumulative20YearRevenue: formatWon(revenue20YearWon),
    cumulative20YearNetProfit: formatWon(cumulative20YearNetWon),
    roi: roiPercent > 0 ? `${roiPercent.toLocaleString("ko-KR")}%` : "산출 불가",
    irr: irrPercent > 0 ? `${irrPercent.toLocaleString("ko-KR")}%` : "산출 불가",
    constructionCostPerKw: `${constructionCostPerKw.toLocaleString("ko-KR")}원/kW`,
    separateWorkNote: metrics.separateWorkNote,
  };

  return {
    metrics,
    profitability,
    monthlyGeneration,
    capacityKw,
    annualGenerationKwh,
    totalRevenueWon,
    constructionCostWon,
  };
}

export function formatCapacityDisplay(kw: number): string {
  return formatKw(kw);
}

export function formatGenerationDisplay(kwh: number): string {
  return formatKwh(kwh);
}

export function formatRevenueDisplay(won: number): string {
  return formatWonPerYear(won);
}

export function formatConstructionDisplay(won: number): string {
  return formatWon(won);
}
