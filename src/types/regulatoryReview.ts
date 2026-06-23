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
  | "기본 확인"
  | "추가 검토 필요"
  | "조례 확인 필요"
  | "데이터 확인 필요"
  /** @deprecated GIS MVP 이전 fallback */
  | "적합"
  | "검토 필요"
  | "추가 확인"
  | "조례 기준 확인 필요";

export interface SetbackReviewRow {
  item: string;
  detail?: string;
  standard: string;
  /** GIS 추정 거리 (m) */
  estimatedDistanceM?: number | null;
  measured: string;
  judgment: SetbackJudgment;
  remark?: string;
}

export interface SetbackReviewMeta {
  partial?: boolean;
  errors?: string[];
  collectedAt?: string;
  gisDistanceCount?: number;
}

export interface SetbackReview {
  notice?: string;
  rows: SetbackReviewRow[];
  meta?: SetbackReviewMeta;
}

/** @deprecated MunicipalityOrdinanceData 사용 */
export type LocalOrdinanceReview = MunicipalityOrdinanceData;
