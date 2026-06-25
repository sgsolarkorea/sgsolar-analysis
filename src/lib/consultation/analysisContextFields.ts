import type { ConsultationAnalysisContext } from "@/types/consultation";

/** 상담·리드 analysisContext 공통 필드 파싱 */
export function parseConsultationAnalysisContext(raw: unknown): ConsultationAnalysisContext | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const ctx = raw as Record<string, unknown>;
  const num = (key: string) => {
    const value = ctx[key];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  };
  return {
    ...(typeof ctx.jibunAddress === "string" ? { jibunAddress: ctx.jibunAddress.slice(0, 200) } : {}),
    ...(typeof ctx.landCategory === "string" ? { landCategory: ctx.landCategory.slice(0, 50) } : {}),
    ...(typeof ctx.zoning === "string" ? { zoning: ctx.zoning.slice(0, 100) } : {}),
    ...(typeof ctx.landArea === "string" ? { landArea: ctx.landArea.slice(0, 50) } : {}),
    ...(typeof ctx.buildingArea === "string" ? { buildingArea: ctx.buildingArea.slice(0, 50) } : {}),
    ...(typeof ctx.installType === "string" ? { installType: ctx.installType.slice(0, 50) } : {}),
    ...(typeof ctx.capacity === "string" ? { capacity: ctx.capacity.slice(0, 50) } : {}),
    ...(num("capacityKw") != null ? { capacityKw: num("capacityKw") } : {}),
    ...(num("moduleCount") != null ? { moduleCount: num("moduleCount") } : {}),
    ...(num("areaPerKw") != null ? { areaPerKw: num("areaPerKw") } : {}),
    ...(num("roofUsableAreaSqm") != null ? { roofUsableAreaSqm: num("roofUsableAreaSqm") } : {}),
    ...(num("landUsableAreaSqm") != null ? { landUsableAreaSqm: num("landUsableAreaSqm") } : {}),
    ...(typeof ctx.layoutMode === "string" ? { layoutMode: ctx.layoutMode.slice(0, 50) } : {}),
    ...(typeof ctx.annualGeneration === "string" ? { annualGeneration: ctx.annualGeneration.slice(0, 50) } : {}),
    ...(typeof ctx.annualRevenue === "string" ? { annualRevenue: ctx.annualRevenue.slice(0, 50) } : {}),
    ...(typeof ctx.parcelCount === "number" ? { parcelCount: ctx.parcelCount } : {}),
    ...(typeof ctx.totalLandArea === "string" ? { totalLandArea: ctx.totalLandArea.slice(0, 50) } : {}),
    ...(Array.isArray(ctx.parcels)
      ? {
          parcels: ctx.parcels
            .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
            .slice(0, 20)
            .map((item) => ({
              jibunAddress: String(item.jibunAddress ?? "").slice(0, 200),
              areaLabel: String(item.areaLabel ?? "").slice(0, 50),
              landCategory: String(item.landCategory ?? "").slice(0, 50),
            })),
        }
      : {}),
  };
}
