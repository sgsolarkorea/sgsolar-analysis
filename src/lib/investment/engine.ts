import { generationForYear } from "@/lib/investment/generation";
import { excelDebtServiceForYear, buildDebtSchedule } from "@/lib/investment/debt";
import { excelBlendedRevenue, platformMarketRevenue } from "@/lib/investment/revenue";
import {
  cumulativePaybackYear,
  cumulativePaybackYearsExact,
  equityIrr,
  npvWithYear0,
  simplePaybackYears,
} from "@/lib/investment/metrics";
import {
  INVESTMENT_ENGINE_VERSION,
  type InvestmentAnalysisInput,
  type InvestmentAnalysisResult,
  type YearCashFlowRow,
} from "@/lib/investment/types";

const EXCLUDED = [
  "법인세·소득세",
  "VAT",
  "토지비",
  "계통연계 부담금",
  "개발행위·인허가 비용",
  "물가·단가 상승률",
] as const;

function resolveCapex(input: InvestmentAnalysisInput): { totalCapexWon: number; warnings: string[] } {
  const warnings: string[] = [];
  if (!(input.totalCapexWon > 0)) {
    warnings.push("총 사업비(totalCapex)가 없어 투자분석이 불완전합니다.");
  }
  return { totalCapexWon: Math.max(0, input.totalCapexWon || 0), warnings };
}

function yearRevenue(input: InvestmentAnalysisInput, year: number, generationKwh: number) {
  if (input.revenueMode === "excel_blended_kwh") {
    const blended =
      input.yearlyBlendedWonPerKwh?.[year - 1] ??
      input.blendedWonPerKwh ??
      0;
    return excelBlendedRevenue({ generationKwh, blendedWonPerKwh: blended });
  }
  const smp = input.yearlySmpWonPerKwh?.[year - 1] ?? input.smpPricePerKwh ?? 0;
  const rec = input.yearlyRecWonPerRec?.[year - 1] ?? input.recPricePerRec ?? 0;
  const weight = input.recWeight ?? 0;
  return platformMarketRevenue({
    generationKwh,
    smpPricePerKwh: smp,
    recPricePerRec: rec,
    recWeight: weight,
  });
}

/**
 * Run investment analysis.
 * Equity cash-flow debt service matches Excel F-column via excelDebtServiceForYear.
 */
export function runInvestmentAnalysis(input: InvestmentAnalysisInput): InvestmentAnalysisResult {
  const warnings: string[] = [...resolveCapex(input).warnings];
  const { totalCapexWon } = resolveCapex(input);
  const equityWon = Math.max(0, input.equityWon || 0);
  const loanWon = Math.max(0, input.loanWon || 0);
  const fundingGapWon = Math.max(0, totalCapexWon - equityWon - loanWon);

  if (equityWon + loanWon > totalCapexWon + 1) {
    warnings.push("자기자본+대출이 총 사업비를 초과합니다. 자동 보정하지 않습니다.");
  }
  if (fundingGapWon > 0) {
    warnings.push(`추가 조달 필요(fundingGap): ${Math.round(fundingGapWon).toLocaleString("ko-KR")}원`);
  }
  if (input.businessType && input.businessType !== "rps") {
    warnings.push("현재 엔진 scope는 RPS 사업용입니다. 상계/PPA는 별도 모델이 필요합니다.");
  }
  if (input.priceScenario === "current_spot_reference") {
    warnings.push("현재 시장단가를 전 기간에 단순 적용한 참고 시나리오입니다. 20년 예측이 아닙니다.");
  }

  const analysisYears = Math.max(0, Math.floor(input.analysisYears));
  const annualOpexBase =
    Math.max(0, input.annualOmCostWon || 0) +
    Math.max(0, input.annualInsuranceCostWon || 0) +
    Math.max(0, input.annualOtherCostWon || 0);
  if (annualOpexBase < 0) {
    warnings.push("연간 운영비가 음수입니다.");
  }

  const debtSchedule = buildDebtSchedule({
    loanWon,
    interestRate: input.interestRate,
    graceYears: input.graceYears,
    loanTermYears: input.loanTermYears,
    analysisYears,
  });

  const years: YearCashFlowRow[] = [];
  const year0: YearCashFlowRow = {
    year: 0,
    generationKwh: 0,
    smpRevenueWon: 0,
    recRevenueWon: 0,
    totalRevenueWon: 0,
    omWon: 0,
    insuranceWon: 0,
    otherCostWon: 0,
    inverterReplacementWon: 0,
    totalOpexWon: 0,
    interestWon: 0,
    principalWon: 0,
    debtServiceWon: 0,
    projectCashFlowWon: -totalCapexWon,
    equityCashFlowWon: -equityWon,
    cumulativeEquityCashFlowWon: -equityWon,
  };
  years.push(year0);

  let cumulative = -equityWon;
  let totalRevenueWon = 0;
  let totalOpexWon = 0;
  let totalDebtServiceWon = 0;

  for (let year = 1; year <= analysisYears; year++) {
    const generationKwh = generationForYear(
      input.year1GenerationKwh,
      year,
      input.degradationRate,
    );
    const rev = yearRevenue(input, year, generationKwh);
    const omWon = Math.max(0, input.annualOmCostWon || 0);
    const insuranceWon = Math.max(0, input.annualInsuranceCostWon || 0);
    const otherCostWon = Math.max(0, input.annualOtherCostWon || 0);
    const inverterReplacementWon =
      input.inverterReplacementYear != null && year === input.inverterReplacementYear
        ? Math.max(0, input.inverterReplacementCostWon || 0)
        : 0;
    const totalOpex = omWon + insuranceWon + otherCostWon + inverterReplacementWon;

    const debtServiceWon = excelDebtServiceForYear({
      year,
      loanWon,
      interestRate: input.interestRate,
      graceYears: input.graceYears,
      loanTermYears: input.loanTermYears,
    });
    const debtRow = debtSchedule[year - 1];

    const equityCashFlowWon = rev.totalRevenueWon - totalOpex - debtServiceWon;
    cumulative += equityCashFlowWon;

    totalRevenueWon += rev.totalRevenueWon;
    totalOpexWon += totalOpex;
    totalDebtServiceWon += debtServiceWon;

    years.push({
      year,
      generationKwh,
      smpRevenueWon: rev.smpRevenueWon,
      recRevenueWon: rev.recRevenueWon,
      totalRevenueWon: rev.totalRevenueWon,
      omWon,
      insuranceWon,
      otherCostWon,
      inverterReplacementWon,
      totalOpexWon: totalOpex,
      interestWon: debtRow?.interestPaymentWon ?? 0,
      principalWon: debtRow?.principalPaymentWon ?? 0,
      debtServiceWon,
      projectCashFlowWon: rev.totalRevenueWon - totalOpex,
      equityCashFlowWon,
      cumulativeEquityCashFlowWon: cumulative,
    });
  }

  const equitySeries = years.map((y) => y.equityCashFlowWon);
  const cumulativeSeries = years.map((y) => y.cumulativeEquityCashFlowWon);
  const year1Cf = years[1]?.equityCashFlowWon ?? 0;

  const irr = equityIrr(equitySeries);
  if (irr == null) warnings.push("자기자본 IRR을 산출할 수 없습니다(유효한 부호 변화가 없음).");

  return {
    investmentEngineVersion: INVESTMENT_ENGINE_VERSION,
    years,
    debtSchedule,
    simplePaybackYears: simplePaybackYears(equityWon, year1Cf),
    cashflowPaybackYear: cumulativePaybackYear(cumulativeSeries),
    cashflowPaybackYearsExact: cumulativePaybackYearsExact(equitySeries, cumulativeSeries),
    equityIrr: irr,
    npvWon: npvWithYear0(
      input.discountRate,
      years[0].equityCashFlowWon,
      years.slice(1).map((y) => y.equityCashFlowWon),
    ),
    totalRevenueWon,
    totalOpexWon,
    totalDebtServiceWon,
    totalNetEquityCashflowWon: equitySeries.reduce((a, b) => a + b, 0),
    fundingGapWon,
    assumptions: {
      revenueMode: input.revenueMode,
      priceScenario: input.priceScenario,
      degradationRate: input.degradationRate,
      interestRate: input.interestRate,
      graceYears: input.graceYears,
      loanTermYears: input.loanTermYears,
      analysisYears,
      discountRate: input.discountRate,
      excludedItems: [...EXCLUDED],
    },
    warnings,
  };
}
