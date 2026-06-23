import type { SetbackReview } from "@/types/regulatoryReview";
import type { ParcelContext } from "@/types/siteIntel";
import { buildSetbackFromGis } from "@/lib/regulatory/buildSetbackFromGis";
import {
  buildSetbackStandardColumnLabel,
  buildSetbackStandardNotice,
  lookupSetbackRegulation,
} from "@/lib/regulatory/setbackRegulationDb";
import { SETBACK_SECTION_NOTICE } from "@/lib/regulatory/setbackDisplay";

export { extractMunicipalityLabel, loadMunicipalityOrdinance } from "@/lib/regulatory/loadOrdinance";

export function buildDefaultSetbackReview(
  _installType?: string,
  address = "",
  jibunAddress = "",
): SetbackReview {
  const regulation = lookupSetbackRegulation(address, jibunAddress);

  const fallbackRow = (item: string, standardM: number, detail?: string) => ({
    item,
    detail,
    standard: `${standardM}m`,
    estimatedDistanceM: null,
    measured: "확인 필요",
    judgment: "공공데이터 확인 필요" as const,
    remark: "해당 항목은 공공데이터에서 확인되지 않았습니다.",
  });

  return {
    notice: SETBACK_SECTION_NOTICE,
    appliedStandard: {
      municipalityLabel: regulation.municipalityLabel,
      source: regulation.source,
      lastUpdated: regulation.lastUpdated,
      confidence: regulation.confidence,
      isFallback: regulation.isFallback,
      notice: buildSetbackStandardNotice(regulation),
      columnLabel: buildSetbackStandardColumnLabel(regulation),
    },
    rows: [
      fallbackRow("건물/주거지", regulation.distances.residential, "인근 건물"),
      fallbackRow("도로", regulation.distances.road, "포장도로"),
      fallbackRow("하천", regulation.distances.river),
      fallbackRow("학교", regulation.distances.school),
      fallbackRow("문화재보호구역", regulation.distances.cultural),
    ],
    meta: { partial: true, errors: ["parcel context unavailable"] },
  };
}

export async function resolveRegulatoryReview(input: {
  installType?: string;
  parcel?: ParcelContext | null;
  address?: string;
  jibunAddress?: string;
}): Promise<{ setbackReview: SetbackReview }> {
  const address = input.address ?? "";
  const jibunAddress = input.jibunAddress ?? "";

  if (input.parcel) {
    const review = await buildSetbackFromGis(input.parcel, {
      installType: input.installType,
      address,
      jibunAddress,
    });
    return { setbackReview: review };
  }

  return {
    setbackReview: buildDefaultSetbackReview(input.installType, address, jibunAddress),
  };
}
