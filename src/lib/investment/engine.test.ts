import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { excelPmt, excelDebtServiceForYear } from "@/lib/investment/debt";
import { generationForYear } from "@/lib/investment/generation";
import { excelBlendedRevenue, platformMarketRevenue, normalizeExcelRecPriceToWonPerRec } from "@/lib/investment/revenue";
import { equityIrr, npvWithYear0, simplePaybackYears } from "@/lib/investment/metrics";
import { runInvestmentAnalysis } from "@/lib/investment/engine";
import {
  EXCEL_S1_EXPECTED,
  excelDefaultScenarioInput,
  excelHalfScaleScenarioInput,
  excelZeroDebtScenarioInput,
} from "@/lib/investment/excelScenarios";
import { INVESTMENT_ENGINE_VERSION } from "@/lib/investment/types";

const MONEY_TOL = 1; // 1 won
const IRR_TOL = 1e-6; // ~0.0001%p
const NPV_TOL = 1; // 1 won

describe("investment generation", () => {
  it("applies decimal degradation", () => {
    assert.equal(generationForYear(131400, 1, 0.005), 131400);
    assert.ok(Math.abs(generationForYear(131400, 2, 0.005) - 130743) < 1e-9);
  });

  it("rejects percent-looking degradation", () => {
    assert.throws(() => generationForYear(100, 1, 1.5));
  });
});

describe("investment revenue modes", () => {
  it("platform market uses 원/REC × weight / 1000", () => {
    const r = platformMarketRevenue({
      generationKwh: 100_000,
      smpPricePerKwh: 100,
      recPricePerRec: 70_000,
      recWeight: 1.5,
    });
    assert.equal(r.smpRevenueWon, 10_000_000);
    assert.equal(r.recRevenueWon, 10_500_000);
  });

  it("excel blended uses 원/kWh adder", () => {
    const r = excelBlendedRevenue({ generationKwh: 131400, blendedWonPerKwh: 193 });
    assert.equal(r.totalRevenueWon, 25_360_200);
  });

  it("normalizeExcelRecPrice documents unit bridge", () => {
    const eq = normalizeExcelRecPriceToWonPerRec(70, 1.0);
    assert.equal(eq, 70_000);
  });
});

describe("debt excel PMT", () => {
  it("matches grace interest and post-grace PMT", () => {
    assert.equal(excelDebtServiceForYear({ year: 1, loanWon: 140e6, interestRate: 0.047, graceYears: 3, loanTermYears: 20 }), 6_580_000);
    assert.equal(excelDebtServiceForYear({ year: 3, loanWon: 140e6, interestRate: 0.047, graceYears: 3, loanTermYears: 20 }), 6_580_000);
    const y4 = excelDebtServiceForYear({ year: 4, loanWon: 140e6, interestRate: 0.047, graceYears: 3, loanTermYears: 20 });
    assert.ok(Math.abs(y4 - EXCEL_S1_EXPECTED.year4Debt) < 1e-6);
    assert.ok(Math.abs(excelPmt(0.047, 17, 140e6) + EXCEL_S1_EXPECTED.year4Debt) < 1e-6);
  });
});

describe("metrics", () => {
  it("handles npv rate 0", () => {
    assert.equal(npvWithYear0(0, -100, [40, 40, 40]), 20);
  });

  it("simple payback", () => {
    assert.ok(Math.abs((simplePaybackYears(90e6, 16780200) ?? 0) - EXCEL_S1_EXPECTED.simplePayback) < 1e-9);
  });
});

describe("Excel cross-validation S1/S2/S3", () => {
  it("S1 default workbook matches Excel cached values", () => {
    const result = runInvestmentAnalysis(excelDefaultScenarioInput());
    assert.equal(result.investmentEngineVersion, INVESTMENT_ENGINE_VERSION);

    const y1 = result.years[1];
    const y4 = result.years[4];
    const y10 = result.years[10];
    const y20 = result.years[20];

    assert.ok(Math.abs(y1.generationKwh - EXCEL_S1_EXPECTED.year1Generation) < 1e-6);
    assert.ok(Math.abs(y10.generationKwh - EXCEL_S1_EXPECTED.year10Generation) < 1e-6);
    assert.ok(Math.abs(y1.totalRevenueWon - EXCEL_S1_EXPECTED.year1Revenue) < MONEY_TOL);
    assert.ok(Math.abs(y1.debtServiceWon - EXCEL_S1_EXPECTED.year1Debt) < MONEY_TOL);
    assert.ok(Math.abs(y4.debtServiceWon - EXCEL_S1_EXPECTED.year4Debt) < MONEY_TOL);
    assert.equal(y10.inverterReplacementWon, EXCEL_S1_EXPECTED.year10Inverter);
    assert.ok(Math.abs(y20.cumulativeEquityCashFlowWon - EXCEL_S1_EXPECTED.year20Cumulative) < MONEY_TOL);
    assert.equal(result.cashflowPaybackYear, EXCEL_S1_EXPECTED.paybackYear);
    assert.ok(result.equityIrr != null && Math.abs(result.equityIrr - EXCEL_S1_EXPECTED.equityIrr) < IRR_TOL);
    assert.ok(result.npvWon != null && Math.abs(result.npvWon - EXCEL_S1_EXPECTED.npvWon) < NPV_TOL);
  });

  it("S2 zero debt has no debt service and computes IRR/NPV", () => {
    const s1 = runInvestmentAnalysis(excelDefaultScenarioInput());
    const s2 = runInvestmentAnalysis(excelZeroDebtScenarioInput());
    assert.equal(s2.years[1].debtServiceWon, 0);
    assert.equal(s2.years[4].debtServiceWon, 0);
    assert.ok(s2.equityIrr != null && Number.isFinite(s2.equityIrr));
    assert.ok(s1.equityIrr != null);
    assert.ok(s2.npvWon != null);
    assert.ok(s2.cashflowPaybackYear != null);
  });

  it("S3 half scale scales generation and revenue roughly 50%", () => {
    const s1 = runInvestmentAnalysis(excelDefaultScenarioInput());
    const s3 = runInvestmentAnalysis(excelHalfScaleScenarioInput());
    assert.ok(Math.abs(s3.years[1].generationKwh - 65_700) < 1e-6);
    assert.ok(Math.abs(s3.years[1].totalRevenueWon - s1.years[1].totalRevenueWon / 2) < MONEY_TOL);
    assert.ok(s3.equityIrr != null);
    assert.ok(s3.npvWon != null);
  });
});

describe("edge cases", () => {
  it("0 generation yields nullish payback/irr when no positive CF", () => {
    const result = runInvestmentAnalysis({
      ...excelZeroDebtScenarioInput(),
      year1GenerationKwh: 0,
      loanWon: 0,
      equityWon: 10_000_000,
      totalCapexWon: 10_000_000,
    });
    assert.equal(result.years[1].totalRevenueWon, 0);
    assert.equal(result.equityIrr, null);
  });

  it("rejects bad IRR with NaN never returned", () => {
    const irr = equityIrr([0, 0, 0]);
    assert.equal(irr, null);
  });
});
