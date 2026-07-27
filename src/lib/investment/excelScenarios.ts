import type { InvestmentAnalysisInput } from "@/lib/investment/types";

/** Excel workbook default scenario (S1) — 수익분석 기본 작업.xlsx 입력값. */
export function excelDefaultScenarioInput(): InvestmentAnalysisInput {
  return {
    capacityKw: 100,
    year1GenerationKwh: 131_400,
    degradationRate: 0.005,
    revenueMode: "excel_blended_kwh",
    blendedWonPerKwh: 193,
    priceScenario: "user_fixed_price",
    totalCapexWon: 230_000_000,
    equityWon: 90_000_000,
    loanWon: 140_000_000,
    interestRate: 0.047,
    graceYears: 3,
    loanTermYears: 20,
    analysisYears: 20,
    discountRate: 0.05,
    annualOmCostWon: 1_500_000,
    annualInsuranceCostWon: 500_000,
    annualOtherCostWon: 0,
    inverterReplacementYear: 10,
    inverterReplacementCostWon: 7_000_000,
    businessType: "rps",
  };
}

/** S2: 100% equity, no debt. */
export function excelZeroDebtScenarioInput(): InvestmentAnalysisInput {
  const base = excelDefaultScenarioInput();
  return {
    ...base,
    equityWon: 230_000_000,
    loanWon: 0,
  };
}

/** S3: Half capacity / half CAPEX / 50% equity, same rates. */
export function excelHalfScaleScenarioInput(): InvestmentAnalysisInput {
  return {
    ...excelDefaultScenarioInput(),
    capacityKw: 50,
    year1GenerationKwh: 65_700,
    totalCapexWon: 115_000_000,
    equityWon: 57_500_000,
    loanWon: 57_500_000,
  };
}

/** Excel S1 cached expected values from workbook data_only. */
export const EXCEL_S1_EXPECTED = {
  year1Generation: 131_400,
  year10Generation: 125_603.89059618335,
  year1Revenue: 25_360_200,
  year1Debt: 6_580_000,
  year4Debt: 12_141_188.436691593,
  year10Inverter: 7_000_000,
  year20Cumulative: 120_679_256.20417134,
  paybackYear: 7,
  equityIrr: 0.11859448154492336,
  npvWon: 48_506_449.99683812,
  simplePayback: 5.36346408266886,
} as const;
