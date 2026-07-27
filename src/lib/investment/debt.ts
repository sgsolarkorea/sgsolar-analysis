/**
 * Debt schedule matching Excel convention:
 * - Grace years: interest-only on full principal (이자만 납부, not capitalized)
 * - After grace: constant PMT(rate, loanTerm-grace, principal) for remaining years
 * - PMT uses Excel sign: payment as positive outflow via -PMT(...)
 */

import type { DebtYearRow } from "@/lib/investment/types";

/** Excel PMT(rate, nper, pv) — returns payment amount (negative if pv > 0). */
export function excelPmt(rate: number, nper: number, pv: number): number {
  if (nper <= 0) return 0;
  if (rate === 0) return -pv / nper;
  const factor = (1 + rate) ** nper;
  return (-pv * rate * factor) / (factor - 1);
}

/**
 * Annual debt service for year n (1-indexed), Excel F-column semantics.
 * Returns positive outflow amount.
 */
export function excelDebtServiceForYear(params: {
  year: number;
  loanWon: number;
  interestRate: number;
  graceYears: number;
  loanTermYears: number;
}): number {
  const { year, loanWon, interestRate, graceYears, loanTermYears } = params;
  if (loanWon <= 0 || year < 1) return 0;
  if (year <= graceYears) {
    return loanWon * interestRate;
  }
  if (year <= loanTermYears) {
    const nper = loanTermYears - graceYears;
    return -excelPmt(interestRate, nper, loanWon);
  }
  return 0;
}

/**
 * Approximate principal schedule for reporting.
 * Excel does not amortize principal during grace; after grace applies level PMT
 * as if full original principal amortizes over (term - grace) years.
 */
export function buildDebtSchedule(params: {
  loanWon: number;
  interestRate: number;
  graceYears: number;
  loanTermYears: number;
  analysisYears: number;
}): DebtYearRow[] {
  const { loanWon, interestRate, graceYears, loanTermYears, analysisYears } = params;
  const rows: DebtYearRow[] = [];
  let principal = Math.max(0, loanWon);
  const amortYears = Math.max(0, loanTermYears - graceYears);
  const levelPayment = loanWon > 0 && amortYears > 0 ? -excelPmt(interestRate, amortYears, loanWon) : 0;

  for (let year = 1; year <= analysisYears; year++) {
    const opening = principal;
    const isGrace = year <= graceYears;
    let interest = 0;
    let principalPay = 0;
    let total = 0;

    if (loanWon <= 0 || year > loanTermYears || opening <= 0) {
      rows.push({
        year,
        openingPrincipalWon: opening,
        interestPaymentWon: 0,
        principalPaymentWon: 0,
        totalDebtServiceWon: 0,
        closingPrincipalWon: opening,
        isGrace: false,
      });
      continue;
    }

    if (isGrace) {
      interest = opening * interestRate;
      principalPay = 0;
      total = interest;
      principal = opening;
    } else {
      interest = opening * interestRate;
      principalPay = Math.min(opening, Math.max(0, levelPayment - interest));
      // Last amort year: clear residual principal
      if (year === loanTermYears || opening - principalPay < 1) {
        principalPay = opening;
        total = interest + principalPay;
        principal = 0;
      } else {
        total = levelPayment;
        principal = opening - principalPay;
      }
    }

    rows.push({
      year,
      openingPrincipalWon: opening,
      interestPaymentWon: interest,
      principalPaymentWon: principalPay,
      totalDebtServiceWon: total,
      closingPrincipalWon: principal,
      isGrace,
    });
  }

  return rows;
}
