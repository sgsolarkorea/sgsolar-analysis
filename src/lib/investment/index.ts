export { INVESTMENT_ENGINE_VERSION } from "@/lib/investment/types";
export type {
  InvestmentAnalysisInput,
  InvestmentAnalysisResult,
  YearCashFlowRow,
  DebtYearRow,
  SensitivityScenarioResult,
} from "@/lib/investment/types";
export { runInvestmentAnalysis } from "@/lib/investment/engine";
export { platformMarketRevenue, excelBlendedRevenue, normalizeExcelRecPriceToWonPerRec } from "@/lib/investment/revenue";
export { generationForYear } from "@/lib/investment/generation";
export { excelPmt, excelDebtServiceForYear, buildDebtSchedule } from "@/lib/investment/debt";
export { equityIrr, npvWithYear0 } from "@/lib/investment/metrics";
