/** 주소 registry 매칭 신뢰도 */
export type KepcoOfficeConfidence = "region_match" | "needs_verification" | "unknown";

export interface KepcoOfficeRegistryEntry {
  sido: string;
  sigungu: string;
  officeName: string;
  departmentHint: string;
  representativePhone: string;
  source: string;
  confidence: KepcoOfficeConfidence;
  /** 관할 분기가 불확실할 때 UI·PDF 보조 문구 */
  verificationNote?: string;
}

export interface ResolvedKepcoOffice {
  sido: string | null;
  sigungu: string | null;
  officeName: string;
  departmentHint: string;
  representativePhone: string;
  source: string;
  confidence: KepcoOfficeConfidence;
  statusLabel: string;
  /** registry 미매칭 시 안내 */
  inquiryGuide: string | null;
  verificationNote: string | null;
}
