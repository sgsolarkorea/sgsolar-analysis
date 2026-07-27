import type { InvestmentAnalysisInput, SensitivityScenarioResult } from "@/lib/investment/types";
import { runInvestmentAnalysis } from "@/lib/investment/engine";

/** Simple sensitivity strip — not a full matrix. */
export function runPriceSensitivity(
  base: InvestmentAnalysisInput,
  deltas: number[] = [-0.2, -0.1, 0, 0.1, 0.2],
): SensitivityScenarioResult[] {
  return deltas.map((delta) => {
    const label =
      delta === 0 ? "기준" : `시장가격 ${delta > 0 ? "+" : ""}${Math.round(delta * 100)}%`;
    let input: InvestmentAnalysisInput = { ...base };
    if (base.revenueMode === "excel_blended_kwh") {
      input = {
        ...input,
        blendedWonPerKwh: (base.blendedWonPerKwh ?? 0) * (1 + delta),
      };
    } else {
      input = {
        ...input,
        smpPricePerKwh: (base.smpPricePerKwh ?? 0) * (1 + delta),
        recPricePerRec: (base.recPricePerRec ?? 0) * (1 + delta),
      };
    }
    const result = runInvestmentAnalysis(input);
    return {
      label,
      equityIrr: result.equityIrr,
      cashflowPaybackYear: result.cashflowPaybackYear,
      npvWon: result.npvWon,
      totalRevenueWon: result.totalRevenueWon,
    };
  });
}
