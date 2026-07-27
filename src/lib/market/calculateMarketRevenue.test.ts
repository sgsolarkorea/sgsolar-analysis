import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  averagePositive,
  calculateMarketRevenue,
  formatMarketWon,
  formatMarketWonPerYear,
} from "./calculateMarketRevenue";

describe("calculateMarketRevenue", () => {
  it("computes SMP + REC with weight 1.5", () => {
    const r = calculateMarketRevenue({
      annualGenerationKwh: 100_000,
      smpPricePerKwh: 100,
      recPricePerRec: 70_000,
      recWeight: 1.5,
    });
    assert.equal(r.smpRevenueWon, 10_000_000);
    assert.equal(r.recRevenueWon, 10_500_000);
    assert.equal(r.totalRevenueWon, 20_500_000);
  });

  it("handles weight 1.0", () => {
    const r = calculateMarketRevenue({
      annualGenerationKwh: 1000,
      smpPricePerKwh: 112,
      recPricePerRec: 71_800,
      recWeight: 1,
    });
    assert.equal(r.smpRevenueWon, 112_000);
    assert.equal(r.recRevenueWon, 71_800);
  });

  it("handles weight 1.2", () => {
    const r = calculateMarketRevenue({
      annualGenerationKwh: 10_000,
      smpPricePerKwh: 100,
      recPricePerRec: 50_000,
      recWeight: 1.2,
    });
    assert.equal(r.smpRevenueWon, 1_000_000);
    assert.equal(r.recRevenueWon, 600_000);
  });

  it("returns zeros for generation 0", () => {
    const r = calculateMarketRevenue({
      annualGenerationKwh: 0,
      smpPricePerKwh: 100,
      recPricePerRec: 70_000,
      recWeight: 1.5,
    });
    assert.equal(r.totalRevenueWon, 0);
  });

  it("treats missing SMP as 0 contribution", () => {
    const r = calculateMarketRevenue({
      annualGenerationKwh: 10_000,
      smpPricePerKwh: 0,
      recPricePerRec: 70_000,
      recWeight: 1,
    });
    assert.equal(r.smpRevenueWon, 0);
    assert.equal(r.recRevenueWon, 700_000);
  });

  it("treats missing REC as 0 contribution", () => {
    const r = calculateMarketRevenue({
      annualGenerationKwh: 10_000,
      smpPricePerKwh: 100,
      recPricePerRec: 0,
      recWeight: 1.5,
    });
    assert.equal(r.smpRevenueWon, 1_000_000);
    assert.equal(r.recRevenueWon, 0);
  });

  it("handles large capacity generation", () => {
    const r = calculateMarketRevenue({
      annualGenerationKwh: 760_141,
      smpPricePerKwh: 112,
      recPricePerRec: 71_800,
      recWeight: 1.5,
    });
    assert.ok(r.totalRevenueWon > 100_000_000);
  });
});

describe("formatMarketWon", () => {
  it("formats manwon", () => {
    assert.match(formatMarketWon(12_340_000), /만원/);
  });

  it("formats per year", () => {
    assert.match(formatMarketWonPerYear(12_340_000), /\/년$/);
  });
});

describe("averagePositive", () => {
  it("ignores zeros and negatives", () => {
    const r = averagePositive([100, 0, -1, 200]);
    assert.ok(r);
    assert.equal(r.sampleCount, 2);
    assert.equal(r.avg, 150);
  });

  it("returns null for empty", () => {
    assert.equal(averagePositive([]), null);
  });
});
