/** REC 가중치 표시 — 1.5·1.2·1.0 등 불필요한 0 제거, 1.06 등 구간값은 소수 둘째 자리 유지 */
export function formatRecWeightDisplay(weight: number): string {
  const fixed = weight.toFixed(2);
  if (fixed.endsWith("00")) {
    return String(Math.round(weight));
  }
  if (fixed.endsWith("0")) {
    return fixed.slice(0, -1);
  }
  return fixed;
}
