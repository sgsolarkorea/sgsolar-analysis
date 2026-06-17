const sites = [
  {
    name: "nonsan-land",
    label: "충남 논산시 부적면 충곡리 18-4",
    address: "충남 논산시 부적면 충곡리 18-4",
    installType: "토지형",
  },
  {
    name: "jeonju-roof",
    label: "전북특별자치도 전주시 완산구 척동9길 9-3",
    address: "전북특별자치도 전주시 완산구 척동9길 9-3",
    installType: "지붕형",
  },
];

const base = process.argv[2] ?? "https://analysis.sgsolar.co.kr";

for (const site of sites) {
  const analyzeUrl = `${base}/api/analyze?address=${encodeURIComponent(site.address)}`;
  const analyzeRes = await fetch(analyzeUrl);
  const analyze = await analyzeRes.json();
  const parcel = analyze?.result?.primaryParcel ?? analyze?.primaryParcel;
  const metrics = analyze?.result?.metrics ?? analyze?.metrics;

  if (!parcel?.lat || !metrics?.capacityKw) {
    console.log(JSON.stringify({ site: site.name, error: "analyze failed", status: analyzeRes.status }, null, 2));
    continue;
  }

  const params = new URLSearchParams({
    lat: String(parcel.lat),
    lng: String(parcel.lng),
    capacityKw: String(metrics.capacityKw),
    installType: site.installType,
    moduleCount: String(metrics.moduleCount ?? 0),
  });
  if (parcel.pnu) params.set("pnu", parcel.pnu);

  const layoutRes = await fetch(`${base}/api/module-layout?${params}`);
  const layout = await layoutRes.json();

  console.log(
    JSON.stringify(
      {
        site: site.name,
        label: site.label,
        analyzeOk: analyzeRes.ok,
        layoutStatus: layoutRes.status,
        polygonSource: layout.polygonSource ?? null,
        polygonVertexCount: layout.boundary?.length ?? 0,
        placedModuleCount: layout.stats?.placedModuleCount ?? 0,
        targetModuleCount: layout.stats?.targetModuleCount ?? 0,
        layoutMode: layout.stats?.layoutMode ?? null,
        pnu: parcel.pnu ?? null,
        error: layout.error ?? null,
      },
      null,
      2,
    ),
  );
}
