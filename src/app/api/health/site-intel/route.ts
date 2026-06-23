import { NextResponse } from "next/server";
import { searchAddressByKakao } from "@/lib/api/kakao";
import { getLandInfoByVworld } from "@/lib/api/vworld";
import { resolveSiteIntel, summarizeSiteIntel } from "@/lib/gis/siteIntel";
import { buildRegionDistrictFromGis } from "@/lib/regulatory/buildRegionDistrictFromGis";
import { buildLayerARegulatoryAnalysis } from "@/lib/regulatory/buildLayerARegulatory";
import { buildSetbackFromGis } from "@/lib/regulatory/buildSetbackFromGis";

const GOLDEN_ADDRESSES = [
  "충남 논산시 부적면 충곡리 18-4",
  "충남 서산시 대산읍 기은리 698-6",
  "경기도 평택시 청북읍 토진리 314-14",
] as const;

async function resolveAddressForSiteIntel(address: string) {
  const geo = await searchAddressByKakao(address);
  const land = await getLandInfoByVworld(geo.lat, geo.lng);
  const pnu = land.pnu;
  if (!pnu) {
    throw new Error(`PNU not resolved for address: ${address}`);
  }
  return { pnu, lat: geo.lat, lng: geo.lng };
}

/** GIS Step 1 진단 — SiteIntelBundle (ParcelContext + getLandUseAttr) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const skipCache = searchParams.get("skipCache") === "1";

  if (mode === "golden" || mode === "step2" || mode === "step3") {
    const results = [];
    for (const address of GOLDEN_ADDRESSES) {
      try {
        const { pnu, lat, lng } = await resolveAddressForSiteIntel(address);
        const bundle = await resolveSiteIntel({
          pnu,
          lat,
          lng,
          skipCache,
        });
        const regionDistrict = bundle
          ? buildRegionDistrictFromGis(bundle.landUseAttributes, bundle.meta.collectedAt)
          : null;
        const regulatory = bundle
          ? buildLayerARegulatoryAnalysis(bundle.landUseAttributes, bundle.meta.collectedAt)
          : null;
        const setback = bundle?.parcel
          ? await buildSetbackFromGis(bundle.parcel, { address })
          : null;

        results.push({
          address,
          ok: Boolean(bundle),
          summary: bundle ? summarizeSiteIntel(bundle) : { errors: ["resolveSiteIntel returned null"] },
          regionDistrictRows: regionDistrict?.rows.map((r) => ({
            district: r.district,
            feasibility: r.feasibility,
          })),
          regulatoryRows: regulatory?.rows.map((r) => ({
            item: r.item,
            matchedZone: r.matchedZone,
            level: r.level,
          })),
          setbackRows: setback?.rows.map((r) => ({
            item: r.item,
            standard: r.standard,
            measured: r.measured,
            judgment: r.judgment,
            remark: r.remark,
          })),
          setbackMeta: setback?.meta,
          setbackLayerErrors: setback?.layerErrors,
        });
      } catch (error) {
        results.push({
          address,
          ok: false,
          summary: { errors: [error instanceof Error ? error.message : String(error)] },
        });
      }
    }
    return NextResponse.json({ mode, skipCache, results });
  }

  const address = searchParams.get("address")?.trim();
  if (!address) {
    return NextResponse.json(
      { error: "address query required, or use mode=golden" },
      { status: 400 },
    );
  }

  try {
    const { pnu, lat, lng } = await resolveAddressForSiteIntel(address);
    const bundle = await resolveSiteIntel({
      pnu,
      lat,
      lng,
      skipCache,
    });

    if (!bundle) {
      return NextResponse.json(
        { address, pnu, ok: false, errors: ["resolveSiteIntel returned null"] },
        { status: 502 },
      );
    }

    return NextResponse.json({
      address,
      ok: true,
      summary: summarizeSiteIntel(bundle),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
