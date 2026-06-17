import type { GridConnectionStatus, GridPoleOption } from "@/types/gridConnection";

export const GRID_UNKNOWN_VALUE = "미확인";

export type GridBottleneckLevel = "substation" | "transformer" | "distributionLine";

/** KEPCO D/L 잔여용량 — vol3 → vol2 → vol1 순 fallback (kW 원값) */
export function pickDlRemainingKw(input: {
  vol1?: string | number | null;
  vol2?: string | number | null;
  vol3?: string | number | null;
}): number | null {
  for (const key of ["vol3", "vol2", "vol1"] as const) {
    const raw = input[key];
    if (raw == null || raw === "") continue;
    const num = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, ""));
    if (Number.isFinite(num) && num >= 0) return num;
  }
  return null;
}

/** KEPCO D/L 잔여용량 MW (vol3 → vol2 → vol1) */
export function pickDlRemainingMw(input: {
  vol1?: string | number | null;
  vol2?: string | number | null;
  vol3?: string | number | null;
}): number | null {
  const kw = pickDlRemainingKw(input);
  if (kw == null) return null;
  return Math.round((kw / 1000) * 1000) / 1000;
}

export const GRID_STATUS_LABELS: Record<GridConnectionStatus, string> = {
  high: "🟢 연계 가능성 높음",
  review: "🟡 추가 검토 필요",
  difficult: "🔴 연계 제한 가능",
  unknown: "⚫ 한전 확인 필요",
};

export const GRID_DISCLAIMER_TEXT =
  "본 결과는 공개 데이터 기반 1차 검토이며 실제 계통 연계 가능 여부는 한전 접수 및 선로 검토 후 확정됩니다.";

const BOTTLENECK_PRIORITY: GridBottleneckLevel[] = [
  "transformer",
  "substation",
  "distributionLine",
];

function levelRemaining(
  pole: GridPoleOption,
  level: GridBottleneckLevel,
): number | null {
  switch (level) {
    case "substation":
      return pole.substation.remainingMw;
    case "transformer":
      return pole.transformer.remainingMw;
    case "distributionLine":
      return pole.distributionLine.remainingMw;
  }
}

/** min(변전소, MTR, D/L) 잔여용량 MW */
export function pickBottleneckRemainingMw(pole: GridPoleOption): number | null {
  const values = BOTTLENECK_PRIORITY.map((level) => levelRemaining(pole, level)).filter(
    (v): v is number => v != null && v >= 0,
  );

  if (!values.length) return null;
  return Math.min(...values);
}

/** 잔여용량이 가장 적은 설비 식별 (동률 시 MTR → 변전소 → D/L) */
export function identifyBottleneckLevel(pole: GridPoleOption): GridBottleneckLevel | null {
  const levels = BOTTLENECK_PRIORITY.map((level) => ({
    level,
    mw: levelRemaining(pole, level),
  })).filter((entry): entry is { level: GridBottleneckLevel; mw: number } =>
    entry.mw != null && entry.mw >= 0,
  );

  if (!levels.length) return null;

  const minMw = Math.min(...levels.map((entry) => entry.mw));
  for (const priority of BOTTLENECK_PRIORITY) {
    const match = levels.find((entry) => entry.level === priority && entry.mw === minMw);
    if (match) return match.level;
  }

  return levels[0]?.level ?? null;
}

export function isLevelSufficient(
  remainingMw: number | null | undefined,
  expectedCapacityMw: number,
): boolean | null {
  if (remainingMw == null || !Number.isFinite(remainingMw)) return null;
  return remainingMw > expectedCapacityMw;
}

/**
 * 변전소·MTR·D/L 3단계 모두 > 설치용량일 때만 high.
 * 일부 부족 시 review(경계) 또는 difficult(명확한 부족).
 */
export function evaluateGridConnectionStatus(
  pole: GridPoleOption,
  expectedCapacityMw: number,
): GridConnectionStatus {
  if (expectedCapacityMw <= 0) return "unknown";

  const substation = pole.substation.remainingMw;
  const transformer = pole.transformer.remainingMw;
  const distributionLine = pole.distributionLine.remainingMw;

  if (substation == null && transformer == null && distributionLine == null) {
    return "unknown";
  }

  const allPresent =
    substation != null && transformer != null && distributionLine != null;

  const allSufficient =
    allPresent &&
    substation > expectedCapacityMw &&
    transformer > expectedCapacityMw &&
    distributionLine > expectedCapacityMw;

  if (allSufficient) return "high";

  const anyInsufficient =
    (substation != null && substation <= expectedCapacityMw) ||
    (transformer != null && transformer <= expectedCapacityMw) ||
    (distributionLine != null && distributionLine <= expectedCapacityMw);

  if (anyInsufficient) {
    const bottleneckMw = pickBottleneckRemainingMw(pole);
    if (
      bottleneckMw != null &&
      (bottleneckMw <= 0 || bottleneckMw < expectedCapacityMw * 0.95)
    ) {
      return "difficult";
    }
    return "review";
  }

  if (!allPresent) return "review";

  return "review";
}

export function buildReviewResult(
  status: GridConnectionStatus,
  pole: GridPoleOption,
  expectedMw: number,
): string {
  void expectedMw;

  if (status === "unknown") {
    return "계통 공개 데이터 미확보 — 선로용량 확인 권장";
  }

  if (status === "high") {
    return [
      "🟢 검토 결과",
      "변전소, 변압기(MTR), 배전선로(D/L) 모두 충분한 잔여용량이 확인되었습니다.",
      "1차 검토 기준 연계 가능성이 높습니다.",
    ].join("\n");
  }

  const prefix = status === "review" ? "🟡" : "🔴";
  const bottleneck = identifyBottleneckLevel(pole);

  switch (bottleneck) {
    case "transformer":
      return [
        `${prefix} 검토 결과`,
        "변압기(MTR) 잔여용량이 부족합니다.",
        "D/L 여유와 무관하게 계통연계 제한 가능성이 있습니다.",
        "관할 한전 지사 확인이 필요합니다.",
      ].join("\n");
    case "substation":
      return [
        `${prefix} 검토 결과`,
        "변전소 잔여용량이 부족합니다.",
        "현재 기준으로는 연계가 어려울 수 있습니다.",
      ].join("\n");
    case "distributionLine":
      return [
        `${prefix} 검토 결과`,
        "배전선로(D/L) 잔여용량이 부족합니다.",
        "계통 증설 또는 별도 검토가 필요합니다.",
      ].join("\n");
    default:
      return [
        `${prefix} 검토 결과`,
        "잔여용량 추가 확인이 필요합니다.",
      ].join("\n");
  }
}

export function formatMw(
  value: number | null | undefined,
  fallback = GRID_UNKNOWN_VALUE,
): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}MW`;
}

/** D/L 잔여용량 표시 — kW→MW 변환값 소수 3자리 (예: 8.001MW) */
export function formatDlRemainingMw(
  value: number | null | undefined,
  fallback = GRID_UNKNOWN_VALUE,
): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return `${value.toLocaleString("ko-KR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}MW`;
}

/** 태양광 설치용량 — MW + kW 동시 표기 (소용량 0MW 방지) */
export function formatSolarCapacityMwKw(
  capacityKw: number,
  fallback = GRID_UNKNOWN_VALUE,
): string {
  if (capacityKw <= 0 || !Number.isFinite(capacityKw)) return fallback;
  const mw = Math.round((capacityKw / 1000) * 1000) / 1000;
  const mwStr = mw.toLocaleString("ko-KR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  const kwStr = capacityKw.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
  return `${mwStr}MW (${kwStr}kW)`;
}

/** D/L 잔여용량 MW + kW 병기 (D/L 카드 전용) */
export function formatDlRemainingMwKw(
  value: number | null | undefined,
  fallback = GRID_UNKNOWN_VALUE,
): { primary: string; secondary?: string } {
  if (value == null || !Number.isFinite(value)) {
    return { primary: fallback };
  }
  const kw = Math.round(value * 1000);
  return {
    primary: formatDlRemainingMw(value),
    secondary: `(${kw.toLocaleString("ko-KR")}kW)`,
  };
}

export function formatCapacityMargin(
  remainingMw: number | null,
  expectedMw: number,
): { mw: number | null; display: string } {
  if (remainingMw == null || expectedMw <= 0) {
    return { mw: null, display: GRID_UNKNOWN_VALUE };
  }
  const margin = remainingMw - expectedMw;
  const sign = margin >= 0 ? "+" : "";
  return {
    mw: margin,
    display: `${sign}${margin.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}MW`,
  };
}

export function formatRemainingWithStatus(
  remainingMw: number | null | undefined,
  expectedCapacityMw: number,
): string {
  const base = formatMw(remainingMw);
  if (remainingMw == null || !Number.isFinite(remainingMw) || expectedCapacityMw <= 0) {
    return base;
  }
  if (remainingMw > expectedCapacityMw) {
    return `${base} 🟢 가능`;
  }
  return `${base} 🔴 부족`;
}
