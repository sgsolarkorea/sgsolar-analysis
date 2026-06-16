/** REC 가중치 표시 — 고시 절사값(최대 소수 4자리), 불필요한 0 제거 */
export function formatRecWeightDisplay(weight: number): string {
  const fixed = weight.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  if (!fixed.includes(".")) {
    return fixed;
  }
  const [, decimals = ""] = fixed.split(".");
  if (decimals.length <= 2) {
    return fixed;
  }
  return fixed;
}
