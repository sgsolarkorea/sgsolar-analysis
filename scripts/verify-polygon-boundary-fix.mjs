/**
 * Polygon 정합성 회귀 검증 — boundary = setbackBoundary = applySetback(sourceBoundary)
 * Usage: node scripts/verify-polygon-boundary-fix.mjs [baseUrl]
 */
import { readFileSync } from "fs";

function loadEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* ignore */
  }
}

const base = process.argv[2] ?? "http://localhost:3000";

const sites = [
  {
    name: "seosan-698-6",
    label: "충남 서산시 대산읍 기은리 698-6",
    pnu: "4421025025106980006",
    lat: 36.9589,
    lng: 126.387,
    capacityKw: 378.88,
    moduleCount: 592,
    landAreaSqm: 3306,
  },
  {
    name: "nonsan-18-4",
    label: "충남 논산시 부적면 충곡리 18-4",
    pnu: "4423035026100180004",
    lat: 36.1742,
    lng: 127.0892,
    capacityKw: 269.44,
    moduleCount: 421,
    landAreaSqm: 2350,
  },
  {
    name: "jeonju-9-3",
    label: "전북특별자치도 전주시 완산구 척동9길 9-3",
    address: "전북특별자치도 전주시 완산구 척동9길 9-3",
    pnu: "4511310100101638016",
    lat: 35.8242,
    lng: 127.1083,
    capacityKw: 30.08,
    moduleCount: 47,
    buildingAreaSqm: 206.2,
    installType: "지붕형",
  },
];

function ringsMatch(a, b, tol = 1e-9) {
  if (!a?.length || !b?.length || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i].lat - b[i].lat) > tol || Math.abs(a[i].lng - b[i].lng) > tol) return false;
  }
  return true;
}

async function resolveFromResultPage(address) {
  const html = await (await fetch(`${base}/result?address=${encodeURIComponent(address)}`)).text();
  return {
    pnu: html.match(/"pnu":"(\d{19})"/)?.[1] ?? html.match(/451\d{16}|442\d{16}/)?.[0] ?? null,
    lat: Number(html.match(/"lat":([\d.]+)/)?.[1] ?? 0) || null,
    lng: Number(html.match(/"lng":([\d.]+)/)?.[1] ?? 0) || null,
    capacityKw: Number(html.match(/"capacityKw":([\d.]+)/)?.[1] ?? 0) || null,
    moduleCount: Number(html.match(/"moduleCount":(\d+)/)?.[1] ?? 0) || null,
    landAreaSqm: Number(html.match(/"landAreaSqm":([\d.]+)/)?.[1] ?? 0) || null,
    buildingAreaSqm: Number(html.match(/"buildingAreaSqm":([\d.]+)/)?.[1] ?? 0) || null,
  };
}

loadEnv();

for (const site of sites) {
  let { pnu, lat, lng, capacityKw, moduleCount, landAreaSqm } = site;
  const installType = site.installType ?? "토지형";
  let buildingAreaSqm = site.buildingAreaSqm ?? null;

  if (!pnu || !capacityKw) {
    const fromPage = await resolveFromResultPage(site.address ?? site.label);
    pnu = pnu ?? fromPage.pnu;
    lat = lat ?? fromPage.lat;
    lng = lng ?? fromPage.lng;
    capacityKw = capacityKw ?? fromPage.capacityKw;
    moduleCount = moduleCount ?? fromPage.moduleCount;
    landAreaSqm = landAreaSqm ?? fromPage.landAreaSqm;
    buildingAreaSqm = buildingAreaSqm ?? fromPage.buildingAreaSqm;
  }

  const params = new URLSearchParams({
    lat: String(lat ?? 0),
    lng: String(lng ?? 0),
    capacityKw: String(capacityKw ?? 0),
    installType,
    moduleCount: String(moduleCount ?? 0),
    overlayOnly: "1",
    polygonDebug: "compare",
  });
  if (pnu) params.set("pnu", pnu);
  if (landAreaSqm) params.set("landAreaSqm", String(landAreaSqm));
  if (buildingAreaSqm) params.set("buildingAreaSqm", String(buildingAreaSqm));

  const res = await fetch(`${base}/api/module-layout?${params}`);
  const data = await res.json();
  const diag = data.diagnostics ?? {};

  const boundaryMatchesSetback =
    diag.boundaryMatchesSetback ?? ringsMatch(data.boundary, data.setbackBoundary);
  const hasSource = Boolean(data.sourceBoundary?.length >= 3);
  const hasSetback = Boolean(data.setbackBoundary?.length >= 3);

  console.log(
    JSON.stringify(
      {
        site: site.name,
        label: site.label,
        httpStatus: res.status,
        pnu,
        hasSourceBoundary: hasSource,
        hasSetbackBoundary: hasSetback,
        boundaryMatchesSetback,
        polygonAreaSqm: diag.polygonAreaSqm,
        setbackAreaSqm: diag.setbackAreaSqm ?? diag.usableAreaSqm,
        usableAreaSqm: diag.usableAreaSqm,
        boundaryPointCount: data.boundary?.length,
        sourceFirst: data.sourceBoundary?.[0] ?? null,
        setbackFirst: data.setbackBoundary?.[0] ?? null,
        boundaryFirst: data.boundary?.[0] ?? null,
        overlayCompare: data.overlayCompare ?? null,
        error: data.error ?? null,
        pass: res.ok && hasSource && hasSetback && boundaryMatchesSetback,
      },
      null,
      2,
    ),
  );
}
