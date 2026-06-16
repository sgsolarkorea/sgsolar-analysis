import { randomUUID } from "crypto";
import { searchAddressByKakao } from "@/lib/api/kakao";
import { getLandInfoByPnu, getLandInfoByVworld } from "@/lib/api/vworld";
import { formatAreaSqmLabel } from "@/lib/parcels/format";
import { getFieldValue, parseAreaSqm } from "@/lib/solar/calculate";
import type { ParcelItem } from "@/types/parcelReview";
import type { ResolvedSiteReview } from "@/types/siteReview";

export function primaryParcelFromReview(data: ResolvedSiteReview): ParcelItem {
  const areaLabel = getFieldValue(data.landInfo, "면적");
  const areaSqm = parseAreaSqm(areaLabel) ?? 0;

  return {
    id: data.pnu || randomUUID(),
    address: data.address,
    jibunAddress: data.jibunAddress,
    pnu: data.pnu,
    lat: data.lat,
    lng: data.lng,
    areaSqm,
    areaLabel: areaSqm > 0 ? areaLabel : "확인 필요",
    landCategory: getFieldValue(data.landInfo, "지목"),
    zoning: getFieldValue(data.landInfo, "용도지역"),
    isPrimary: true,
  };
}

export async function lookupParcelByAddress(
  address: string,
  options?: { isPrimary?: boolean },
): Promise<ParcelItem> {
  const geo = await searchAddressByKakao(address);
  const landResult = await getLandInfoByVworld(geo.lat, geo.lng);
  const effectivePnu = landResult.pnu ?? "";
  let landInfo = landResult.landInfo;

  if (effectivePnu) {
    const byPnu = await getLandInfoByPnu(effectivePnu);
    if (parseAreaSqm(getFieldValue(byPnu.landInfo, "면적"))) {
      landInfo = byPnu.landInfo;
    }
  }

  const areaLabel = getFieldValue(landInfo, "면적");
  const areaSqm = parseAreaSqm(areaLabel) ?? 0;

  return {
    id: effectivePnu || randomUUID(),
    address: geo.address,
    jibunAddress: geo.jibunAddress,
    pnu: effectivePnu,
    lat: geo.lat,
    lng: geo.lng,
    areaSqm,
    areaLabel: areaSqm > 0 ? areaLabel : formatAreaSqmLabel(0),
    landCategory: getFieldValue(landInfo, "지목"),
    zoning: getFieldValue(landInfo, "용도지역"),
    isPrimary: options?.isPrimary ?? false,
  };
}
