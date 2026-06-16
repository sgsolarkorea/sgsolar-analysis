import { reverseGeocodeKakao } from "@/lib/api/kakao";
import { fetchAdjacentCadastralParcels } from "@/lib/api/vworld";
import { getLandInfoByPnu } from "@/lib/api/vworld";
import { formatAreaSqmLabel } from "@/lib/parcels/format";
import { getFieldValue, parseAreaSqm } from "@/lib/solar/calculate";
import type { AdjacentParcelCandidate } from "@/types/parcelReview";

export async function findAdjacentParcels(input: {
  lat: number;
  lng: number;
  excludePnu?: string;
  radiusM?: number;
  existingPnus?: string[];
}): Promise<AdjacentParcelCandidate[]> {
  const radiusM = input.radiusM ?? 50;
  const existing = new Set(input.existingPnus ?? []);
  if (input.excludePnu) existing.add(input.excludePnu);

  const cadastral = await fetchAdjacentCadastralParcels(
    input.lat,
    input.lng,
    radiusM,
    input.excludePnu,
  );

  const candidates: AdjacentParcelCandidate[] = [];

  for (const feature of cadastral) {
    if (existing.has(feature.pnu)) continue;

    const [landResult, geo] = await Promise.all([
      getLandInfoByPnu(feature.pnu),
      reverseGeocodeKakao(feature.lat, feature.lng),
    ]);

    const areaLabel = getFieldValue(landResult.landInfo, "면적");
    const areaSqm = parseAreaSqm(areaLabel) ?? 0;
    if (areaSqm <= 0) continue;

    candidates.push({
      pnu: feature.pnu,
      jibunAddress: geo.jibunAddress || feature.jibun || "",
      address: geo.address || geo.jibunAddress || feature.jibun || "",
      lat: feature.lat,
      lng: feature.lng,
      areaSqm,
      areaLabel: areaSqm > 0 ? areaLabel : formatAreaSqmLabel(areaSqm),
      landCategory: getFieldValue(landResult.landInfo, "지목"),
      zoning: getFieldValue(landResult.landInfo, "용도지역"),
    });

    existing.add(feature.pnu);
  }

  return candidates;
}
