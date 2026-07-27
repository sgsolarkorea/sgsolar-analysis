/**
 * Investment Analysis Engine — domain types
 * Versioned; IRR/NPV must not ship to production UI until Excel CV passes.
 */

export const INVESTMENT_ENGINE_VERSION = "1.0.0" as const;

export type PriceScenarioKind = "current_spot_reference" | "user_fixed_price" | "custom_yearly";

/** Platform market revenue (원/REC × weight) vs Excel legacy (REC as 원/kWh adder). */
export type RevenueMode = "platform_market" | "excel_blended_kwh";

export type BusinessTypeForInvestment = "rps" | "net_metering" | "ppa";

export interface InvestmentAnalysisInput {
  capacityKw: number;
  /** Year-1 annual generation (kWh). Production: from site analysis. CV: Excel B18. */
  year1GenerationKwh: number;
  monthlyGenerationKwh?: number[];
  /** Decimal, e.g. 0.005 = 0.5%/yr */
  degradationRate: number;
  revenueMode: RevenueMode;
  /** Platform mode */
  smpPricePerKwh?: number;
  recPricePerRec?: number;
  recWeight?: number;
  /** Excel legacy blended: SMP 원/kWh + REC 원/kWh */
  blendedWonPerKwh?: number;
  /** Optional yearly override (length analysisYears); if set, used instead of flat prices */
  yearlyBlendedWonPerKwh?: number[];
  yearlySmpWonPerKwh?: number[];
  yearlyRecWonPerRec?: number[];
  priceScenario: PriceScenarioKind;
  totalCapexWon: number;
  equityWon: number;
  loanWon: number;
  /** Annual interest rate decimal, e.g. 0.047 */
  interestRate: number;
  graceYears: number;
  /** Total loan term including grace (Excel B11) */
  loanTermYears: number;
  analysisYears: number;
  /** NPV discount rate decimal */
  discountRate: number;
  annualOmCostWon: number;
  annualInsuranceCostWon: number;
  annualOtherCostWon: number;
  inverterReplacementYear: number | null;
  inverterReplacementCostWon: number;
  businessType?: BusinessTypeForInvestment;
  region?: string;
}

export interface DebtYearRow {
  year: number;
  openingPrincipalWon: number;
  interestPaymentWon: number;
  principalPaymentWon: number;
  totalDebtServiceWon: number;
  closingPrincipalWon: number;
  isGrace: boolean;
}

export interface YearCashFlowRow {
  year: number;
  generationKwh: number;
  smpRevenueWon: number;
  recRevenueWon: number;
  totalRevenueWon: number;
  omWon: number;
  insuranceWon: number;
  otherCostWon: number;
  inverterReplacementWon: number;
  totalOpexWon: number;
  interestWon: number;
  principalWon: number;
  debtServiceWon: number;
  /** Project CF before financing (Revenue - OPEX); Year0 = -totalCapex */
  projectCashFlowWon: number;
  /** Equity CF; Year0 = -equity */
  equityCashFlowWon: number;
  cumulativeEquityCashFlowWon: number;
}

export interface InvestmentAssumptions {
  revenueMode: RevenueMode;
  priceScenario: PriceScenarioKind;
  degradationRate: number;
  interestRate: number;
  graceYears: number;
  loanTermYears: number;
  analysisYears: number;
  discountRate: number;
  excludedItems: string[];
}

export interface InvestmentAnalysisResult {
  investmentEngineVersion: typeof INVESTMENT_ENGINE_VERSION;
  years: YearCashFlowRow[];
  debtSchedule: DebtYearRow[];
  simplePaybackYears: number | null;
  cashflowPaybackYear: number | null;
  /** Fractional years via linear interpolation when possible */
  cashflowPaybackYearsExact: number | null;
  equityIrr: number | null;
  npvWon: number | null;
  totalRevenueWon: number;
  totalOpexWon: number;
  totalDebtServiceWon: number;
  totalNetEquityCashflowWon: number;
  fundingGapWon: number;
  assumptions: InvestmentAssumptions;
  warnings: string[];
}

export interface SensitivityScenarioResult {
  label: string;
  equityIrr: number | null;
  cashflowPaybackYear: number | null;
  npvWon: number | null;
  totalRevenueWon: number;
}
