import {
  formatCapacityDisplay,
  formatMonthlyRevenueFromAnnualDisplay,
  formatRevenueDisplay,
} from "@/lib/solar/calculate";
import { formatHouseholdMonthlySavings, isHouseholdInstallType } from "@/lib/solar/householdSavings";

/** 화면·PDF·mockup·콘텐츠 공통 수익 라벨 */
export interface DisplayRevenueLabels {
  capacityKw: number;
  capacityLabel: string;
  annualRevenueWon: number;
  annualRevenueLabel: string;
  monthlyRevenueLabel: string;
  /** Single Source of Truth 경로 (문서·디버그용) */
  revenueSourcePath: "solarMetrics.totalRevenueWon";
}

/**
 * SiteReviewResult / analyzeSolarSite와 동일한 수익 표시
 * - 연매출: formatRevenueDisplay(totalRevenueWon) === SiteReviewResult.annualRevenue
 * - 월수익: 가정용 → household 공식, 그 외 → totalRevenueWon / 12 (동일 formatWon 규칙)
 */
export function resolveDisplayRevenueLabels(input: {
  installType: string;
  capacityKw: number;
  totalRevenueWon: number;
}): DisplayRevenueLabels {
  const annualRevenueLabel = formatRevenueDisplay(input.totalRevenueWon);
  const monthlyRevenueLabel = isHouseholdInstallType(input.installType)
    ? formatHouseholdMonthlySavings(input.capacityKw)
    : formatMonthlyRevenueFromAnnualDisplay(input.totalRevenueWon);

  return {
    capacityKw: input.capacityKw,
    capacityLabel: formatCapacityDisplay(input.capacityKw),
    annualRevenueWon: input.totalRevenueWon,
    annualRevenueLabel,
    monthlyRevenueLabel,
    revenueSourcePath: "solarMetrics.totalRevenueWon",
  };
}
