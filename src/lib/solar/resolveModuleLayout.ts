import { fetchCadastralPolygonByPnu } from "@/lib/api/vworld";
import type { InstallTypeOption } from "@/data/resultUx";
import { computeModuleLayout } from "@/lib/solar/moduleLayout";
import { resolveLayoutBoundary } from "@/lib/solar/resolveLayoutBoundary";
import type { ModuleLayoutResult } from "@/types/moduleLayout";

export async function resolveModuleLayoutForSite(input: {
  pnu?: string | null;
  lat: number;
  lng: number;
  capacityKw: number;
  installType: string;
  moduleCount?: number;
  buildingAreaSqm?: number;
  landAreaSqm?: number;
}): Promise<ModuleLayoutResult> {
  const { boundary, polygonSource } = await resolveLayoutBoundary({
    pnu: input.pnu,
    lat: input.lat,
    lng: input.lng,
    capacityKw: input.capacityKw,
    installType: input.installType as InstallTypeOption,
    buildingAreaSqm: input.buildingAreaSqm,
    landAreaSqm: input.landAreaSqm,
  });

  return computeModuleLayout({
    boundary,
    polygonSource,
    capacityKw: input.capacityKw,
    installType: input.installType,
    moduleCount: input.moduleCount,
  });
}

/** @deprecated 내부에서 resolveLayoutBoundary 사용 */
export { fetchCadastralPolygonByPnu };
