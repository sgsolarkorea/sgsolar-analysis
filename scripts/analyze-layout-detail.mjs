/**
 * 서산 기은리 698-6 배치 진단 — placedModuleCount vs Row/슬롯/활용률
 * Usage: node scripts/analyze-layout-detail.mjs [baseUrl]
 */
import { readFileSync } from "fs";
import { pathToFileURL } from "url";
import { createRequire } from "module";

const base = process.argv[2] ?? "https://analysis.sgsolar.co.kr";
const require = createRequire(import.meta.url);

// Dynamic import compiled modules via ts - use production API + local analysis
const SITE = {
  label: "충남 서산시 대산읍 기은리 698-6",
  pnu: "4421025025106980006",
  lat: 36.9342,
  lng: 126.4125,
  capacityKw: 378.88,
  moduleCount: 592,
  landAreaSqm: 3306,
  installType: "토지형",
};

async function fetchLayout(overlayOnly = false) {
  const p = new URLSearchParams({
    lat: String(SITE.lat),
    lng: String(SITE.lng),
    capacityKw: String(SITE.capacityKw),
    installType: SITE.installType,
    moduleCount: String(SITE.moduleCount),
    landAreaSqm: String(SITE.landAreaSqm),
    pnu: SITE.pnu,
  });
  if (overlayOnly) {
    p.set("overlayOnly", "1");
    p.set("polygonDebug", "1");
  }
  const res = await fetch(`${base}/api/module-layout?${p}`);
  return { status: res.status, data: await res.json() };
}

function polygonAreaSqm(ring) {
  if (ring.length < 3) return 0;
  const lat0 = ring.reduce((s, p) => s + p.lat, 0) / ring.length;
  const mPerDegLat = 110540;
  const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const local = ring.map((p) => ({
    x: (p.lng - ring[0].lng) * mPerDegLng,
    y: (p.lat - ring[0].lat) * mPerDegLat,
  }));
  let sum = 0;
  for (let i = 0; i < local.length; i++) {
    const j = (i + 1) % local.length;
    sum += local[i].x * local[j].y - local[j].x * local[i].y;
  }
  return Math.abs(sum) / 2;
}

function moduleFootprintAreaSqm(modules) {
  let total = 0;
  for (const mod of modules) {
    const lat0 = mod.corners[0].lat;
    const mPerDegLat = 110540;
    const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
    const local = mod.corners.map((p) => ({
      x: (p.lng - mod.corners[0].lng) * mPerDegLng,
      y: (p.lat - mod.corners[0].lat) * mPerDegLat,
    }));
    let sum = 0;
    for (let i = 0; i < local.length; i++) {
      const j = (i + 1) % local.length;
      sum += local[i].x * local[j].y - local[j].x * local[i].y;
    }
    total += Math.abs(sum) / 2;
  }
  return total;
}

function analyzeRows(modules) {
  if (!modules.length) return { rowCount: 0, rowSizes: [], avgPerRow: 0 };
  const lat0 = modules[0].corners[0].lat;
  const mPerDegLat = 110540;
  const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const centroids = modules.map((mod) => {
    const avgLat = mod.corners.reduce((s, c) => s + c.lat, 0) / 4;
    const avgLng = mod.corners.reduce((s, c) => s + c.lng, 0) / 4;
    return {
      x: (avgLng - modules[0].corners[0].lng) * mPerDegLng,
      y: (avgLat - modules[0].corners[0].lat) * mPerDegLat,
    };
  });
  const rowMap = new Map();
  for (const c of centroids) {
    const key = Math.round(c.y * 10);
    rowMap.set(key, (rowMap.get(key) ?? 0) + 1);
  }
  const rowSizes = [...rowMap.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n);
  return {
    rowCount: rowSizes.length,
    rowSizes,
    avgPerRow: rowSizes.length ? rowSizes.reduce((a, b) => a + b, 0) / rowSizes.length : 0,
    minPerRow: rowSizes.length ? Math.min(...rowSizes) : 0,
    maxPerRow: rowSizes.length ? Math.max(...rowSizes) : 0,
  };
}

function obbFromBoundary(boundary) {
  const lat0 = boundary[0].lat;
  const mPerDegLat = 110540;
  const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const local = boundary.map((p) => ({
    x: (p.lng - boundary[0].lng) * mPerDegLng,
    y: (p.lat - boundary[0].lat) * mPerDegLat,
  }));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of local) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY, obbAreaSqm: (maxX - minX) * (maxY - minY), local };
}

const { status, data } = await fetchLayout(false);
const boundary = data.boundary ?? [];
const modules = data.modules ?? [];
const usableAreaSqm = polygonAreaSqm(boundary);
const moduleAreaSqm = moduleFootprintAreaSqm(modules);
const rows = analyzeRows(modules);
const obb = obbFromBoundary(boundary);
const polyArea = data.diagnostics?.polygonAreaSqm ?? null;

console.log(
  JSON.stringify(
    {
      site: SITE.label,
      base,
      httpStatus: status,
      apiStats: data.stats,
      diagnostics: data.diagnostics,
      renderingAnalysis: {
        apiModulesArrayLength: modules.length,
        placedModuleCount: data.stats?.placedModuleCount,
        countsMatch: modules.length === data.stats?.placedModuleCount,
        svgWouldRenderCount: modules.length,
        renderingLimitInCode: "none — ModuleLayoutMap maps all layout.modules",
      },
      rowAnalysis: rows,
      areaAnalysis: {
        usableAreaSqm: Math.round(usableAreaSqm * 100) / 100,
        moduleFootprintTotalSqm: Math.round(moduleAreaSqm * 100) / 100,
        polygonUtilizationPct:
          usableAreaSqm > 0
            ? Math.round((moduleAreaSqm / usableAreaSqm) * 1000) / 10
            : null,
        obbAreaSqm: Math.round(obb.obbAreaSqm * 100) / 100,
        obbVsPolygonAreaRatio:
          usableAreaSqm > 0
            ? Math.round((obb.obbAreaSqm / usableAreaSqm) * 1000) / 10
            : null,
        sourcePolygonAreaSqm: polyArea,
        boundaryPointCount: boundary.length,
      },
      footprintMethod: {
        usesInnerRectangle: false,
        scanMethod:
          "collectValidSlots scans oriented bounding box (minX..maxX, minY..maxY) grid; each cell tested with moduleFitsInPolygon (4 corners in actual polygon)",
        virtualRectangleOnlyWhen:
          "resolveLayoutBoundary: createVirtualParcelRectangle only if no PNU and no cadastral ring",
        polygonSource: data.polygonSource ?? data.diagnostics?.polygonSource,
      },
      boundaryCoords: boundary,
    },
    null,
    2,
  ),
);
