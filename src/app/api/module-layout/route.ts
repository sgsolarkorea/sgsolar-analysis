import { NextResponse } from "next/server";
import { fetchCadastralPolygonByPnu } from "@/lib/api/vworld";
import type { InstallTypeOption } from "@/data/resultUx";
import { INSTALL_TYPE_OPTIONS } from "@/data/resultUx";
import {
  computeModuleLayout,
  createVirtualParcelRectangle,
} from "@/lib/solar/moduleLayout";
import type { LatLngPoint } from "@/types/moduleLayout";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pnu = searchParams.get("pnu")?.trim() ?? "";
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const capacityKw = Number(searchParams.get("capacityKw"));
  const installTypeRaw = searchParams.get("installType")?.trim() ?? "토지형";
  const moduleCountRaw = searchParams.get("moduleCount");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  if (!Number.isFinite(capacityKw) || capacityKw <= 0) {
    return NextResponse.json({ error: "capacityKw required" }, { status: 400 });
  }

  const installType = INSTALL_TYPE_OPTIONS.includes(installTypeRaw as InstallTypeOption)
    ? (installTypeRaw as InstallTypeOption)
    : "토지형";

  const moduleCount =
    moduleCountRaw != null && moduleCountRaw !== ""
      ? Number(moduleCountRaw)
      : undefined;

  const center: LatLngPoint = { lat, lng };
  let boundary: LatLngPoint[] = [];
  let polygonSource: "cadastral" | "virtual" = "virtual";

  if (pnu) {
    const cadastral = await fetchCadastralPolygonByPnu(pnu, lat, lng);
    if (cadastral?.ring?.length) {
      boundary = cadastral.ring;
      polygonSource = "cadastral";
    }
  }

  if (boundary.length < 3) {
    boundary = createVirtualParcelRectangle(center, capacityKw, installType);
    polygonSource = "virtual";
  }

  const layout = computeModuleLayout({
    boundary,
    polygonSource,
    capacityKw,
    installType,
    moduleCount: Number.isFinite(moduleCount) ? moduleCount : undefined,
  });

  return NextResponse.json(layout);
}
