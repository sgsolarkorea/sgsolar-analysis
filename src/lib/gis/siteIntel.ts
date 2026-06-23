import { getSiteIntelCache, setSiteIntelCache } from "@/lib/gis/cache";
import { fetchLandUseAttrByPnu } from "@/lib/gis/landUseAttr";
import { resolveParcelContext } from "@/lib/gis/parcelContext";
import type { VworldFetchCounter } from "@/lib/gis/vworldClient";
import type { ResolveSiteIntelInput, SiteIntelBundle } from "@/types/siteIntel";

export async function resolveSiteIntel(input: ResolveSiteIntelInput): Promise<SiteIntelBundle | null> {
  const { pnu, lat, lng, skipCache = false } = input;

  if (!skipCache) {
    const cached = await getSiteIntelCache(pnu);
    if (cached) {
      return {
        ...cached,
        meta: { ...cached.meta, cacheHit: true },
      };
    }
  }

  const counter: VworldFetchCounter = { count: 0 };
  const errors: string[] = [];

  const parcel = await resolveParcelContext({ pnu, lat, lng });
  if (!parcel) {
    errors.push("cadastral polygon not found");
    return null;
  }

  const landUseResult = await fetchLandUseAttrByPnu(pnu, counter);
  errors.push(...landUseResult.errors);

  const bundle: SiteIntelBundle = {
    pnu: parcel.pnu,
    parcel,
    landUseAttributes: landUseResult.items,
    regionDistrictHits: [],
    regulatoryHits: [],
    meta: {
      collectedAt: new Date().toISOString(),
      dataSource: "vworld-gis",
      partial: landUseResult.errors.length > 0 || landUseResult.items.length === 0,
      cacheHit: false,
      apiCallCount: counter.count,
      errors,
    },
  };

  if (!skipCache) {
    await setSiteIntelCache(pnu, bundle);
  }

  return bundle;
}

/** Golden test / health check용 요약 */
export function summarizeSiteIntel(bundle: SiteIntelBundle) {
  const { parcel, landUseAttributes, meta } = bundle;
  const categories = {
    zoning: landUseAttributes.filter((i) => i.category === "용도지역").map((i) => i.name),
    districts: landUseAttributes.filter((i) => i.category === "용도지구").map((i) => i.name),
    zones: landUseAttributes.filter((i) => i.category === "용도구역").map((i) => i.name),
    other: landUseAttributes.filter((i) => !["용도지역", "용도지구", "용도구역"].includes(i.category)).map((i) => i.name),
  };

  return {
    pnu: bundle.pnu,
    polygonPointCount: parcel.polygonPointCount,
    polygonAreaSqm: parcel.polygonAreaSqm,
    centroid: parcel.centroid,
    bbox: parcel.bbox,
    bboxBuffered: parcel.bboxBuffered,
    landUseAttrCount: landUseAttributes.length,
    categories,
    landUseNames: landUseAttributes.map((i) => `${i.category}:${i.name}`),
    apiCallCount: meta.apiCallCount,
    cacheHit: meta.cacheHit,
    partial: meta.partial,
    errors: meta.errors,
  };
}
