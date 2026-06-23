import type { ResolvedSiteReview } from "@/types/siteReview";
import type { LayerARegulatoryLevel } from "@/types/landInfo";
import type { SetbackJudgment } from "@/types/regulatoryReview";
import { GRADE_MESSAGES } from "@/types/siteReview";
import { formatInstallTypeDisplayLabel, type InstallTypeOption } from "@/data/resultUx";
import { formatRecWeightDisplay } from "@/lib/solar/formatRecWeight";
import { hasDetailedGridData } from "@/lib/grid/display";

export const PDF_REPORT_TITLE = "태양광 입지분석 사전 검토 보고서";

export const PDF_LEGAL_DISCLAIMER =
  "본 보고서는 공공데이터 및 입력 정보를 기반으로 작성된 사전 검토용 자료입니다. 최종 설치 가능 여부는 현장 확인, 구조 검토, 계통 확인, 지자체 인허가 검토를 통해 결정됩니다.";

export const PDF_SETBACK_FOOTER =
  "예상 거리는 공공데이터 기반의 1차 참고값입니다. 최종 이격거리 판단은 지자체 조례 및 현장 확인 후 결정됩니다.";

export const PDF_SETBACK_COMMON_NOTICE =
  "현재 기준거리는 지자체별 조례 DB 적용 전의 공통 참고 기준입니다. 실제 기준은 지자체 조례에 따라 달라질 수 있습니다.";

export const PDF_SETBACK_STANDARD_COLUMN = "공통 기준";

export const PDF_GRID_GUIDANCE = [
  "계통연계 가능 여부는 관할 한전 사업소의 접속 가능 용량 확인이 필요합니다.",
  "상담 전 설치 주소, 예상 설비용량, 설치 유형 정보를 준비하면 검토가 빠릅니다.",
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
  "SG SOLAR가 현장 조건, 계통 가능성, 인허가 리스크를 함께 검토해드립니다.";

export const PDF_CTA_BUTTON = "전문 상담 요청";

export const PDF_REPORT_SUBTITLE = "공공데이터 기반 태양광 입지·용량·계통 사전 검토";

export const PDF_PROCESS_STEPS = [
  { step: 1, title: "주소 검토", desc: "입지 주소 및 토지·건물 공공데이터 확인" },
  { step: 2, title: "현장 확인", desc: "실측 및 설치 조건·장애물 검토" },
  { step: 3, title: "계통·인허가 검토", desc: "한전 접속·지자체 인허가 가능성 검토" },
  { step: 4, title: "견적 및 상담", desc: "설비 규모·수익성·공사 견적 상담" },
] as const;

export const PDF_CASE_STUDY_PLACEHOLDERS = [
  {
    title: "토지형 태양광 시공 사례",
    region: "경남 · 300kW급",
    desc: "입지·계통·인허가 통합 검토 후 착공 진행",
  },
  {
    title: "건물형 태양광 시공 사례",
    region: "전남 · 100kW급",
    desc: "옥상 구조·계통 접속 동시 검토 후 설치",
  },
] as const;

export type PdfAssessmentTone = "positive" | "warn" | "neutral";

export interface PdfAssessmentItem {
  label: string;
  tone: PdfAssessmentTone;
}

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

export function formatRecWeightForPdf(data: ResolvedSiteReview): string {
  return data.profitability?.recWeight ?? formatRecWeightDisplay(data.solarMetrics.recWeight);
}

export function deriveAssessmentItems(data: ResolvedSiteReview): PdfAssessmentItem[] {
  const items: PdfAssessmentItem[] = [];
  const overall = deriveOverallReviewStatus(data);
  const regulatory = data.layerARegulatoryAnalysis?.rows ?? [];
  const grid = data.gridInfo;

  if (overall.includes("제한") || overall.includes("추가 검토")) {
    items.push({ label: "설치 검토 가능 (조건 확인 필요)", tone: "warn" });
  } else {
    items.push({ label: "설치 검토 가능", tone: "positive" });
  }

  if (regulatory.some((row) => row.level === "제한 가능성 높음" || row.level === "추가 검토 필요")) {
    items.push({ label: "조례·규제 추가 검토 필요", tone: "warn" });
  } else if (regulatory.length > 0) {
    items.push({ label: "규제 1차 확인", tone: "positive" });
  } else {
    items.push({ label: "규제 데이터 추가 확인", tone: "neutral" });
  }

  if (hasDetailedGridData(grid)) {
    if (grid.status === "high") items.push({ label: "계통 여유 충분", tone: "positive" });
    else if (grid.status === "review") items.push({ label: "계통 추가 확인 필요", tone: "warn" });
    else if (grid.status === "difficult") items.push({ label: "계통 접속 검토 필요", tone: "warn" });
    else items.push({ label: "계통 1차 확인", tone: "neutral" });
  } else {
    items.push({ label: "계통 확인 필요", tone: "neutral" });
  }

  return items;
}

export function deriveExecutiveSummary(data: ResolvedSiteReview): string {
  const installType = formatInstallTypeForPdf(data.solarMetrics.installType);
  return (
    `본 부지는 공공데이터 기준으로 약 ${data.capacity} 규모의 ${installType} 태양광 설치 검토가 가능한 후보지입니다. ` +
    "다만 지자체 조례, 이격거리, 계통 접속 가능 여부는 현장 확인 및 관할기관 확인이 필요합니다."
  );
}
