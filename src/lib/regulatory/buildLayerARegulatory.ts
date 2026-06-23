import type { LayerARegulatoryAnalysis, LayerARegulatoryLevel, LayerARegulatoryRow } from "@/types/landInfo";
import type { LandUseAttrItem } from "@/types/siteIntel";
import {
  matchRegulatoryRuleKeywords,
  resolveRegulatorySummary,
} from "@/lib/regulatory/regulatorySummaryRules";

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
    summary:
      "농지 또는 관리지역 관련 검토 대상입니다. 개발행위허가, 농지전용 가능 여부 확인이 필요합니다.",
  },
  {
    keywords: ["농업진흥"],
    item: "농업진흥구역",
    level: "제한 가능성 높음",
    summary:
      "농지 또는 관리지역 관련 검토 대상입니다. 개발행위허가, 농지전용 가능 여부 확인이 필요합니다.",
  },
  {
    keywords: ["농업보호"],
    item: "농업보호구역",
    level: "추가 검토 필요",
    summary:
      "농지 또는 관리지역 관련 검토 대상입니다. 개발행위허가, 농지전용 가능 여부 확인이 필요합니다.",
  },
  {
    keywords: ["가축사육제한", "가축사육"],
    item: "가축사육제한구역",
    level: "추가 검토 필요",
    summary:
      "가축사육 관련 제한구역으로 확인됩니다. 태양광 직접 제한 여부는 지자체 조례와 현장 조건 확인이 필요합니다.",
  },
  {
    keywords: ["개발제한"],
    item: "개발제한구역",
    level: "제한 가능성 높음",
    summary:
      "개발제한구역으로 확인됩니다. 태양광 설치 제한 가능성이 높아 사전 인허가 검토가 필요합니다.",
  },
  {
    keywords: ["문화재", "역사문화환경"],
    item: "문화재보호구역",
    level: "제한 가능성 높음",
    summary:
      "문화재 관련 검토 대상 구역입니다. 관할 지자체 및 문화재 관련 부서 확인이 필요합니다.",
  },
  {
    keywords: ["비행안전", "비행장"],
    item: "비행안전구역",
    level: "추가 검토 필요",
    summary: "비행안전구역으로 확인됩니다. 고도·구조물 관련 협의 가능성이 있습니다.",
  },
  {
    keywords: ["토지거래허가", "토지거래계약"],
    item: "토지거래허가구역",
    level: "추가 검토 필요",
    summary: "토지거래허가구역 해당 시 매매·개발 전 허가 절차 검토가 필요합니다.",
  },
  {
    keywords: ["산림보호", "산지", "보전산지", "준보전산지"],
    item: "산지·산림",
    level: "추가 검토 필요",
    summary: "산지 관련 검토 대상입니다. 산지전용 가능 여부와 경사도 기준 확인이 필요합니다.",
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
    summary:
      "자연환경보전지역으로 확인됩니다. 개발·이용 제한 가능성이 있어 사전 인허가 검토가 필요합니다.",
  },
  {
    keywords: ["도시지역"],
    item: "도시지역",
    level: "기본 확인",
    summary:
      "도시지역으로 확인됩니다. 세부 용도지역과 건축물 설치 가능 여부를 함께 검토해야 합니다.",
  },
  {
    keywords: ["제1종일반주거", "제2종일반주거", "제3종일반주거", "일반주거", "준주거", "주거지역"],
    item: "주거지역",
    level: "추가 검토 필요",
    summary:
      "주거지역으로 확인됩니다. 지붕형 설치 가능성, 구조안전, 주변 민원 가능성을 함께 검토해야 합니다.",
  },
  {
    keywords: ["상대보호구역", "절대보호구역", "교육환경"],
    item: "교육환경보호구역",
    level: "추가 검토 필요",
    summary:
      "교육환경 보호구역으로 확인됩니다. 학교 주변 시설 제한 및 인허가 검토가 필요합니다.",
  },
  {
    keywords: ["중로", "대로", "소로", "광로", "도로구역"],
    item: "도로 관련 구역",
    level: "추가 검토 필요",
    summary:
      "도시계획도로 또는 도로 관련 구역으로 확인됩니다. 실제 저촉 여부와 향후 도로계획 여부 확인이 필요합니다.",
  },
  {
    keywords: ["자연녹지", "녹지지역"],
    item: "자연녹지지역",
    level: "기본 확인",
    summary:
      "자연녹지지역으로 확인됩니다. 경관·이격거리 등 세부 규제 확인이 필요할 수 있습니다.",
  },
  {
    keywords: ["계획관리", "생산관리"],
    item: "계획·생산관리지역",
    level: "기본 확인",
    summary: "관리지역으로 확인됩니다. 세부 용도지역과 개발행위허가 기준 확인이 필요합니다.",
  },
  {
    keywords: ["성장관리"],
    item: "성장관리계획구역",
    level: "기본 확인",
    summary: "성장관리계획구역으로 확인됩니다. 세부 계획·용도 규제 확인이 필요합니다.",
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
    summary: "경관관리구역으로 확인됩니다. 경관·가로·뷰 관련 심의·조건 확인이 필요할 수 있습니다.",
  },
];

function matchRule(zoneName: string, rule: RegulatoryRule): boolean {
  return matchRegulatoryRuleKeywords(zoneName, rule.keywords);
}

function buildDefaultRow(item: LandUseAttrItem): LayerARegulatoryRow {
  const resolved = resolveRegulatorySummary(item.name, item.category);
  const summary = resolved.summary.includes(item.name)
    ? resolved.summary
    : `${item.name} — ${resolved.summary}`;
  return {
    item: item.name,
    matchedZone: item.name,
    level: resolved.level,
    summary,
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
    if (!matchRegulatoryRuleKeywords(context, rule.keywords)) continue;
    if (seenItems.has(rule.item)) continue;

    const matchedZone = zoneNames.find((name) => matchRule(name, rule)) ?? rule.item;
    seenItems.add(rule.item);
    const level =
      rule.item === "교육환경보호구역" && matchedZone.includes("절대보호")
        ? "제한 가능성 높음"
        : rule.level;
    rows.push({
      item: rule.item,
      matchedZone,
      level,
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
      "공공 토지이용계획 기반 1차 규제 검토입니다. 최종 판단은 현장·조례·인허가 확인이 필요합니다.",
    collectedAt,
  };
}
