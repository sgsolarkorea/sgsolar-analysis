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
  | "거리 검토 필요"
  | "공공데이터 확인 필요"
  /** @deprecated 이전 Step 3 내부값 */
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
  debug?: Array<{ key: string; error: string; layerId?: string }>;
  collectedAt?: string;
  gisDistanceCount?: number;
}

export type SetbackRegulationConfidence =
  | "verified"
  | "ordinance_based"
  | "needs_verification"
  | "common_fallback";

/** Step 6.5 — 조례 DB 검수·확장 워크플로 상태 */
export type SetbackReviewStatus =
  | "not_started"
  | "source_found"
  | "parsing"
  | "parsed"
  | "verified"
  | "rejected";

export type RegulationSourceType =
  | "ordinance"
  | "guideline"
  | "permit_rule"
  | "solar_policy"
  | "notice"
  | "unknown";

export type RegulationSourceStatus =
  | "not_started"
  | "source_found"
  | "needs_verification"
  | "parsing"
  | "parsed"
  | "verified"
  | "rejected";

export interface RegulationSourceEntry {
  type: RegulationSourceType;
  name: string;
  appendix?: string;
  sourceUrl: string;
  status: RegulationSourceStatus;
  sourceOrigin?: "elis.go.kr" | "law.go.kr" | "municipal" | "unknown";
  notes?: string;
  collectedAt?: string;
}

/** Step 6.7 — parser output candidate (not yet merged into setback DB) */
export type ParserConfidence = "high" | "medium" | "low" | "none";

export interface ParsedDistanceSet {
  building: number | null;
  residential: number | null;
  road: number | null;
  river: number | null;
  school: number | null;
  cultural: number | null;
}

export type DistanceExtractionMethod =
  | "xml"
  | "hwp"
  | "pdf"
  | "manual_review"
  | "xml_manual_review";

export interface ManualReviewCandidate {
  category: string;
  label?: string;
  distanceM: number;
  sentence: string;
  reason: string;
  suspectDistanceReason?: string;
  matchConfidence?: ParserConfidence;
}

export interface ParsedOrdinanceCandidate {
  regionKey: string;
  municipalityLabel: string;
  sido?: string;
  sigungu?: string;
  ordinanceName: string;
  sourceUrl: string;
  sourceType: RegulationSourceType;
  sourceOrigin?: string;
  extractedDistances: ParsedDistanceSet;
  matchedText: string[];
  matchedSections?: Array<{ type: string; title: string; matchCount?: number }>;
  excludedSections?: Array<{
    type: string;
    title: string;
    reason?: string;
    matchCount?: number;
    distanceM?: number;
    sentence?: string;
  }>;
  manualReviewCandidates?: ManualReviewCandidate[];
  requiresManualReview?: boolean;
  reviewReason?: string;
  suspectDistanceReason?: string;
  urbanRegionNotice?: string;
  isUrbanMetro?: boolean;
  appendixRefs?: Array<{
    title: string;
    hwpUrl: string | null;
    hasInlineContent: boolean;
    number?: string;
    referencedByArticle?: string;
    referencedAppendixNumber?: string;
  }>;
  parserConfidence: ParserConfidence;
  parserConfidenceBefore?: ParserConfidence;
  distanceExtractionMethod?: DistanceExtractionMethod;
  appendixSourceUrl?: string | null;
  appendixFileType?: "hwp" | "pdf" | null;
  appendixParseSuccess?: boolean;
  appendixMatchedText?: string[];
  appendixParseAttempted?: boolean;
  appendixParseStats?: {
    textLength?: number;
    relevanceScore?: number;
    distanceCount?: number;
    error?: string | null;
  };
  parseStats?: { solarArticleCount: number; distanceCount: number; appendixCount: number };
  notes?: string;
  parsedAt?: string;
}

/** Step 6.9 — 수동 검토·승인 override (production parser 후보보다 우선) */
export type ManualOverrideReviewStatus = "manual_verified" | "manual_pending";

export interface ManualOverrideDistances {
  residential: number | null;
  building: number | null;
  road: number | null;
  river: number | null;
  school: number | null;
  cultural: number | null;
}

export interface ManualOverrideConditions {
  slope?: string;
  buffer?: string;
  roofException?: string;
  [key: string]: string | undefined;
}

export interface SetbackManualOverrideEntry {
  municipalityLabel: string;
  sido: string;
  sigungu: string;
  reviewStatus: ManualOverrideReviewStatus;
  confidence: SetbackRegulationConfidence;
  source: string;
  sourceUrl: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  articleTitle: string;
  articleNumber: string;
  appendixNumber: string;
  distances: ManualOverrideDistances;
  conditions?: ManualOverrideConditions;
  notes?: string;
}

export interface SetbackRegulationEntry {
  municipalityLabel: string;
  sido: string;
  sigungu: string;
  source: string;
  sourceUrl?: string;
  lastUpdated: string | null;
  verifiedAt?: string | null;
  reviewStatus?: SetbackReviewStatus;
  confidence: SetbackRegulationConfidence;
  distances: SetbackDistances;
  notes?: string;
}

export type SetbackDistanceKey = "residential" | "road" | "river" | "school" | "cultural";

export type SetbackDistances = Record<SetbackDistanceKey, number>;

export interface ResolvedSetbackRegulation {
  municipalityLabel: string;
  sido: string | null;
  sigungu: string | null;
  source: string;
  lastUpdated: string;
  confidence: SetbackRegulationConfidence;
  distances: SetbackDistances;
  isFallback: boolean;
  /** Step 6.9 — setback-manual-overrides.json 적용 여부 */
  isManualOverride?: boolean;
  manualReviewStatus?: ManualOverrideReviewStatus;
  sourceUrl?: string | null;
  manualOverrideNotes?: string;
}

export interface SetbackAppliedStandard {
  municipalityLabel: string;
  source: string;
  lastUpdated: string;
  confidence: SetbackRegulationConfidence;
  isFallback: boolean;
  notice: string;
  columnLabel: string;
}

export interface SetbackReview {
  notice?: string;
  rows: SetbackReviewRow[];
  meta?: SetbackReviewMeta;
  appliedStandard?: SetbackAppliedStandard;
}

/** Step 6.8 — runtime ordinance display (parsed_candidates 기반, production DB 미반영) */
export type OrdinanceDisplayStatus =
  | "urban_review_required"
  | "manual_review"
  | "manual_verified"
  | "manual_pending"
  | "candidate"
  | "preparing"
  | "verified";

export interface UrbanOrdinanceNotice {
  status: "urban_review_required";
  title: string;
  paragraphs: string[];
}

export interface OrdinanceDisplayPolicy {
  isUrbanMetro: boolean;
  hideSetbackDistances: boolean;
  hideOrdinanceDistances: boolean;
  /** 이격거리 GIS 표에 학교 행 포함 여부 (조례에 학교 근거 있을 때만) */
  includeSchoolSetback: boolean;
  displayStatus: OrdinanceDisplayStatus;
  urbanNotice?: UrbanOrdinanceNotice;
  reviewReason?: string;
  /** Step 6.9 — manual_verified 카드 하단 안내 문구 */
  manualOverrideNoticeLines?: readonly string[];
  manualReviewStatus?: ManualOverrideReviewStatus;
}

export interface OrdinanceDisplayCard {
  id: string;
  ordinanceName: string;
  articleTitle: string;
  appendixTitle?: string;
  summaryBullets: string[];
  sourceUrl: string;
  sourceOriginLabel: string;
  parserConfidence?: ParserConfidence;
  showDistances: boolean;
}

export interface OrdinanceDisplayResult {
  municipalityLabel: string;
  policy: OrdinanceDisplayPolicy;
  cards: OrdinanceDisplayCard[];
  hasParsedCandidate: boolean;
  hasManualOverride?: boolean;
  parsedAt?: string;
  manualVerifiedAt?: string | null;
}

/** @deprecated MunicipalityOrdinanceData 사용 */
export type LocalOrdinanceReview = MunicipalityOrdinanceData;
