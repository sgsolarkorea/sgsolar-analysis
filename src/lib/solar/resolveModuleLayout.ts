import { fetchCadastralPolygonByPnu } from "@/lib/api/vworld";
import type { InstallTypeOption } from "@/data/resultUx";
import {
  computeModuleLayout,
  createVirtualParcelRectangle,
} from "@/lib/solar/moduleLayout";
import type { LatLngPoint, ModuleLayoutResult } from "@/types/moduleLayout";

export async function resolveModuleLayoutForSite(input: {
  pnu?: string | null;
  lat: number;
  lng: number;
  capacityKw: number;
  installType: string;
  moduleCount?: number;
}): Promise<ModuleLayoutResult> {
  const center: LatLngPoint = { lat: input.lat, lng: input.lng };
  let boundary: LatLngPoint[] = [];
  let polygonSource: "cadastral" | "virtual" = "virtual";

  if (input.pnu) {
    const cadastral = await fetchCadastralPolygonByPnu(input.pnu, input.lat, input.lng);
    if (cadastral?.ring?.length) {
      boundary = cadastral.ring;
      polygonSource = "cadastral";
    }
  }

  if (boundary.length < 3) {
    boundary = createVirtualParcelRectangle(
      center,
      input.capacityKw,
      input.installType as InstallTypeOption,
    );
    polygonSource = "virtual";
  }

  return computeModuleLayout({
    boundary,
    polygonSource,
    capacityKw: input.capacityKw,
    installType: input.installType,
    moduleCount: input.moduleCount,
  });
}
