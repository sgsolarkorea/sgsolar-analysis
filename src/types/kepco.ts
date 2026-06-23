/** registry 항목이 적용되는 행정 단위 */
export type KepcoOfficeMatchLevel = "sido" | "sigungu" | "gu" | "eupmyeon" | "dong" | "unknown";

/** 주소 registry 매칭 신뢰도 */
export type KepcoOfficeConfidence = "verified" | "region_match" | "needs_verification" | "unknown";

export interface KepcoOfficeRegistryEntry {
  sido: string;
  sigungu: string;
  gu?: string;
  eupmyeon?: string;
  dong?: string;
  ri?: string;
  officeName: string;
  departmentHint: string;
  representativePhone: string;
  source: string;
  matchLevel: KepcoOfficeMatchLevel;
  confidence: KepcoOfficeConfidence;
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
  representativePhone: string;
  source: string;
  matchLevel: KepcoOfficeMatchLevel;
  confidence: KepcoOfficeConfidence;
  statusLabel: string;
  matchBasisLabel: string;
  /** 파싱·매칭 debug/meta 요약 */
  parsedMeta: string;
  inquiryGuide: string | null;
  verificationNote: string | null;
}
