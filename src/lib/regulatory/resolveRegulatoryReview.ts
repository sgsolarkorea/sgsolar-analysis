import type { SetbackReview } from "@/types/regulatoryReview";
import { loadMunicipalityOrdinance } from "@/lib/regulatory/loadOrdinance";

export { extractMunicipalityLabel, loadMunicipalityOrdinance } from "@/lib/regulatory/loadOrdinance";

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
      : undefined,
    rows: [
      {
        item: "도로",
        detail: "포장도로",
        standard: "확인 필요",
        measured: "미측정",
        judgment: "미측정",
      },
      {
        item: "주거지역 건물",
        standard: "200m",
        measured: "추가 확인",
        judgment: "검토 필요",
      },
      {
        item: "하천",
        standard: "200m",
        measured: "추가 확인",
        judgment: "추가 확인",
      },
      {
        item: "산림경계",
        standard: "200m",
        measured: "미측정",
        judgment: "미측정",
      },
      {
        item: "농업시설",
        standard: "200m",
        measured: "미측정",
        judgment: "미측정",
      },
      {
        item: "문화재",
        standard: "확인 필요",
        measured: "미측정",
        judgment: "미측정",
      },
      {
        item: "관광지",
        standard: "확인 필요",
        measured: "미측정",
        judgment: "미측정",
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
    localOrdinance: loadMunicipalityOrdinance(input.address),
  };
}
