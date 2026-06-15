import type { ProgressStatusKind } from "@/components/result/AnalysisProgressPanel";

export interface ProgressStepConfig {
  id: string;
  label: string;
  statusLabel: string;
  statusKind: ProgressStatusKind;
  description: string;
}

export const ANALYSIS_PROGRESS_STEPS: ProgressStepConfig[] = [
  {
    id: "address-check",
    label: "주소 확인",
    statusLabel: "완료",
    statusKind: "complete",
    description: "카카오 주소검색 완료",
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
    id: "install-type",
    label: "설치유형",
    statusLabel: "검토완료",
    statusKind: "reviewed",
    description: "지붕형/토지형 가능성 분석",
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
    description: "한전 접수 전 확인 필요",
  },
  {
    id: "consultation",
    label: "상담 신청",
    statusLabel: "가능",
    statusKind: "available",
    description: "전문가 무료 상담 가능",
  },
];

export const INSTALL_TYPE_OPTIONS = [
  "지붕형",
  "토지형",
  "축사형",
  "공장형",
  "상가형",
  "아직 모름",
] as const;

export type InstallTypeOption = (typeof INSTALL_TYPE_OPTIONS)[number];

export const INSTALL_TYPE_UI_MESSAGES: Record<InstallTypeOption, string> = {
  지붕형: "건물 지붕·옥상 활용 설치 유형으로 1차 검토됩니다.",
  토지형: "유휴 토지·발전사업용 설치 유형으로 1차 검토됩니다.",
  축사형: "축사 지붕 활용 대형 설치 유형으로 1차 검토됩니다.",
  공장형: "공장·창고 지붕 자가소비·발전 병행 유형으로 1차 검토됩니다.",
  상가형: "상가·근린시설 지붕 소규모 설치 유형으로 1차 검토됩니다.",
  "아직 모름": "현장 조건 확인 후 적합한 설치 유형을 안내드립니다.",
};

export function inferDefaultInstallType(recommendation: string): InstallTypeOption {
  const text = recommendation.toLowerCase();
  if (text.includes("축사")) return "축사형";
  if (text.includes("토지")) return "토지형";
  if (text.includes("상가") || text.includes("근린")) return "상가형";
  if (text.includes("공장")) return "공장형";
  if (text.includes("옥상") || text.includes("지붕")) return "지붕형";
  return "아직 모름";
}
