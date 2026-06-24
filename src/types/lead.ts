import type { ConsultationAnalysisContext } from "@/types/consultation";

export type LeadType = "pdf_download" | "consultation" | "save_result";

export type LeadSource = "pdf_gate" | "consultation" | "result_save";

export type LeadStatus =
  | "new"
  | "contacted"
  | "quoted"
  | "contracted"
  | "hold"
  | "rejected";

export interface LeadRecord {
  id: string;
  createdAt: string;
  leadType: LeadType;
  status: LeadStatus;
  source: LeadSource;
  name?: string;
  phone: string;
  email?: string;
  address: string;
  installType?: string;
  estimatedCapacityKw?: number | null;
  resultUrl?: string;
  pdfUrl?: string;
  message?: string;
  searchHistoryId?: string;
  analysisContext?: ConsultationAnalysisContext;
  memo: string;
  nextAction: string;
  nextFollowUpAt: string | null;
  contactedAt: string | null;
  quotedAt: string | null;
  contractedAt: string | null;
  lostReason: string | null;
}

export interface LeadRequestBody {
  leadType: LeadType;
  name?: string;
  phone: string;
  email?: string;
  address: string;
  installType?: string;
  estimatedCapacityKw?: number | null;
  resultUrl?: string;
  pdfUrl?: string;
  message?: string;
  searchHistoryId?: string;
  analysisContext?: ConsultationAnalysisContext;
}

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  pdf_download: "PDF 다운로드",
  consultation: "상담 신청",
  save_result: "결과 저장",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "신규",
  contacted: "상담중",
  quoted: "견적",
  contracted: "계약완료",
  hold: "보류",
  rejected: "거절",
};

export type LeadScore = "HOT" | "WARM" | "COLD";

export const LEAD_SCORE_LABELS: Record<LeadScore, string> = {
  HOT: "HOT",
  WARM: "WARM",
  COLD: "COLD",
};

export function leadTypeToScore(leadType: LeadType): LeadScore {
  switch (leadType) {
    case "consultation":
      return "HOT";
    case "pdf_download":
      return "WARM";
    case "save_result":
      return "COLD";
  }
}

export function leadTypeToSource(leadType: LeadType): LeadSource {
  switch (leadType) {
    case "pdf_download":
      return "pdf_gate";
    case "consultation":
      return "consultation";
    case "save_result":
      return "result_save";
  }
}
