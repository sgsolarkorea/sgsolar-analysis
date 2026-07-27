/**
 * Revenue helpers.
 * Platform market (production) vs Excel blended 원/kWh (CV only).
 */

export function platformMarketRevenue(params: {
  generationKwh: number;
  smpPricePerKwh: number;
  recPricePerRec: number;
  recWeight: number;
}): { smpRevenueWon: number; recRevenueWon: number; totalRevenueWon: number } {
  const { generationKwh, smpPricePerKwh, recPricePerRec, recWeight } = params;
  const gen = Number.isFinite(generationKwh) && generationKwh > 0 ? generationKwh : 0;
  const smp = Number.isFinite(smpPricePerKwh) ? smpPricePerKwh : 0;
  const rec = Number.isFinite(recPricePerRec) ? recPricePerRec : 0;
  const weight = Number.isFinite(recWeight) ? recWeight : 0;
  const smpRevenueWon = gen * smp;
  const recRevenueWon = (gen / 1000) * rec * weight;
  return {
    smpRevenueWon,
    recRevenueWon,
    totalRevenueWon: smpRevenueWon + recRevenueWon,
  };
}

/** Excel legacy: REC stored as 원/kWh adder; Total = Gen × (SMP + REC). */
export function excelBlendedRevenue(params: {
  generationKwh: number;
  blendedWonPerKwh: number;
}): { smpRevenueWon: number; recRevenueWon: number; totalRevenueWon: number } {
  const gen = Number.isFinite(params.generationKwh) && params.generationKwh > 0 ? params.generationKwh : 0;
  const blended = Number.isFinite(params.blendedWonPerKwh) ? params.blendedWonPerKwh : 0;
  const totalRevenueWon = gen * blended;
  return {
    smpRevenueWon: totalRevenueWon,
    recRevenueWon: 0,
    totalRevenueWon,
  };
}

/**
 * Convert Excel REC 원/kWh + generation into an equivalent 원/REC for documentation.
 * Does NOT change Excel CV — use excelBlendedRevenue for that.
 * equivRecPerRec = recWonPerKwh * 1000 / weight (if weight > 0)
 */
export function normalizeExcelRecPriceToWonPerRec(
  recWonPerKwh: number,
  recWeight: number,
): number | null {
  if (!Number.isFinite(recWonPerKwh) || !Number.isFinite(recWeight) || recWeight <= 0) return null;
  return (recWonPerKwh * 1000) / recWeight;
}
