/**
 * Phase 3.1 — physical array + roof centered fill verification
 * Usage: node scripts/verify-land-double-block.mjs [baseUrl]
 */
const base = process.argv[2] ?? "http://localhost:3000";

const sites = [
  {
    name: "nonsan-18-4",
    label: "충남 논산시 부적면 충곡리 18-4",
    pnu: "4423035026100180004",
    lat: 36.1742,
    lng: 127.0892,
    capacityKw: 269.44,
    moduleCount: 421,
    installType: "토지형",
    expectPhysicalArray: true,
  },
  {
    name: "sacheon-733",
    label: "경남 사천시 축동면 사다리 733",
    address: "경남 사천시 축동면 사다리 733",
    capacityKw: 644.48,
    moduleCount: 1007,
    installType: "토지형",
    expectPhysicalArray: true,
  },
  {
    name: "seosan-698-6",
    label: "충남 서산시 대산읍 기은리 698-6",
    pnu: "4421025025106980006",
    lat: 36.9589,
    lng: 126.387,
    capacityKw: 378.88,
    moduleCount: 592,
    installType: "토지형",
    expectPhysicalArray: true,
  },
  {
    name: "jeonju-9-3",
    label: "전북특별자치도 전주시 완산구 척동9길 9-3",
    pnu: "4511310100101638016",
    lat: 35.8242,
    lng: 127.1083,
    capacityKw: 30.08,
    moduleCount: 47,
    buildingAreaSqm: 206.2,
    installType: "지붕형",
    expectPhysicalArray: false,
    expectRoofCentered: true,
  },
];

async function resolveFromResultPage(address) {
  const html = await (await fetch(`${base}/result?address=${encodeURIComponent(address)}`)).text();
  return {
    pnu: html.match(/"pnu":"(\d{19})"/)?.[1] ?? null,
    lat: Number(html.match(/"lat":([\d.]+)/)?.[1] ?? 0) || null,
    lng: Number(html.match(/"lng":([\d.]+)/)?.[1] ?? 0) || null,
  };
}

for (const site of sites) {
  let { pnu, lat, lng, capacityKw, moduleCount, installType, buildingAreaSqm } = site;

  if (!pnu || !lat) {
    const fromPage = await resolveFromResultPage(site.address ?? site.label);
    pnu = pnu ?? fromPage.pnu;
    lat = lat ?? fromPage.lat;
    lng = lng ?? fromPage.lng;
  }

  const params = new URLSearchParams({
    lat: String(lat ?? 0),
    lng: String(lng ?? 0),
    capacityKw: String(capacityKw ?? 0),
    installType,
    moduleCount: String(moduleCount ?? 0),
  });
  if (pnu) params.set("pnu", pnu);
  if (site.buildingAreaSqm) params.set("buildingAreaSqm", String(site.buildingAreaSqm));

  const res = await fetch(`${base}/api/module-layout?${params}`);
  const data = await res.json();
  const d = data.diagnostics ?? {};
  const isLand = installType === "토지형";

  const pass =
    res.ok &&
    d.placedModuleCount === site.moduleCount &&
    (isLand
      ? site.expectPhysicalArray
        ? d.fillStrategy === "physical-array" &&
          d.medianSplitUsed === false &&
          (d.arrayCount ?? 0) >= 2 &&
          d.aisleApplied === true
        : true
      : site.expectRoofCentered
        ? d.roofCenteringApplied === true &&
          d.sequentialFillRejectedReason === "bottom-left-sequential-fill-not-used"
        : true);

  console.log(
    JSON.stringify(
      {
        site: site.name,
        label: site.label,
        httpStatus: res.status,
        installType,
        capacityKw,
        placed: d.placedModuleCount,
        target: d.targetModuleCount,
        fillStrategy: d.fillStrategy ?? null,
        medianSplitUsed: d.medianSplitUsed ?? null,
        arrayCount: d.arrayCount ?? null,
        arrayModuleCounts: d.arrayModuleCounts ?? null,
        aisleM: d.aisleM ?? null,
        aisleApplied: d.aisleApplied ?? null,
        unusedAreaRatio: d.unusedAreaRatio ?? null,
        roofCenteringApplied: d.roofCenteringApplied ?? null,
        centerOffsetM: d.centerOffsetM ?? null,
        roofUnusedAreaRatio: d.roofUnusedAreaRatio ?? null,
        pass,
        error: data.error ?? null,
      },
      null,
      2,
    ),
  );
}
