/**
 * Market-price-based annual revenue (same formula as calculateSolarMetrics).
 * SMP: kWh × 원/kWh
 * REC: (kWh / 1000) × 원/MWh(=REC) × weight
 */

export interface MarketRevenueInput {
  annualGenerationKwh: number;
  smpPricePerKwh: number;
  recPricePerRec: number;
  recWeight: number;
}

export interface MarketRevenueResult {
  smpRevenueWon: number;
  recRevenueWon: number;
  totalRevenueWon: number;
}

export function calculateMarketRevenue(input: MarketRevenueInput): MarketRevenueResult {
  const gen = Number.isFinite(input.annualGenerationKwh) ? Math.max(0, input.annualGenerationKwh) : 0;
  const smp = Number.isFinite(input.smpPricePerKwh) && input.smpPricePerKwh > 0 ? input.smpPricePerKwh : 0;
  const rec = Number.isFinite(input.recPricePerRec) && input.recPricePerRec > 0 ? input.recPricePerRec : 0;
  const weight = Number.isFinite(input.recWeight) && input.recWeight > 0 ? input.recWeight : 0;

  const smpRevenueWon = gen * smp;
  const recRevenueWon = (gen / 1000) * rec * weight;
  const totalRevenueWon = smpRevenueWon + recRevenueWon;

  return {
    smpRevenueWon,
    recRevenueWon,
    totalRevenueWon,
  };
}

/** Display helper: won → "약 N만원" style (matches solar calculate rounding spirit). */
export function formatMarketWon(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "산정 불가";
  if (amount >= 100_000_000) {
    const eok = amount / 100_000_000;
    const rounded = Math.round(eok * 10) / 10;
    return `약 ${rounded}억원`;
  }
  const man = Math.round(amount / 10_000);
  if (man <= 0) return `${Math.round(amount).toLocaleString("ko-KR")}원`;
  return `약 ${man.toLocaleString("ko-KR")}만원`;
}

export function formatMarketWonPerYear(amount: number): string {
  const base = formatMarketWon(amount);
  if (base === "산정 불가") return base;
  return `${base}/년`;
}

export function averagePositive(values: number[]): { avg: number; sampleCount: number } | null {
  const valid = values.filter((v) => Number.isFinite(v) && v > 0);
  if (valid.length === 0) return null;
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  return { avg, sampleCount: valid.length };
}
