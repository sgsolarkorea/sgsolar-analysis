import { getFieldValue } from "@/lib/solar/calculate";
import type { ConsultationAnalysisContext } from "@/types/consultation";
import type { ResolvedSiteReview } from "@/types/siteReview";

export function buildConsultationContext(data: ResolvedSiteReview): ConsultationAnalysisContext {
  return {
    jibunAddress: data.jibunAddress,
    landCategory: getFieldValue(data.landInfo, "지목"),
    zoning: getFieldValue(data.landInfo, "용도지역"),
    buildingArea: getFieldValue(data.buildingInfo, "건축면적"),
    installType: data.solarMetrics.installType,
    capacity: data.capacity,
    annualGeneration: data.annualGeneration,
    annualRevenue: data.annualRevenue,
  };
}
