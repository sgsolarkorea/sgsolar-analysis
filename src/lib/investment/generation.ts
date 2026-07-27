/** Pure generation helpers for investment engine. */

/**
 * Year N generation with annual degradation.
 * degradationRate must be decimal (0.005 = 0.5%/yr). Values > 1 throw.
 */
export function generationForYear(
  year1GenerationKwh: number,
  year: number,
  degradationRate: number,
): number {
  if (year < 1) return 0;
  if (!Number.isFinite(year1GenerationKwh) || year1GenerationKwh < 0) return 0;
  if (!Number.isFinite(degradationRate) || degradationRate < 0) {
    throw new Error("degradationRate must be a non-negative decimal (e.g. 0.005)");
  }
  if (degradationRate > 1) {
    throw new Error("degradationRate looks like a percent; use decimal (0.5% → 0.005)");
  }
  return year1GenerationKwh * (1 - degradationRate) ** (year - 1);
}

/** Excel Year1 generation from capacity × utilization. */
export function excelYear1GenerationFromUtilization(capacityKw: number, utilization: number): number {
  return capacityKw * utilization * 24 * 365;
}
