export interface AnalysisLoadingStep {
  id: string;
  label: string;
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

/** 전체 로딩 UX 목표 시간 (ms) */
export const ANALYSIS_LOADING_DURATION_MS = 4200;
