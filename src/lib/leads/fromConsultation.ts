import type { ConsultationRequestBody, ConsultationSubmission } from "@/types/consultation";
import type { LeadRequestBody } from "@/types/lead";

function parseCapacityKw(analysisContext?: ConsultationRequestBody["analysisContext"]): number | null {
  const raw = analysisContext?.capacity;
  if (!raw) return null;
  const match = raw.replace(/,/g, "").match(/([\d.]+)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function consultationToLeadInput(
  submission: ConsultationSubmission,
  request: ConsultationRequestBody,
): LeadRequestBody {
  return {
    leadType: "consultation",
    name: submission.name,
    phone: submission.phone,
    email: submission.email,
    address: submission.address,
    installType: submission.installType,
    message: submission.message,
    resultUrl: submission.resultPageUrl,
    pdfUrl: request.pdfUrl,
    estimatedCapacityKw: parseCapacityKw(request.analysisContext),
    searchHistoryId: request.searchHistoryId,
    analysisContext: request.analysisContext,
  };
}
