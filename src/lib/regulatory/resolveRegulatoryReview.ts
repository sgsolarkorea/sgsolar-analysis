import type { LocalOrdinanceReview, SetbackReview } from "@/types/regulatoryReview";

/** 주소에서 시·군·구명 추출 (MVP) */
export function extractMunicipalityLabel(address: string): string {
  const trimmed = address.trim();
  const cityMatch = trimmed.match(/([^\s]+(?:시|군))\s/);
  if (cityMatch?.[1]) return cityMatch[1];
  const districtMatch = trimmed.match(/([^\s]+구)\s/);
  if (districtMatch?.[1]) return districtMatch[1];
  return "해당 지자체";
}

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

export function buildDefaultLocalOrdinanceReview(address: string): LocalOrdinanceReview {
  const municipality = extractMunicipalityLabel(address);

  return {
    municipalityLabel: municipality,
    ordinanceTitle: `${municipality} 도시계획 조례`,
    appendixTitle: "[별표] 태양광 발전시설 허가기준",
    distanceRules: [
      { label: "주거지역", distance: "200m 이상" },
      { label: "하천", distance: "200m 이상" },
      { label: "산림경계", distance: "200m 이상" },
      { label: "농업시설", distance: "200m 이상" },
      { label: "관광지", distance: "200m 이상" },
      { label: "도로", distance: "200m 이상" },
    ],
    relatedLaw: "재생에너지법 / 지자체 조례 기준",
    promulgatedDate: "조례 확인 필요",
    enforcedDate: "시행일 확인 필요",
    statusNote: "지역별 조례 상세는 현장 상담 시 확인합니다.",
  };
}

/** 향후 API 연동 시 이 함수에서 지역별 데이터 매핑 */
export function resolveRegulatoryReview(input: {
  address: string;
  installType?: string;
}): { setbackReview: SetbackReview; localOrdinance: LocalOrdinanceReview } {
  return {
    setbackReview: buildDefaultSetbackReview(input.installType),
    localOrdinance: buildDefaultLocalOrdinanceReview(input.address),
  };
}
