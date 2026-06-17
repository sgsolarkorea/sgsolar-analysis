/** 상계거래(가정용) 월 절감액 기준 (원/kW) */
export const HOUSEHOLD_SAVINGS_PER_KW = 16_700;

export const HOUSEHOLD_SAVINGS_DISCLAIMER =
  "상계거래(가정용)는 생산한 전력을 자가소비하고 잉여전력을 상계 처리하는 방식입니다. 실제 절감액은 전기사용량과 계절에 따라 달라질 수 있습니다.";

export function isHouseholdInstallType(installType: string): boolean {
  return installType === "상계거래(가정용)";
}

export function calculateHouseholdMonthlySavingsWon(capacityKw: number): number {
  if (capacityKw <= 0 || !Number.isFinite(capacityKw)) return 0;
  return Math.round(capacityKw * HOUSEHOLD_SAVINGS_PER_KW);
}

export function formatHouseholdMonthlySavings(capacityKw: number): string {
  const won = calculateHouseholdMonthlySavingsWon(capacityKw);
  if (won <= 0) return "산출 불가";
  if (won >= 10_000) {
    const man = Math.round(won / 10_000);
    return `약 ${man.toLocaleString("ko-KR")}만원/월`;
  }
  return `약 ${won.toLocaleString("ko-KR")}원/월`;
}
