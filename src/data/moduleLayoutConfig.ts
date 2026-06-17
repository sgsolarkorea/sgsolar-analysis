import { modulePowerW } from "@/data/solarConfig";

/** 예상 모듈 가배치도 — 모듈·배치 기준값 */
export const moduleLayoutConfig = {
  modulePowerW,
  moduleAreaSqm: 2.795,
  /** 640W 모듈 실측 치수 (m) — 길이 × 너비 */
  moduleLengthM: 2.278,
  moduleWidthM: 1.134,
  tiers: 2,
  tierGapM: 0.05,
  colGapM: 0.05,
  boundaryInsetM: 0.5,
  land: {
    rowSpacingM: 3,
    tiltDeg: 15,
  },
  roof: {
    rowSpacingM: 2.45,
    tiltDeg: 12,
  },
  colors: {
    module: "#1e293b",
    boundary: "#f59e0b",
    boundaryFill: "rgba(245, 158, 11, 0.08)",
  },
  disclaimer:
    "본 가배치도는 1차 참고용이며, 실제 설치 시 지형·음영·구조·이격거리·인허가 조건에 따라 모듈 수량과 배치가 달라질 수 있습니다.",
} as const;

export type ModuleLayoutInstallKind = "land" | "roof";

export function resolveModuleLayoutKind(installType: string): ModuleLayoutInstallKind {
  return installType === "토지형" ? "land" : "roof";
}
