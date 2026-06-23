import type { SetbackReview } from "@/types/regulatoryReview";
import type { ParcelContext } from "@/types/siteIntel";
import { buildSetbackFromGis } from "@/lib/regulatory/buildSetbackFromGis";
import { SETBACK_SECTION_NOTICE } from "@/lib/regulatory/setbackDisplay";

export { extractMunicipalityLabel, loadMunicipalityOrdinance } from "@/lib/regulatory/loadOrdinance";

export function buildDefaultSetbackReview(_installType?: string): SetbackReview {
  const fallbackRow = (item: string, standard: string, detail?: string) => ({
    item,
    detail,
    standard,
    estimatedDistanceM: null,
    measured: "확인 필요",
    judgment: "공공데이터 확인 필요" as const,
    remark: "해당 항목은 공공데이터에서 확인되지 않았습니다.",
  });

  return {
    notice: SETBACK_SECTION_NOTICE,
    rows: [
      fallbackRow("건물/주거지", "200m", "인근 건물"),
      fallbackRow("도로", "100m", "포장도로"),
      fallbackRow("하천", "100m"),
      fallbackRow("학교", "100m"),
      fallbackRow("문화재보호구역", "100m"),
    ],
    meta: { partial: true, errors: ["parcel context unavailable"] },
  };
}

export async function resolveRegulatoryReview(input: {
  installType?: string;
  parcel?: ParcelContext | null;
}): Promise<{ setbackReview: SetbackReview }> {
  if (input.parcel) {
    const review = await buildSetbackFromGis(input.parcel, input.installType);
    return { setbackReview: review };
  }

  return {
    setbackReview: buildDefaultSetbackReview(input.installType),
  };
}
