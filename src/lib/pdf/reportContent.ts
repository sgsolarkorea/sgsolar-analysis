import type { ResolvedSiteReview } from "@/types/siteReview";
import type { LayerARegulatoryLevel } from "@/types/landInfo";
import type { SetbackJudgment } from "@/types/regulatoryReview";
import { GRADE_MESSAGES } from "@/types/siteReview";
import { formatInstallTypeDisplayLabel, type InstallTypeOption } from "@/data/resultUx";

export const PDF_REPORT_TITLE = "태양광 입지분석 사전 검토 보고서";

export const PDF_LEGAL_DISCLAIMER =
  "본 보고서는 공공데이터 및 입력 정보를 기반으로 작성된 사전 검토용 자료입니다. 최종 설치 가능 여부는 현장 확인, 구조 검토, 계통 확인, 지자체 인허가 검토를 통해 결정됩니다.";

export const PDF_SETBACK_FOOTER =
  "예상 거리는 공공데이터 기반의 1차 참고값입니다. 최종 이격거리 판단은 지자체 조례 및 현장 확인 후 결정됩니다.";

export const PDF_GRID_GUIDANCE = [
  "계통연계 가능 여부는 관할 한전 사업소의 접속 가능 용량 확인이 필요합니다.",
  "상담 전 설치 주소, 예상 설비용량, 설치 유형 정보를 준비하면 검토가 빠릅니다.",
  "관할 사업소 및 담당부서 정보는 다음 단계에서 자동 매칭 예정입니다.",
];

export const PDF_CONSULTATION_CHECKLIST = [
  "설치 주소 확인",
  "건축물대장 또는 토지대장 확인",
  "예상 설치 용량 확인",
  "전기 사용량 또는 발전사업 목적 확인",
  "현장 사진 준비",
  "한전 계통 접속 가능 여부 확인",
  "지자체 인허가 가능 여부 확인",
];

export const PDF_CTA =
  "보다 정확한 설치 가능 여부와 예상 수익성은 현장 확인 및 전문 상담을 통해 안내드립니다.";

export type PdfStatusTone = "blue" | "orange" | "amber" | "gray";

export function regulatoryLevelTone(level: LayerARegulatoryLevel): PdfStatusTone {
  if (level === "제한 가능성 높음") return "amber";
  if (level === "추가 검토 필요") return "orange";
  if (level === "기본 확인") return "blue";
  return "gray";
}

export function setbackJudgmentTone(judgment: SetbackJudgment): PdfStatusTone {
  if (judgment === "기본 확인" || judgment === "적합") return "blue";
  if (
    judgment === "거리 검토 필요" ||
    judgment === "추가 검토 필요" ||
    judgment === "조례 확인 필요" ||
    judgment === "검토 필요"
  ) {
    return "orange";
  }
  return "gray";
}

export function deriveOverallReviewStatus(data: ResolvedSiteReview): string {
  const regulatory = data.layerARegulatoryAnalysis?.rows ?? [];
  const setback = data.setbackReview?.rows ?? [];

  if (regulatory.some((row) => row.level === "제한 가능성 높음")) {
    return "제한 가능성 검토 필요";
  }
  if (
    regulatory.some((row) => row.level === "추가 검토 필요") ||
    setback.some((row) => row.judgment === "거리 검토 필요" || row.judgment === "추가 검토 필요")
  ) {
    return "추가 검토 필요";
  }
  if (setback.some((row) => row.judgment === "공공데이터 확인 필요" || row.judgment === "데이터 확인 필요")) {
    return "공공데이터 추가 확인 필요";
  }
  return GRADE_MESSAGES[data.grade]?.replace("입니다.", " 상태") ?? "기본 확인";
}

export function formatInstallTypeForPdf(installType: string): string {
  return formatInstallTypeDisplayLabel(installType as InstallTypeOption);
}

export function estimatePdfPageCount(data: ResolvedSiteReview, includeOrdinance: boolean): number {
  const regRows = data.layerARegulatoryAnalysis?.rows.length ?? 0;
  const setRows = data.setbackReview?.rows.length ?? 0;
  let pages = 6;
  if (regRows > 8) pages += 1;
  if (setRows > 5) pages += 1;
  if (includeOrdinance) pages += 1;
  return pages;
}
