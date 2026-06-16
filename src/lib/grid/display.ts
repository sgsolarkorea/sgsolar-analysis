import type { GridConnectionInfo } from "@/types/gridConnection";

/** 데이터 없음 상태 — 상세 필드 표시용 (상태 뱃지는 별도) */
export const GRID_UNKNOWN_VALUE = "미확인";

export function hasDetailedGridData(info: GridConnectionInfo): boolean {
  if (info.dataSource === "none") return false;
  const levels = [info.substation, info.transformer, info.distributionLine];
  return levels.some(
    (level) =>
      level.remainingMw != null ||
      level.cumulativeMw != null ||
      (level.name !== GRID_UNKNOWN_VALUE && level.name !== "한전 확인 필요"),
  );
}

export function formatGridLevelName(name: string, hasData: boolean): string {
  if (!hasData) return GRID_UNKNOWN_VALUE;
  if (name === "한전 확인 필요") return GRID_UNKNOWN_VALUE;
  return name;
}
