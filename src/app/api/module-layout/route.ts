import { NextResponse } from "next/server";
import type { InstallTypeOption } from "@/data/resultUx";
import { INSTALL_TYPE_OPTIONS } from "@/data/resultUx";
import { computeModuleLayout } from "@/lib/solar/moduleLayout";
import { resolveLayoutBoundary } from "@/lib/solar/resolveLayoutBoundary";
import {
  computePolygonOrientation,
  polygonAreaSqm,
} from "@/lib/solar/polygonGeometry";
import type { ModuleLayoutDiagnostics } from "@/types/moduleLayout";

function parseOptionalNumber(value: string | null): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function buildDiagnostics(input: {
  polygonSource: ModuleLayoutDiagnostics["polygonSource"];
  boundary: { lat: number; lng: number }[];
  sourceBoundary: { lat: number; lng: number }[];
  targetModuleCount: number;
  placedModuleCount: number;
  layoutMode: ModuleLayoutDiagnostics["layoutMode"];
}): ModuleLayoutDiagnostics {
  const orientationRad = computePolygonOrientation(input.boundary);
  return {
    polygonSource: input.polygonSource,
    boundaryPointCount: input.boundary.length,
    polygonAreaSqm: Math.round(polygonAreaSqm(input.sourceBoundary) * 100) / 100,
    usableAreaSqm: Math.round(polygonAreaSqm(input.boundary) * 100) / 100,
    targetModuleCount: input.targetModuleCount,
    placedModuleCount: input.placedModuleCount,
    layoutMode: input.layoutMode,
    orientationDegrees: Math.round(((orientationRad * 180) / Math.PI) * 100) / 100,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pnu = searchParams.get("pnu")?.trim() ?? "";
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const capacityKw = Number(searchParams.get("capacityKw"));
  const installTypeRaw = searchParams.get("installType")?.trim() ?? "토지형";
  const moduleCountRaw = searchParams.get("moduleCount");
  const buildingAreaSqm = parseOptionalNumber(searchParams.get("buildingAreaSqm"));
  const landAreaSqm = parseOptionalNumber(searchParams.get("landAreaSqm"));
  const overlayOnly =
    searchParams.get("overlayOnly") === "1" || searchParams.get("polygonDebug") === "1";

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

  const { boundary, sourceBoundary, polygonSource } = await resolveLayoutBoundary({
    pnu: pnu || undefined,
    lat,
    lng,
    capacityKw,
    installType,
    buildingAreaSqm,
    landAreaSqm,
  });

  if (boundary.length < 3) {
    return NextResponse.json(
      {
        error:
          "필지·건물 경계를 불러오지 못했습니다. VWorld 폴리곤 조회를 확인해 주세요.",
      },
      { status: 503 },
    );
  }

  const layout = computeModuleLayout({
    boundary,
    polygonSource,
    capacityKw,
    installType,
    moduleCount: Number.isFinite(moduleCount) ? moduleCount : undefined,
    centerLat: lat,
    centerLng: lng,
  });

  const diagnostics = buildDiagnostics({
    polygonSource,
    boundary,
    sourceBoundary: sourceBoundary.length >= 3 ? sourceBoundary : boundary,
    targetModuleCount: layout.stats.targetModuleCount,
    placedModuleCount: layout.stats.placedModuleCount,
    layoutMode: layout.stats.layoutMode,
  });

  if (!overlayOnly && layout.stats.placedModuleCount <= 0) {
    return NextResponse.json(
      { error: "배치 가능한 모듈 영역을 찾지 못했습니다.", diagnostics },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ...layout,
    modules: overlayOnly ? [] : layout.modules,
    diagnostics,
    overlayOnly,
  });
}
