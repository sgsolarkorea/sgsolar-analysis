/** Production Polygon 인식 검증 — 배치 알고리즘 변경 없이 API boundary 분석 */

const sites = [
  {
    name: "nonsan",
    label: "충남 논산시 부적면 충곡리 18-4",
    address: encodeURIComponent("충남 논산시 부적면 충곡리 18-4"),
    pnu: "4423035026100180004",
    capacityKw: 269.44,
    moduleCount: 421,
    installType: encodeURIComponent("토지형"),
    landAreaSqm: 2350,
  },
  {
    name: "seosan",
    label: "충남 서산시 대산읍 기은리 698-6",
    address: encodeURIComponent("충남 서산시 대산읍 기은리 698-6"),
    pnu: null,
    capacityKw: null,
    moduleCount: null,
    installType: encodeURIComponent("토지형"),
    landAreaSqm: null,
  },
];

const base = process.argv[2] ?? "https://analysis.sgsolar.co.kr";

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

async function resolveFromPage(addressEnc) {
  const html = await (await fetch(`${base}/result?address=${addressEnc}`)).text();
  const pnu = html.match(/442\d{16}|441\d{16}|302\d{16}/)?.[0] ?? null;
  const capacityKw = Number(html.match(/"capacityKw"\s*:\s*([\d.]+)/)?.[1] ?? 0) || null;
  const moduleCount = Number(html.match(/"moduleCount"\s*:\s*(\d+)/)?.[1] ?? 0) || null;
  const landArea = Number(html.match(/"landAreaSqm"\s*:\s*([\d.]+)/)?.[1] ?? 0) || null;
  const lat = Number(html.match(/"lat"\s*:\s*([\d.]+)/)?.[1] ?? 0) || null;
  const lng = Number(html.match(/"lng"\s*:\s*([\d.]+)/)?.[1] ?? 0) || null;
  return { pnu, capacityKw, moduleCount, landAreaSqm: landArea, lat, lng };
}

for (const site of sites) {
  let { pnu, capacityKw, moduleCount, landAreaSqm, lat, lng } = site;
  if (!pnu || !capacityKw) {
    const fromPage = await resolveFromPage(site.address);
    pnu = pnu ?? fromPage.pnu;
    capacityKw = capacityKw ?? fromPage.capacityKw;
    moduleCount = moduleCount ?? fromPage.moduleCount;
    landAreaSqm = landAreaSqm ?? fromPage.landAreaSqm;
    lat = lat ?? fromPage.lat;
    lng = lng ?? fromPage.lng;
  }

  const params = new URLSearchParams({
    lat: String(lat ?? 0),
    lng: String(lng ?? 0),
    capacityKw: String(capacityKw ?? 0),
    installType: decodeURIComponent(site.installType),
    moduleCount: String(moduleCount ?? 0),
    overlayOnly: "1",
    polygonDebug: "1",
  });
  if (pnu) params.set("pnu", pnu);
  if (landAreaSqm) params.set("landAreaSqm", String(landAreaSqm));

  const res = await fetch(`${base}/api/module-layout?${params}`);
  const data = await res.json();

  const boundary = data.boundary ?? [];
  const usableAreaSqm = polygonAreaSqm(boundary);
  const diag = data.diagnostics ?? null;

  console.log(
    JSON.stringify(
      {
        site: site.name,
        label: site.label,
        httpStatus: res.status,
        pnu,
        landAreaSqmFromPage: landAreaSqm,
        polygonSource: diag?.polygonSource ?? data.polygonSource ?? null,
        boundaryPointCount: diag?.boundaryPointCount ?? boundary.length,
        polygonAreaSqm: diag?.polygonAreaSqm ?? null,
        usableAreaSqm: diag?.usableAreaSqm ?? Math.round(usableAreaSqm * 100) / 100,
        usableVsLandPct:
          landAreaSqm && usableAreaSqm
            ? Math.round((usableAreaSqm / landAreaSqm) * 1000) / 10
            : null,
        targetModuleCount: diag?.targetModuleCount ?? data.stats?.targetModuleCount ?? null,
        placedModuleCount: diag?.placedModuleCount ?? data.stats?.placedModuleCount ?? null,
        layoutMode: diag?.layoutMode ?? data.stats?.layoutMode ?? null,
        orientationDegrees: diag?.orientationDegrees ?? null,
        moduleCountReturned: data.modules?.length ?? 0,
        boundarySample: boundary.slice(0, 2),
        error: data.error ?? null,
      },
      null,
      2,
    ),
  );
}
