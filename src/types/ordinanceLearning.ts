import type { MunicipalityOrdinanceData } from "@/types/regulatoryReview";

/** 관리자 화면 상태 라벨 */
export type OrdinanceRecordStatus =
  | "approved"
  | "ai_pending"
  | "generating"
  | "review"
  | "unregistered";

export type OrdinanceSourceType = "static" | "ai_draft" | "manual";

/** 사용자 화면 표시 상태 */
export type OrdinanceDisplayStatus =
  | "verified"
  | "ai_draft"
  | "preparing"
  | "default_template"
  | "urban_review_required"
  | "manual_review"
  | "candidate";

export interface OrdinanceVersion {
  version: number;
  data: MunicipalityOrdinanceData;
  createdAt: string;
  createdBy: "system" | "ai" | "admin";
  status: OrdinanceRecordStatus;
  changeNote?: string;
}

export interface OrdinanceRecord {
  slug: string;
  municipalityLabel: string;
  fullRegionName?: string;
  status: OrdinanceRecordStatus;
  sourceType: OrdinanceSourceType;
  searchCount: number;
  lastSearchedAt?: string;
  reviewedAt?: string;
  currentVersion: number;
  versions: OrdinanceVersion[];
  updatedAt: string;
  createdAt: string;
}

export interface OrdinanceLoadMeta {
  slug: string;
  municipalityLabel: string;
  status: OrdinanceRecordStatus;
  displayStatus: OrdinanceDisplayStatus;
  sourceType: OrdinanceSourceType;
  reviewedAt?: string;
  version?: number;
  isPreparing: boolean;
}

export interface OrdinanceLoadResult {
  data: MunicipalityOrdinanceData | null;
  meta: OrdinanceLoadMeta;
}

export interface MunicipalitySearchStat {
  municipalityLabel: string;
  slug: string;
  searchCount: number;
  lastSearchedAt?: string;
  ordinanceStatus: OrdinanceRecordStatus;
  isRegistered: boolean;
}

export interface SearchDashboardStats {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  totalCount: number;
  consultationCount: number;
  consultationConversionRate: number;
  popularRegions: MunicipalitySearchStat[];
  unregisteredTopRegions: MunicipalitySearchStat[];
}

export const ORDINANCE_STATUS_LABELS: Record<OrdinanceRecordStatus, string> = {
  approved: "승인완료",
  ai_pending: "AI생성대기",
  generating: "AI 생성 중",
  review: "검토중",
  unregistered: "미등록",
};

export const ORDINANCE_DISPLAY_LABELS: Record<OrdinanceDisplayStatus, string> = {
  verified: "검증 완료",
  ai_draft: "AI 초안",
  preparing: "상세 검토 필요",
  default_template: "기본 템플릿",
  urban_review_required: "수도권 도시지역 검토",
  manual_review: "조례 수동 검토",
  candidate: "조례 후보 요약",
};
