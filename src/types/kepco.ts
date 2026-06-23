/** registry 항목이 적용되는 행정 단위 */
export type KepcoOfficeMatchLevel = "sido" | "sigungu" | "gu" | "eupmyeon" | "dong" | "unknown";

/** 주소 registry 매칭 신뢰도 */
export type KepcoOfficeConfidence =
  | "verified"
  | "official_area"
  | "region_match"
  | "needs_verification"
  | "unknown";

export type KepcoOfficeRegistryOrigin = "manual" | "auto";

/** 지사 대표번호 출처 신뢰도 */
export type KepcoOfficePhoneStatus = "verified" | "official_page" | "needs_verification" | "unknown";

export interface KepcoOfficePhoneEntry {
  officeName: string;
  /** 고객지원/전기사용신청 등 공식 안내 연락처. 없으면 null */
  officePhone: string | null;
  officeAddress?: string;
  departmentName?: string;
  taskName?: string;
  fallbackPhone: string;
  phoneStatus: KepcoOfficePhoneStatus;
  source: string;
  lastCheckedAt: string;
}

export interface KepcoOfficeRegistryEntry {
  sido: string;
  sigungu: string;
  gu?: string;
  eupmyeon?: string;
  dong?: string;
  ri?: string;
  officeName: string;
  departmentHint: string;
  source: string;
  matchLevel: KepcoOfficeMatchLevel;
  confidence: KepcoOfficeConfidence;
  registryOrigin?: KepcoOfficeRegistryOrigin;
  verificationNote?: string;
}

export interface ParsedKepcoAddress {
  sido: string | null;
  sigungu: string | null;
  gu: string | null;
  eupmyeon: string | null;
  dong: string | null;
  ri: string | null;
  roadOrDong: string | null;
  raw: string;
}

export interface ResolvedKepcoOffice {
  parsedAddress: ParsedKepcoAddress;
  officeName: string;
  departmentHint: string;
  source: string;
  matchLevel: KepcoOfficeMatchLevel;
  confidence: KepcoOfficeConfidence;
  statusLabel: string;
  matchBasisLabel: string;
  /** 파싱·매칭 debug/meta 요약 */
  parsedMeta: string;
  inquiryGuide: string | null;
  verificationNote: string | null;
  officePhone: string | null;
  officePhoneDisplay: string;
  fallbackPhone: string;
  phoneStatus: KepcoOfficePhoneStatus;
  phoneSource: string;
  phoneSourceDetail: string | null;
  phoneLastCheckedAt: string | null;
}
