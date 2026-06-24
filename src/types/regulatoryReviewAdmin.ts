import type {
  ManualOverrideConditions,
  ManualOverrideDistances,
  ManualOverrideReviewStatus,
  ManualReviewCandidate,
  ParsedDistanceSet,
  ParsedOrdinanceCandidate,
  ParserConfidence,
  RegulationSourceEntry,
  SetbackManualOverrideEntry,
  SetbackRegulationConfidence,
  SetbackRegulationEntry,
} from "@/types/regulatoryReview";

export type RegulatoryReviewAdminStatus =
  | "후보"
  | "수동 검토"
  | "수동 승인 완료"
  | "보류"
  | "제외";

export interface RegulatoryReviewAdminRow {
  regionKey: string;
  municipalityLabel: string;
  sido: string;
  sigungu: string;
  ordinanceName: string;
  articleTitle: string;
  reviewStatus: RegulatoryReviewAdminStatus;
  parserConfidence: ParserConfidence;
  distanceExtractionMethod: string;
  extractedDistances: ParsedDistanceSet;
  distanceSummary: string;
  sourceUrl: string;
  hasSourceUrl: boolean;
  requiresManualReview: boolean;
  notes: string;
  parsedAt: string | null;
  manualOverride: SetbackManualOverrideEntry | null;
  productionEntry: SetbackRegulationEntry | null;
  registrySources: RegulationSourceEntry[];
  candidate: ParsedOrdinanceCandidate;
  recommendedSummary: string[];
}

export interface RegulatoryReviewAdminMeta {
  candidateCount: number;
  manualOverrideCount: number;
  productionCount: number;
  registryCount: number;
  parsedCandidatesVersion: string;
  manualOverridesVersion: string;
  setbackRegulationsVersion: string;
  registryVersion: string;
}

export interface RegulatoryReviewAdminPayload {
  meta: RegulatoryReviewAdminMeta;
  rows: RegulatoryReviewAdminRow[];
}

export interface ManualOverridePreviewInput {
  regionKey: string;
  municipalityLabel: string;
  sido: string;
  sigungu: string;
  reviewStatus: ManualOverrideReviewStatus;
  confidence: SetbackRegulationConfidence;
  source: string;
  sourceUrl: string;
  articleTitle: string;
  articleNumber?: string;
  appendixNumber?: string;
  distances: ManualOverrideDistances;
  conditions?: ManualOverrideConditions;
  notes?: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
}

export type { ManualReviewCandidate, ParsedOrdinanceCandidate };
