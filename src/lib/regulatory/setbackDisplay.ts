import type { SetbackJudgment } from "@/types/regulatoryReview";

/** 사용자 화면용 예상 거리 표시 */
export function formatSetbackDistanceDisplay(distanceM: number | null | undefined): string {
  if (distanceM == null) return "확인 필요";
  if (distanceM < 1) return "인접";
  return `약 ${Math.round(distanceM)}m`;
}

export function resolveSetbackJudgment(
  standardM: number,
  distanceM: number | null,
): SetbackJudgment {
  if (distanceM == null) return "공공데이터 확인 필요";
  if (distanceM >= standardM) return "기본 확인";
  return "거리 검토 필요";
}

export function buildSetbackGuidance(input: {
  targetKey: string;
  standardM: number;
  distanceM: number | null;
  judgment: SetbackJudgment;
  regulationConfidence?: string;
}): string {
  if (input.judgment === "공공데이터 확인 필요") {
    return "해당 항목은 공공데이터에서 확인되지 않았습니다.";
  }

  if (input.distanceM != null && input.distanceM < 1) {
    return "인접 시설 여부 확인이 필요합니다.";
  }

  if (input.regulationConfidence === "needs_verification") {
    return "공통 참고 기준입니다. 지자체 조례·현장 조건 확인이 필요합니다.";
  }

  if (input.judgment === "거리 검토 필요") {
    return "현장 조건과 지자체 기준에 따라 추가 검토가 필요합니다.";
  }

  return "공공데이터 기준 참고 거리입니다. 지자체 조례 확인이 필요합니다.";
}

export const SETBACK_SECTION_NOTICE =
  "아래 거리는 공공데이터를 기준으로 산정한 참고 거리입니다. 실제 인허가 검토 시에는 설치 위치, 현장 조건, 지자체 조례를 함께 확인해야 합니다.";

export const SETBACK_SECTION_FOOTER =
  "예상 거리는 공공데이터 기반의 1차 참고값입니다. 최종 이격거리 판단은 지자체 조례 및 현장 확인 후 결정됩니다.";

/** 지자체 조례 DB 적용 전 공통 기준 안내 */
export const SETBACK_COMMON_STANDARD_NOTICE =
  "현재 기준거리는 지자체별 조례 DB 적용 전의 공통 참고 기준입니다. 실제 기준은 지자체 조례에 따라 달라질 수 있습니다.";

export const SETBACK_STANDARD_COLUMN_LABEL = "공통 참고 기준";
