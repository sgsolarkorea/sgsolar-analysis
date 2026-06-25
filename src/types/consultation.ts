export interface ConsultationAnalysisContext {
  jibunAddress?: string;
  landCategory?: string;
  zoning?: string;
  landArea?: string;
  buildingArea?: string;
  installType?: string;
  capacity?: string;
  /** 화면 대표 용량(kW) — capacity 문자열과 동일 값 */
  capacityKw?: number;
  moduleCount?: number;
  areaPerKw?: number;
  roofUsableAreaSqm?: number | null;
  landUsableAreaSqm?: number | null;
  layoutMode?: string;
  annualGeneration?: string;
  annualRevenue?: string;
  /** 다중 필지 검토 */
  parcelCount?: number;
  totalLandArea?: string;
  parcels?: Array<{
    jibunAddress: string;
    areaLabel: string;
    landCategory: string;
  }>;
}

export interface ConsultationSubmission {
  id: string;
  /** ISO 8601 (KST 표시는 클라이언트/뷰어에서 변환) */
  submittedAt: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  installType: string;
  message: string;
  resultPageUrl?: string;
  analysisContext?: ConsultationAnalysisContext;
}

export interface ConsultationRequestBody {
  name: string;
  phone: string;
  email?: string;
  address: string;
  installType: string;
  message?: string;
  resultPageUrl?: string;
  pdfUrl?: string;
  analysisContext?: ConsultationAnalysisContext;
  searchHistoryId?: string;
}
