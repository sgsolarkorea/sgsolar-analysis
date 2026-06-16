export interface ConsultationAnalysisContext {
  jibunAddress?: string;
  landCategory?: string;
  zoning?: string;
  landArea?: string;
  buildingArea?: string;
  installType?: string;
  capacity?: string;
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
  analysisContext?: ConsultationAnalysisContext;
  searchHistoryId?: string;
}
