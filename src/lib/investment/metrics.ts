/** IRR / NPV / payback pure metrics. */

/**
 * Excel NPV(rate, values) + year0 convention:
 * npv = sum_{t=1..n} CF_t / (1+r)^t  + CF_0
 * where values are year1..yearN cash flows.
 */
export function npvWithYear0(discountRate: number, year0: number, year1ToN: number[]): number {
  let sum = year0;
  for (let i = 0; i < year1ToN.length; i++) {
    sum += year1ToN[i] / (1 + discountRate) ** (i + 1);
  }
  return sum;
}

/**
 * Equity IRR via Newton-Raphson with bisection fallback.
 * Returns null if no sign change / no finite root.
 */
export function equityIrr(cashFlows: number[]): number | null {
  if (cashFlows.length < 2) return null;
  const hasPos = cashFlows.some((v) => v > 0);
  const hasNeg = cashFlows.some((v) => v < 0);
  if (!hasPos || !hasNeg) return null;

  const npvAt = (rate: number): number => {
    let total = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      total += cashFlows[t] / (1 + rate) ** t;
    }
    return total;
  };

  const dNpvAt = (rate: number): number => {
    let total = 0;
    for (let t = 1; t < cashFlows.length; t++) {
      total -= (t * cashFlows[t]) / (1 + rate) ** (t + 1);
    }
    return total;
  };

  let rate = 0.1;
  for (let i = 0; i < 64; i++) {
    const f = npvAt(rate);
    const df = dNpvAt(rate);
    if (!Number.isFinite(f) || !Number.isFinite(df) || Math.abs(df) < 1e-14) break;
    const next = rate - f / df;
    if (!Number.isFinite(next) || next <= -0.999999) break;
    if (Math.abs(next - rate) < 1e-12) {
      if (Math.abs(f) < 1e-2) return next;
      break; // fall through to bisection
    }
    rate = next;
  }

  // Bisection: find bracket where NPV changes sign
  let lo = 0;
  let hi = 1;
  let fLo = npvAt(lo);
  let fHi = npvAt(hi);
  if (fLo * fHi > 0) {
    // expand search
    const candidates = [-0.5, -0.2, 0.05, 0.2, 0.5, 2, 5, 10, 20, 50];
    let found = false;
    for (let i = 0; i < candidates.length - 1; i++) {
      const a = candidates[i];
      const b = candidates[i + 1];
      const fa = npvAt(a);
      const fb = npvAt(b);
      if (Number.isFinite(fa) && Number.isFinite(fb) && fa * fb <= 0) {
        lo = a;
        hi = b;
        fLo = fa;
        fHi = fb;
        found = true;
        break;
      }
    }
    if (!found) return null;
  }

  for (let i = 0; i < 128; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npvAt(mid);
    if (!Number.isFinite(fMid)) return null;
    if (Math.abs(fMid) < 1e-6 || (hi - lo) / 2 < 1e-12) return mid;
    if (fLo * fMid <= 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

/** Simple payback = equity / year1 equity CF (Excel). */
export function simplePaybackYears(equityWon: number, year1EquityCashFlow: number): number | null {
  if (equityWon <= 0 || year1EquityCashFlow <= 0) return null;
  return equityWon / year1EquityCashFlow;
}

/**
 * First year index (1..N) where cumulative equity CF >= 0.
 * Year0 is included in the series as index 0.
 */
export function cumulativePaybackYear(cumulativeIncludingYear0: number[]): number | null {
  for (let i = 1; i < cumulativeIncludingYear0.length; i++) {
    if (cumulativeIncludingYear0[i] >= 0) return i;
  }
  return null;
}

/**
 * Linear interpolation between last negative cumulative and next year CF.
 * Returns fractional years from year 0.
 */
export function cumulativePaybackYearsExact(
  equityCashFlows: number[],
  cumulatives: number[],
): number | null {
  for (let i = 1; i < cumulatives.length; i++) {
    if (cumulatives[i] >= 0) {
      const prev = cumulatives[i - 1];
      const cf = equityCashFlows[i];
      if (prev >= 0) return i;
      if (cf <= 0) return i;
      const fraction = -prev / cf;
      return i - 1 + fraction;
    }
  }
  return null;
}
