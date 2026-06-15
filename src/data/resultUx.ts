import type { ProgressStatusKind } from "@/components/result/AnalysisProgressPanel";
import { getFieldValue, parseAreaSqm } from "@/lib/solar/calculate";
import type { InfoField } from "@/types/siteReview";

export interface ProgressStepConfig {
  id: string;
  label: string;
  statusLabel: string;
  statusKind: ProgressStatusKind;
  description: string;
}

/** 페이지 섹션 순서와 동일하게 유지 */
export const ANALYSIS_PROGRESS_STEPS: ProgressStepConfig[] = [
  {
    id: "address-check",
    label: "주소 확인",
    statusLabel: "완료",
    statusKind: "complete",
    description: "카카오 주소검색 완료",
  },
  {
    id: "site-location",
    label: "입지 위치",
    statusLabel: "완료",
    statusKind: "complete",
    description: "카카오 지도 위치 확인",
  },
  {
    id: "site-overview",
    label: "입지 분석 개요",
    statusLabel: "완료",
    statusKind: "complete",
    description: "추천 유형·시공비 개요",
  },
  {
    id: "land-info",
    label: "토지 정보",
    statusLabel: "완료",
    statusKind: "complete",
    description: "VWorld 지목·면적·용도지역 조회 완료",
  },
  {
    id: "building-info",
    label: "건축물 정보",
    statusLabel: "완료",
    statusKind: "complete",
    description: "건축물대장 조회 완료",
  },
  {
    id: "capacity-analysis",
    label: "설치용량 분석",
    statusLabel: "검토완료",
    statusKind: "reviewed",
    description: "640W 모듈 기준 용량 산정",
  },
  {
    id: "generation",
    label: "예상 발전량",
    statusLabel: "참고",
    statusKind: "reference",
    description: "월별·연간 발전량 참고",
  },
  {
    id: "revenue",
    label: "수익성 분석",
    statusLabel: "참고",
    statusKind: "reference",
    description: "SMP·REC 기준 참고용 산정",
  },
  {
    id: "grid",
    label: "계통 연계",
    statusLabel: "확인필요",
    statusKind: "caution",
    description: "한전 접수 전 별도 확인 필요",
  },
  {
    id: "cases",
    label: "유사 시공사례",
    statusLabel: "완료",
    statusKind: "complete",
    description: "유사 현장 시공사례 추천",
  },
  {
    id: "consultation",
    label: "상담 신청",
    statusLabel: "가능",
    statusKind: "available",
    description: "전문가 컨설팅 가능",
  },
];

export const INSTALL_TYPE_OPTIONS = [
  "지붕형",
  "토지형",
  "축사형",
  "공장형",
  "상가형",
] as const;

export type InstallTypeOption = (typeof INSTALL_TYPE_OPTIONS)[number];

export const INSTALL_TYPE_UI_MESSAGES: Record<InstallTypeOption, string> = {
  지붕형: "건물 지붕·옥상 활용 설치 유형으로 1차 검토됩니다.",
  토지형: "유휴 토지·발전사업용 설치 유형으로 1차 검토됩니다.",
  축사형: "축사 지붕 활용 대형 설치 유형으로 1차 검토됩니다.",
  공장형: "공장·창고 지붕 자가소비·발전 병행 유형으로 1차 검토됩니다.",
  상가형: "상가·근린시설 지붕 소규모 설치 유형으로 1차 검토됩니다.",
};

export function hasBuildingRecord(buildingInfo: InfoField[]): boolean {
  const buildingUse = getFieldValue(buildingInfo, "건물 용도");
  const buildingArea = getFieldValue(buildingInfo, "건축면적");

  return (
    (buildingUse !== "" && buildingUse !== "확인 필요") ||
    (buildingArea !== "" && buildingArea !== "확인 필요")
  );
}

/**
 * 기본 설치유형 산정
 * - 건축물(건축면적/용도)이 있으면 지붕형 우선
 * - 건축면적 없고 토지면적만 있으면 토지형
 * - 토지형은 명시적 추천·토지만 있을 때 적용
 */
export function resolveDefaultInstallType(
  recommendation: string,
  landInfo: InfoField[],
  buildingInfo: InfoField[],
  options?: { hasRoadAddress?: boolean },
): InstallTypeOption {
  const buildingArea = parseAreaSqm(getFieldValue(buildingInfo, "건축면적"));
  const landArea = parseAreaSqm(getFieldValue(landInfo, "면적"));
  const hasBuilding = hasBuildingRecord(buildingInfo);
  const text = recommendation.toLowerCase();

  if (text.includes("축사")) return "축사형";
  if (text.includes("공장")) return "공장형";
  if (text.includes("상가") || text.includes("근린")) return "상가형";

  if (buildingArea != null && buildingArea > 0) return "지붕형";
  if (hasBuilding) return "지붕형";

  /** 도로명주소인데 건축물대장 실패 시 토지면적만으로 토지형 용량 산정하지 않음 (94kW 오산정 방지) */
  const blockLandOnlyFallback =
    options?.hasRoadAddress === true && !hasBuilding && buildingArea == null;

  if (text.includes("토지") && landArea != null && landArea > 0 && !blockLandOnlyFallback) {
    return "토지형";
  }
  if (landArea != null && landArea > 0 && !hasBuilding && !blockLandOnlyFallback) {
    return "토지형";
  }

  if (text.includes("옥상") || text.includes("지붕")) return "지붕형";
  if (options?.hasRoadAddress) return "지붕형";
  return "지붕형";
}

/** @deprecated resolveDefaultInstallType 사용 */
export function inferDefaultInstallType(recommendation: string): InstallTypeOption {
  return resolveDefaultInstallType(recommendation, [], []);
}

export function deriveSiteRecommendation(
  installType: InstallTypeOption,
  buildingInfo: InfoField[],
): string {
  const buildingUse = getFieldValue(buildingInfo, "건물 용도");

  if (installType === "토지형") return "토지형 (경사 12° 고정형)";
  if (installType === "축사형") return "축사형 (경사 12° 고정형)";
  if (installType === "공장형") return "공장형 (경사 12° 고정형)";
  if (installType === "상가형") return "상가형 (경사 12° 고정형)";

  if (buildingUse.includes("단독") || buildingUse.includes("주택")) {
    return "지붕형 (경사 12° 고정형)";
  }

  return "옥상형 (경사 12° 고정형)";
}
