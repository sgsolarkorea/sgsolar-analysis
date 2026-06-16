const PROJECT_YEARS = 20;

/** 20년 균등 연간 현금흐름 기준 IRR (%, 소수 1자리) */
export function calculateIrrPercent(
  initialInvestmentWon: number,
  annualCashFlowWon: number,
  years: number = PROJECT_YEARS,
): number {
  if (initialInvestmentWon <= 0 || annualCashFlowWon <= 0 || years <= 0) {
    return 0;
  }

  let low = -0.99;
  let high = 5;

  for (let i = 0; i < 80; i++) {
    const rate = (low + high) / 2;
    let npv = -initialInvestmentWon;
    for (let year = 1; year <= years; year++) {
      npv += annualCashFlowWon / Math.pow(1 + rate, year);
    }
    if (npv > 0) {
      low = rate;
    } else {
      high = rate;
    }
  }

  return Math.round(((low + high) / 2) * 1000) / 10;
}

/** 20년 누적 순수익 대비 투자비 ROI (%, 소수 1자리) */
export function calculateRoiPercent(
  initialInvestmentWon: number,
  annualCashFlowWon: number,
  years: number = PROJECT_YEARS,
): number {
  if (initialInvestmentWon <= 0) {
    return 0;
  }
  const cumulativeNet = annualCashFlowWon * years - initialInvestmentWon;
  return Math.round((cumulativeNet / initialInvestmentWon) * 1000) / 10;
}

export { PROJECT_YEARS };
