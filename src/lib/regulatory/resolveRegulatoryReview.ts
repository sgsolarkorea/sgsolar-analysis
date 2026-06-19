import type { SetbackReview } from "@/types/regulatoryReview";

export { extractMunicipalityLabel, loadMunicipalityOrdinance } from "@/lib/regulatory/loadOrdinance";

const ORDINANCE_CHECK = "조례 기준 확인 필요";
const DETAILED_CHECK = "현장 및 지자체 조례 기준으로 상세 확인 필요";

export function buildDefaultSetbackReview(installType?: string): SetbackReview {
  const isRoof =
    installType?.includes("지붕") ||
    installType?.includes("옥상") ||
    installType?.includes("축사") ||
    installType?.includes("공장") ||
    installType?.includes("상가");

  return {
    notice: isRoof
      ? "지붕형 태양광은 이격거리 조례에 무관하게 설치를 검토할 수 있습니다."
      : "이격거리는 자동 실측 연동 전 단계로, 아래는 조례·법령 기준 참고용입니다. 현장·GIS 측정 후 최종 판단합니다.",
    rows: [
      {
        item: "도로",
        detail: "포장도로",
        standard: "확인 필요",
        measured: ORDINANCE_CHECK,
        judgment: "조례 기준 확인 필요",
      },
      {
        item: "주거지역 건물",
        standard: "200m",
        measured: DETAILED_CHECK,
        judgment: "검토 필요",
      },
      {
        item: "하천",
        standard: "200m",
        measured: DETAILED_CHECK,
        judgment: "추가 확인",
      },
      {
        item: "산림경계",
        standard: "200m",
        measured: ORDINANCE_CHECK,
        judgment: "조례 기준 확인 필요",
      },
      {
        item: "농업시설",
        standard: "200m",
        measured: ORDINANCE_CHECK,
        judgment: "조례 기준 확인 필요",
      },
      {
        item: "문화재",
        standard: "확인 필요",
        measured: ORDINANCE_CHECK,
        judgment: "조례 기준 확인 필요",
      },
      {
        item: "관광지",
        standard: "확인 필요",
        measured: ORDINANCE_CHECK,
        judgment: "조례 기준 확인 필요",
      },
    ],
  };
}

export function resolveRegulatoryReview(input: {
  address: string;
  installType?: string;
}) {
  return {
    setbackReview: buildDefaultSetbackReview(input.installType),
  };
}
