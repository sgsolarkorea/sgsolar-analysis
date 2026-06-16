export type SetbackJudgment = "적합" | "검토 필요" | "추가 확인" | "미측정";

export interface SetbackReviewRow {
  item: string;
  detail?: string;
  standard: string;
  measured: string;
  judgment: SetbackJudgment;
}

export interface SetbackReview {
  notice?: string;
  rows: SetbackReviewRow[];
}

export interface OrdinanceDistanceRule {
  label: string;
  distance: string;
}

export interface LocalOrdinanceReview {
  municipalityLabel: string;
  ordinanceTitle: string;
  appendixTitle?: string;
  appendixUrl?: string;
  distanceRules: OrdinanceDistanceRule[];
  relatedLaw: string;
  promulgatedDate?: string;
  enforcedDate?: string;
  ordinanceUrl?: string;
  statusNote?: string;
}
