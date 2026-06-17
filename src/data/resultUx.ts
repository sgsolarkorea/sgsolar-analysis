import type { GridConnectionInfo } from "@/types/gridConnection";
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
    id: "module-layout",
    label: "모듈 가배치도",
    statusLabel: "참고",
    statusKind: "reference",
    description: "위성지도 기반 1차 모듈 배치",
  },
  {
    id: "multi-parcel",
    label: "다중 필지 검토",
    statusLabel: "가능",
    statusKind: "available",
    description: "토지형 다중 필지 합산 검토",
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

export function resolveGridProgressStep(
  gridInfo: GridConnectionInfo,
): Pick<ProgressStepConfig, "statusLabel" | "statusKind" | "description"> {
  switch (gridInfo.status) {
    case "high":
      return {
        statusLabel: "여유",
        statusKind: "available",
        description: gridInfo.reviewResult.slice(0, 48),
      };
    case "review":
      return {
        statusLabel: "추가확인",
        statusKind: "caution",
        description: gridInfo.reviewResult.slice(0, 48),
      };
    case "difficult":
      return {
        statusLabel: "여유부족",
        statusKind: "caution",
        description: gridInfo.reviewResult.slice(0, 48),
      };
    default:
      return {
        statusLabel: "확인필요",
        statusKind: "caution",
        description: "한전 선로용량 확인 필요",
      };
  }
}

export function resolveProgressSteps(
  landInfo: InfoField[],
  buildingInfo: InfoField[],
  gridInfo?: GridConnectionInfo,
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

    if (step.id === "grid" && gridInfo) {
      const gridStep = resolveGridProgressStep(gridInfo);
      return { ...step, ...gridStep };
    }

    return step;
  });
}

export const INSTALL_TYPE_OPTIONS = [
  "토지형",
  "지붕형",
  "상계거래(가정용)",
] as const;

export type InstallTypeOption = (typeof INSTALL_TYPE_OPTIONS)[number];

export const INSTALL_TYPE_UI_MESSAGES: Record<InstallTypeOption, string> = {
  토지형: "유휴 토지·발전사업용 설치 유형으로 1차 검토됩니다.",
  지붕형: "건물 지붕·옥상 활용 설치 유형으로 1차 검토됩니다.",
  "상계거래(가정용)":
    "가정용 상계거래 방식으로 전기요금 절감 효과를 1차 검토합니다.",
};

export const RESIDENTIAL_AREA_THRESHOLD_SQM = 49.5868;

export function resolveDefaultInstallType(
  _recommendation: string,
  landInfo: InfoField[],
  buildingInfo: InfoField[],
  _options?: { hasRoadAddress?: boolean },
): InstallTypeOption {
  void landInfo;
  const buildingArea = parseAreaSqm(getFieldValue(buildingInfo, "건축면적"));
  const hasBuilding = hasBuildingRecord(buildingInfo);

  if (!hasBuilding) {
    return "토지형";
  }

  if (
    buildingArea != null &&
    buildingArea > 0 &&
    buildingArea < RESIDENTIAL_AREA_THRESHOLD_SQM
  ) {
    return "상계거래(가정용)";
  }

  return "지붕형";
}

/** @deprecated resolveDefaultInstallType 사용 */
export function inferDefaultInstallType(recommendation: string): InstallTypeOption {
  return resolveDefaultInstallType(recommendation, [], []);
}

/** 입지 분석 개요 추천유형 등 — 각도 포함 */
export function formatInstallTypeDisplayLabel(installType: InstallTypeOption): string {
  switch (installType) {
    case "토지형":
      return "토지형 (15° 고정형)";
    case "지붕형":
      return "지붕형 (12° 고정형)";
    case "상계거래(가정용)":
      return "상계거래(가정용)";
    default:
      return installType;
  }
}

/** 가배치도·PDF·search-history 등 — 유형명만 */
export function formatInstallTypeShortLabel(installType: InstallTypeOption | string): string {
  if (INSTALL_TYPE_OPTIONS.includes(installType as InstallTypeOption)) {
    return installType;
  }
  return installType;
}

export function deriveSiteRecommendation(
  installType: InstallTypeOption,
  _buildingInfo: InfoField[],
): string {
  return formatInstallTypeDisplayLabel(installType);
}
