import type { SetbackReview } from "@/types/regulatoryReview";
import type { ParcelContext } from "@/types/siteIntel";
import { buildSetbackFromGis } from "@/lib/regulatory/buildSetbackFromGis";

export { extractMunicipalityLabel, loadMunicipalityOrdinance } from "@/lib/regulatory/loadOrdinance";

export function buildDefaultSetbackReview(installType?: string): SetbackReview {
  const isRoof =
    installType?.includes("지붕") ||
    installType?.includes("옥상") ||
    installType?.includes("축사") ||
    installType?.includes("공장") ||
    installType?.includes("상가");

  const fallbackRow = (item: string, standard: string, detail?: string) => ({
    item,
    detail,
    standard,
    estimatedDistanceM: null,
    measured: "데이터 확인 필요",
    judgment: "데이터 확인 필요" as const,
    remark: "필지 GIS 정보 확인 후 추정 거리를 산출합니다.",
  });

  return {
    notice: isRoof
      ? "지붕형 태양광은 이격거리 조례에 무관하게 설치를 검토할 수 있습니다."
      : "아래 거리는 공공 GIS 기준 추정값이며, 최종 이격거리는 지자체 조례·현장 확인이 필요합니다.",
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
