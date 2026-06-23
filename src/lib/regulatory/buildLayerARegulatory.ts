import type { LayerARegulatoryAnalysis, LayerARegulatoryLevel, LayerARegulatoryRow } from "@/types/landInfo";
import type { LandUseAttrItem } from "@/types/siteIntel";

interface RegulatoryRule {
  keywords: string[];
  item: string;
  level: LayerARegulatoryLevel;
  summary: string;
}

const LAYER_A_RULES: RegulatoryRule[] = [
  {
    keywords: ["농림지역"],
    item: "농림지역",
    level: "추가 검토 필요",
    summary: "농지·개발행위 관련 검토가 필요할 수 있습니다. 공공 GIS 1차 확인 기준입니다.",
  },
  {
    keywords: ["농업진흥"],
    item: "농업진흥구역",
    level: "제한 가능성 높음",
    summary: "농지법상 제한 가능성이 있습니다. 농업진흥구역 해당 여부를 추가 확인하세요.",
  },
  {
    keywords: ["농업보호"],
    item: "농업보호구역",
    level: "추가 검토 필요",
    summary: "농업보호구역 내 개발행위·용도 변경 검토가 필요할 수 있습니다.",
  },
  {
    keywords: ["가축사육제한", "가축사육"],
    item: "가축사육제한구역",
    level: "추가 검토 필요",
    summary: "가축사육 제한 관련 구역입니다. 태양광과의 직접 제한 여부는 지자체 조례·현장 확인이 필요합니다.",
  },
  {
    keywords: ["개발제한"],
    item: "개발제한구역",
    level: "제한 가능성 높음",
    summary: "개발제한구역(그린벨트) 내 입지 제한 가능성이 있습니다. 예외 규정 검토가 필요합니다.",
  },
  {
    keywords: ["문화재"],
    item: "문화재보호구역",
    level: "추가 검토 필요",
    summary: "문화재·경관 관련 협의·심의가 필요할 수 있습니다.",
  },
  {
    keywords: ["비행안전", "비행장"],
    item: "비행안전구역",
    level: "추가 검토 필요",
    summary: "고도·구조물 관련 협의 가능성이 있습니다. 항공·국방 당국 확인이 필요할 수 있습니다.",
  },
  {
    keywords: ["토지거래허가", "토지거래계약"],
    item: "토지거래허가구역",
    level: "추가 검토 필요",
    summary: "토지거래허가구역 해당 시 매매·개발 전 허가 절차 검토가 필요합니다.",
  },
  {
    keywords: ["산림보호", "산지"],
    item: "산지·산림",
    level: "추가 검토 필요",
    summary: "산지·산림 관련 개발행위 제한 검토가 필요할 수 있습니다.",
  },
  {
    keywords: ["군사", "군사시설"],
    item: "군사시설보호구역",
    level: "추가 검토 필요",
    summary: "군사시설 보호 관련 협의·승인 검토가 필요할 수 있습니다.",
  },
  {
    keywords: ["자연환경보전"],
    item: "자연환경보전지역",
    level: "제한 가능성 높음",
    summary: "자연환경보전지역 내 개발·이용 제한 가능성이 있습니다.",
  },
  {
    keywords: ["도시지역"],
    item: "도시지역",
    level: "기본 확인",
    summary: "도시지역 내 용도지역·세부 규제에 따라 설치 검토가 가능합니다.",
  },
  {
    keywords: ["자연녹지", "녹지지역"],
    item: "자연녹지지역",
    level: "기본 확인",
    summary: "자연녹지지역 내 설치 검토가 가능하나 경관·이격거리 추가 확인이 필요할 수 있습니다.",
  },
  {
    keywords: ["계획관리"],
    item: "계획관리지역",
    level: "기본 확인",
    summary: "계획관리지역 내 용도·개발행위허가 기준 확인이 필요합니다.",
  },
  {
    keywords: ["성장관리"],
    item: "성장관리계획구역",
    level: "기본 확인",
    summary: "성장관리계획구역 내 세부 계획·용도 규제 확인이 필요합니다.",
  },
  {
    keywords: ["산업개발진흥", "산업단지"],
    item: "산업개발진흥지구",
    level: "기본 확인",
    summary: "산업지구·단지 내 설치는 단지 규정·용도 확인이 필요합니다.",
  },
  {
    keywords: ["지구단위"],
    item: "지구단위계획구역",
    level: "추가 검토 필요",
    summary: "지구단위계획에 따른 건축·용도 제한 확인이 필요합니다.",
  },
  {
    keywords: ["중점경관", "경관관리"],
    item: "경관관리구역",
    level: "추가 검토 필요",
    summary: "경관·가로·뷰 관련 심의·조건 확인이 필요할 수 있습니다.",
  },
];

function matchRule(zoneName: string, rule: RegulatoryRule): boolean {
  return rule.keywords.some((keyword) => zoneName.includes(keyword));
}

function buildDefaultRow(item: LandUseAttrItem): LayerARegulatoryRow {
  return {
    item: item.name,
    matchedZone: item.name,
    level: "기본 확인",
    summary: `토지이용계획상 ${item.category}으로 확인됩니다. 세부 규제 및 인허가 사항은 상담 시 안내드립니다.`,
  };
}

export function buildLayerARegulatoryAnalysis(
  landUseAttributes: LandUseAttrItem[],
  collectedAt?: string,
): LayerARegulatoryAnalysis {
  if (landUseAttributes.length === 0) {
    return {
      rows: [],
      sourceNote: "토지이용계획 GIS 데이터가 없어 Layer A 규제 1차 검토를 수행하지 못했습니다.",
      collectedAt,
    };
  }

  const zoneNames = landUseAttributes.map((item) => item.name);
  const context = zoneNames.join(" ");
  const rows: LayerARegulatoryRow[] = [];
  const seenItems = new Set<string>();

  for (const rule of LAYER_A_RULES) {
    if (!matchRule(context, rule)) continue;
    if (seenItems.has(rule.item)) continue;

    const matchedZone = zoneNames.find((name) => matchRule(name, rule)) ?? rule.item;
    seenItems.add(rule.item);
    rows.push({
      item: rule.item,
      matchedZone,
      level: rule.level,
      summary: rule.summary,
    });
  }

  for (const item of landUseAttributes) {
    const covered = LAYER_A_RULES.some(
      (rule) => matchRule(item.name, rule) && seenItems.has(rule.item),
    );
    if (covered) continue;

    const key = `zone:${item.name}`;
    if (seenItems.has(key)) continue;
    seenItems.add(key);
    rows.push(buildDefaultRow(item));
  }

  const levelOrder: LayerARegulatoryLevel[] = [
    "제한 가능성 높음",
    "추가 검토 필요",
    "기본 확인",
    "해당 없음",
  ];
  rows.sort((a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level));

  return {
    rows,
    sourceNote:
      "공공 GIS(VWorld 토지이용계획) 기반 Layer A 1차 규제 검토입니다. 최종 판단은 현장·조례·인허가 확인이 필요합니다.",
    collectedAt,
  };
}
