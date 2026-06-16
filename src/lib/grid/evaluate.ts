import type { GridConnectionStatus, GridPoleOption } from "@/types/gridConnection";

export const GRID_STATUS_LABELS: Record<GridConnectionStatus, string> = {
  high: "연계 가능성 높음",
  review: "추가 확인 필요",
  difficult: "연계 어려움",
  unknown: "한전 확인 필요",
};

export const GRID_DISCLAIMER_TEXT =
  "본 결과는 공개 데이터 기반 1차 검토이며 실제 계통 연계 가능 여부는 한전 접수 및 선로 검토 후 확정됩니다.";

/** D/L 잔여용량을 1차 기준으로 판정 */
export function pickBottleneckRemainingMw(pole: GridPoleOption): number | null {
  const dl = pole.distributionLine.remainingMw;
  if (dl != null && dl >= 0) return dl;

  const candidates = [
    pole.transformer.remainingMw,
    pole.substation.remainingMw,
  ].filter((v): v is number => v != null && v >= 0);

  if (!candidates.length) return null;
  return Math.min(...candidates);
}

export function evaluateGridConnectionStatus(
  remainingMw: number | null,
  expectedCapacityMw: number,
): GridConnectionStatus {
  if (remainingMw == null || expectedCapacityMw <= 0) {
    return "unknown";
  }
  if (remainingMw >= expectedCapacityMw * 1.2) {
    return "high";
  }
  if (remainingMw >= expectedCapacityMw) {
    return "review";
  }
  return "difficult";
}

export function buildReviewResult(
  status: GridConnectionStatus,
  remainingMw: number | null,
  expectedMw: number,
): string {
  if (status === "unknown") {
    return "공개 데이터 미확보 — 한전 선로용량 확인 필요";
  }
  const remaining = remainingMw?.toFixed(1) ?? "—";
  const expected = expectedMw.toFixed(1);
  switch (status) {
    case "high":
      return `D/L 잔여 ${remaining}MW 대비 예상 ${expected}MW — 여유 구간(120% 이상)`;
    case "review":
      return `D/L 잔여 ${remaining}MW — 예상 ${expected}MW 접속 시 추가 선로·변압기 검토 권장`;
    case "difficult":
      return `D/L 잔여 ${remaining}MW — 예상 ${expected}MW 대비 잔여 부족, 대안 선로·승압 검토 필요`;
    default:
      return "한전 확인 필요";
  }
}

export function formatMw(value: number | null | undefined, fallback = "한전 확인 필요"): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}MW`;
}

export function formatCapacityMargin(
  remainingMw: number | null,
  expectedMw: number,
): { mw: number | null; display: string } {
  if (remainingMw == null || expectedMw <= 0) {
    return { mw: null, display: "한전 확인 필요" };
  }
  const margin = remainingMw - expectedMw;
  const sign = margin >= 0 ? "+" : "";
  return {
    mw: margin,
    display: `${sign}${margin.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}MW`,
  };
}
