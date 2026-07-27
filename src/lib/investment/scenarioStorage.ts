/**
 * Client-side investment scenario for PDF parity with web UI.
 * Engine math stays in @/lib/investment — this is transport only.
 */

export const INVESTMENT_SCENARIO_STORAGE_KEY = "sgsolar.investmentScenario.v1";

export interface InvestmentScenarioPayload {
  totalCapexWon: number;
  equityWon: number;
  loanWon: number;
  interestRate: number;
  graceYears: number;
  loanTermYears: number;
  annualOmCostWon: number;
  annualInsuranceCostWon: number;
  discountRate: number;
  priceMode: "spot" | "fixed";
  blendedWonPerKwh?: number;
}

export function saveInvestmentScenario(scenario: InvestmentScenarioPayload): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(INVESTMENT_SCENARIO_STORAGE_KEY, JSON.stringify(scenario));
  } catch {
    /* ignore quota */
  }
}

export function loadInvestmentScenario(): InvestmentScenarioPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(INVESTMENT_SCENARIO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InvestmentScenarioPayload;
    if (
      typeof parsed.totalCapexWon !== "number" ||
      typeof parsed.equityWon !== "number" ||
      typeof parsed.loanWon !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
