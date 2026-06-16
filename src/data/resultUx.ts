import type { ProgressStatusKind } from "@/components/result/AnalysisProgressPanel";
import { hasBuildingRecord, hasLandRecord } from "@/lib/api/infoFallbacks";
import { getFieldValue, parseAreaSqm } from "@/lib/solar/calculate";
import type { InfoField } from "@/types/siteReview";

export { hasBuildingRecord } from "@/lib/api/infoFallbacks";

export interface ProgressStepConfig {
  id: string;
  label: string;
  statusLabel: string;
  statusKind: ProgressStatusKind;
  description: string;
}

/** 결과 페이지 섹션 순서와 동일 */
export const ANALYSIS_PROGRESS_STEPS: ProgressStepConfig[] = [
  {
    id: "address-check",
    label: "주소 확인",
    statusLabel: "완료",
    statusKind: "complete",
    description: "주소 및 위치 확인 완료",
  },
  {
    id: "site-location",
    label: "입지 위치",
    statusLabel: "완료",
    statusKind: "complete",
    description: "위치 지도 확인 완료",
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
    description: "지목·면적·용도지역·공시지가 확인",
  },
  {
    id: "region-district",
    label: "지역/지구 분석",
    statusLabel: "참고",
    statusKind: "reference",
    description: "지역·지구별 설치 검토 가능성",
  },
  {
    id: "building-info",
    label: "건축물 정보",
    statusLabel: "완료",
    statusKind: "complete",
    description: "건축물 정보 확인 완료",
  },
  {
    id: "setback-review",
    label: "이격거리 검토",
    statusLabel: "참고",
    statusKind: "reference",
    description: "이격거리 기준 참고 검토",
  },
  {
    id: "local-ordinance",
    label: "법·조례 검토",
    statusLabel: "참고",
    statusKind: "reference",
    description: "지자체 조례·허가기준 참고",
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

export function resolveProgressSteps(
  landInfo: InfoField[],
  buildingInfo: InfoField[],
): ProgressStepConfig[] {
  return ANALYSIS_PROGRESS_STEPS.map((step) => {
    if (step.id === "land-info") {
      return hasLandRecord(landInfo)
        ? {
            ...step,
            statusLabel: "완료",
            statusKind: "complete" as ProgressStatusKind,
            description: "지목·면적·용도지역·공시지가 확인",
          }
        : {
            ...step,
            statusLabel: "추가 확인",
            statusKind: "caution" as ProgressStatusKind,
            description: "토지정보 추가 확인 필요",
          };
    }

    if (step.id === "region-district") {
      return hasLandRecord(landInfo)
        ? {
            ...step,
            statusLabel: "참고",
            statusKind: "reference" as ProgressStatusKind,
            description: "용도지역 기준 1차 매칭",
          }
        : {
            ...step,
            statusLabel: "추가 확인",
            statusKind: "caution" as ProgressStatusKind,
            description: "토지정보 확인 후 분석 가능",
          };
    }

    if (step.id === "building-info") {
      return hasBuildingRecord(buildingInfo)
        ? {
            ...step,
            statusLabel: "완료",
            statusKind: "complete" as ProgressStatusKind,
            description: "건축물 정보 확인 완료",
          }
        : {
            ...step,
            statusLabel: "추가 확인",
            statusKind: "caution" as ProgressStatusKind,
            description: "건축물 정보 추가 확인 필요",
          };
    }

    return step;
  });
}

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
