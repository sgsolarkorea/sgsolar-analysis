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
import { calculateIrrPercent, calculateRoiPercent, PROJECT_YEARS } from "@/lib/solar/profitability";
import { resolveRecWeight } from "@/lib/solar/recWeight";
import type { MarketPriceData } from "@/lib/api/market";
import type { InfoField, MonthlyGeneration, Profitability, SolarMetrics } from "@/types/siteReview";

export { resolveRecWeight } from "@/lib/solar/recWeight";

export function installTypeToCategory(type: InstallTypeOption): SolarInstallCategory {
  switch (type) {
    case "토지형":
      return "land";
    case "축사형":
      return "barn";
    case "공장형":
      return "factory";
    case "상가형":
      return "commercial";
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
  return `${kw.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}kW`;
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

  const baseAreaSqm = isLand ? (landArea ?? 0) : (buildingArea ?? 0);
  const baseAreaLabel =
    isLand && input.parcelCount && input.parcelCount > 1
      ? `토지면적(총 ${input.parcelCount}필지)`
      : isLand
        ? "토지면적"
        : "건축면적";

  const rawCapacityKw = baseAreaSqm > 0 ? baseAreaSqm / areaPerKw : 0;
  const capacityKw = Math.round(rawCapacityKw * 10) / 10;
  const moduleCount = capacityKw > 0 ? Math.floor((capacityKw * 1000) / modulePowerW) : 0;

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
    baseAreaSqm > 0
      ? `${baseAreaLabel} ${formatSqm(baseAreaSqm)} ÷ ${areaPerKw}㎡/kW = ${formatKw(capacityKw)}`
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
    baseAreaSqm,
    baseAreaLabel,
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
    separateWorkNote: disclaimer.constructionExtra,
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
