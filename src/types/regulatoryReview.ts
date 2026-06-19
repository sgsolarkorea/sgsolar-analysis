export interface OrdinanceArticleItem {
  label: string;
  distance?: string;
  summary: string;
}

export interface OrdinanceArticle {
  id: string;
  title: string;
  summary?: string;
  items: OrdinanceArticleItem[];
  originalText?: string;
}

export interface OrdinanceDistanceRule {
  label: string;
  distance: string;
}

export interface MunicipalityOrdinanceData {
  slug: string;
  municipalityLabel: string;
  ordinanceTitle: string;
  appendixTitle?: string;
  appendixUrl?: string;
  relatedLaw: string;
  promulgatedDate?: string;
  enforcedDate?: string;
  ordinanceUrl?: string;
  statusNote?: string;
  distanceRules: OrdinanceDistanceRule[];
  articles: OrdinanceArticle[];
}

export type SetbackJudgment =
  | "적합"
  | "검토 필요"
  | "추가 확인"
  | "조례 기준 확인 필요";

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

/** @deprecated MunicipalityOrdinanceData 사용 */
export type LocalOrdinanceReview = MunicipalityOrdinanceData;
