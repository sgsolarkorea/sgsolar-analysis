export type AnalysisStepStatus = "completed" | "active" | "pending" | "failed" | "skipped";

export interface AnalysisLoadingStep {
  id: string;
  label: string;
}

export interface LoadingStepState extends AnalysisLoadingStep {
  status: AnalysisStepStatus;
}

export const ANALYSIS_LOADING_STEPS: AnalysisLoadingStep[] = [
  { id: "address", label: "주소 확인" },
  { id: "location", label: "위치 정보 확인" },
  { id: "land", label: "토지 정보 조회" },
  { id: "building", label: "건축물 정보 조회" },
  { id: "capacity", label: "설치용량 산정" },
  { id: "generation", label: "발전량 추정" },
  { id: "revenue", label: "수익성 분석" },
  { id: "result", label: "결과 생성" },
];

/** Single source of truth: completed steps / total steps */
export function computeLoadingProgress(steps: LoadingStepState[]): number {
  const total = steps.length;
  if (total === 0) return 0;

  const completed = steps.filter((step) => step.status === "completed").length;
  const active = steps.find((step) => step.status === "active");

  if (!active) {
    return Math.round((completed / total) * 100);
  }

  const base = completed / total;
  const withActive = base + 0.5 / total;
  return Math.min(100, Math.round(withActive * 100));
}
