import type { LayerARegulatoryLevel } from "@/types/landInfo";

export interface RegulatorySummaryMatch {
  level: LayerARegulatoryLevel;
  summary: string;
}

interface SummaryRule {
  keywords: string[];
  level: LayerARegulatoryLevel;
  summary: string | ((zoneName: string) => string);
}

const SUMMARY_RULES: SummaryRule[] = [
  {
    keywords: ["가축사육제한", "가축사육"],
    level: "추가 검토 필요",
    summary:
      "가축사육 관련 제한구역으로 확인됩니다. 태양광 직접 제한 여부는 지자체 조례와 현장 조건 확인이 필요합니다.",
  },
  {
    keywords: ["절대보호구역"],
    level: "제한 가능성 높음",
    summary:
      "교육환경 보호구역으로 확인됩니다. 학교 주변 시설 제한 및 인허가 검토가 필요합니다.",
  },
  {
    keywords: ["상대보호구역", "교육환경"],
    level: "추가 검토 필요",
    summary:
      "교육환경 보호구역으로 확인됩니다. 학교 주변 시설 제한 및 인허가 검토가 필요합니다.",
  },
  {
    keywords: ["개발제한"],
    level: "제한 가능성 높음",
    summary:
      "개발제한구역으로 확인됩니다. 태양광 설치 제한 가능성이 높아 사전 인허가 검토가 필요합니다.",
  },
  {
    keywords: ["문화재", "역사문화환경"],
    level: "제한 가능성 높음",
    summary:
      "문화재 관련 검토 대상 구역입니다. 관할 지자체 및 문화재 관련 부서 확인이 필요합니다.",
  },
  {
    keywords: ["농업진흥"],
    level: "제한 가능성 높음",
    summary:
      "농지 또는 관리지역 관련 검토 대상입니다. 개발행위허가, 농지전용 가능 여부 확인이 필요합니다.",
  },
  {
    keywords: ["농업보호", "농림지역", "생산관리", "농지"],
    level: "추가 검토 필요",
    summary:
      "농지 또는 관리지역 관련 검토 대상입니다. 개발행위허가, 농지전용 가능 여부 확인이 필요합니다.",
  },
  {
    keywords: ["보전산지", "준보전산지", "임업용산지", "산림보호", "산지"],
    level: "추가 검토 필요",
    summary: "산지 관련 검토 대상입니다. 산지전용 가능 여부와 경사도 기준 확인이 필요합니다.",
  },
  {
    keywords: ["자연환경보전"],
    level: "제한 가능성 높음",
    summary:
      "자연환경보전지역으로 확인됩니다. 개발·이용 제한 가능성이 있어 사전 인허가 검토가 필요합니다.",
  },
  {
    keywords: ["중로", "대로", "소로", "광로", "도로구역", "도시계획도로", "도시계획(도로)"],
    level: "추가 검토 필요",
    summary:
      "도시계획도로 또는 도로 관련 구역으로 확인됩니다. 실제 저촉 여부와 향후 도로계획 여부 확인이 필요합니다.",
  },
  {
    keywords: ["제1종일반주거", "제2종일반주거", "제3종일반주거", "일반주거", "준주거", "주거지역"],
    level: "추가 검토 필요",
    summary:
      "주거지역으로 확인됩니다. 지붕형 설치 가능성, 구조안전, 주변 민원 가능성을 함께 검토해야 합니다.",
  },
  {
    keywords: ["도시지역"],
    level: "기본 확인",
    summary:
      "도시지역으로 확인됩니다. 세부 용도지역과 건축물 설치 가능 여부를 함께 검토해야 합니다.",
  },
  {
    keywords: ["비행안전", "비행장"],
    level: "추가 검토 필요",
    summary: "비행안전구역으로 확인됩니다. 고도·구조물 관련 협의 가능성이 있습니다.",
  },
  {
    keywords: ["토지거래허가", "토지거래계약"],
    level: "추가 검토 필요",
    summary: "토지거래허가구역 해당 시 매매·개발 전 허가 절차 검토가 필요합니다.",
  },
  {
    keywords: ["군사", "군사시설"],
    level: "추가 검토 필요",
    summary: "군사시설 보호 관련 협의·승인 검토가 필요할 수 있습니다.",
  },
  {
    keywords: ["지구단위"],
    level: "추가 검토 필요",
    summary: "지구단위계획에 따른 건축·용도 제한 확인이 필요합니다.",
  },
  {
    keywords: ["중점경관", "경관관리"],
    level: "추가 검토 필요",
    summary: "경관관리구역으로 확인됩니다. 경관·가로·뷰 관련 심의·조건 확인이 필요할 수 있습니다.",
  },
  {
    keywords: ["자연녹지", "녹지지역"],
    level: "기본 확인",
    summary:
      "자연녹지지역으로 확인됩니다. 경관·이격거리 등 세부 규제 확인이 필요할 수 있습니다.",
  },
  {
    keywords: ["계획관리"],
    level: "기본 확인",
    summary: "계획관리지역으로 확인됩니다. 용도·개발행위허가 기준 확인이 필요합니다.",
  },
  {
    keywords: ["성장관리"],
    level: "기본 확인",
    summary: "성장관리계획구역으로 확인됩니다. 세부 계획·용도 규제 확인이 필요합니다.",
  },
  {
    keywords: ["산업개발진흥", "산업단지"],
    level: "기본 확인",
    summary: "산업지구·단지 내 설치는 단지 규정·용도 확인이 필요합니다.",
  },
  {
    keywords: ["관리지역"],
    level: "기본 확인",
    summary: "관리지역으로 확인됩니다. 세부 용도지역과 개발행위허가 기준 확인이 필요합니다.",
  },
  {
    keywords: ["준공업"],
    level: "추가 검토 필요",
    summary: "준공업지역으로 확인됩니다. 용도·소음·환경 관련 세부 규제 확인이 필요합니다.",
  },
  {
    keywords: ["공업지역", "일반공업", "전용공업"],
    level: "기본 확인",
    summary: "공업지역으로 확인됩니다. 건축물·설비 설치 가능 여부와 용도 규제 확인이 필요합니다.",
  },
  {
    keywords: ["상업지역", "근린상업", "일반상업", "중심상업"],
    level: "기본 확인",
    summary: "상업지역으로 확인됩니다. 건축물·지붕형 설치 가능 여부 확인이 필요합니다.",
  },
  {
    keywords: ["하천", "유수지", "저수지"],
    level: "추가 검토 필요",
    summary: "수계·하천 관련 구역으로 확인됩니다. 이격거리 및 개발행위 제한 확인이 필요합니다.",
  },
  {
    keywords: ["공원", "녹지"],
    level: "추가 검토 필요",
    summary: "공원·녹지 관련 구역으로 확인됩니다. 용도·개발 제한 여부 확인이 필요합니다.",
  },
];

function matchesKeyword(zoneName: string, keyword: string): boolean {
  return zoneName.includes(keyword);
}

function matchesRule(zoneName: string, rule: SummaryRule): boolean {
  return rule.keywords.some((keyword) => matchesKeyword(zoneName, keyword));
}

function fallbackSummary(zoneName: string, category?: string): string {
  if (category === "용도지역") {
    return `${zoneName}(으)로 확인됩니다. 설치 가능 여부는 세부 법령과 지자체 기준 확인이 필요합니다.`;
  }
  if (category === "용도지구") {
    return `${zoneName} 지구로 확인됩니다. 해당 지구 규정과 인허가 요건 확인이 필요합니다.`;
  }
  if (category === "용도구역") {
    return `${zoneName} 구역으로 확인됩니다. 세부 법령과 지자체 기준에 따른 추가 검토가 필요합니다.`;
  }
  return `${zoneName}(으)로 확인됩니다. 설치 가능 여부는 세부 법령과 지자체 기준 확인이 필요합니다.`;
}

/** 항목명·구역명 기반 실무형 요약 (동일 placeholder 반복 방지) */
export function resolveRegulatorySummary(
  zoneName: string,
  category?: string,
): RegulatorySummaryMatch {
  for (const rule of SUMMARY_RULES) {
    if (!matchesRule(zoneName, rule)) continue;
    const summary =
      typeof rule.summary === "function" ? rule.summary(zoneName) : rule.summary;
    return { level: rule.level, summary };
  }

  return {
    level: "기본 확인",
    summary: fallbackSummary(zoneName, category),
  };
}

/** Layer A 규칙용 — 키워드 매칭 및 요약 */
export function matchRegulatoryRuleKeywords(context: string, keywords: string[]): boolean {
  return keywords.some((keyword) => context.includes(keyword));
}

export function getRegulatoryRuleSummary(
  keywords: string[],
  zoneName: string,
  defaultSummary: string,
): string {
  for (const rule of SUMMARY_RULES) {
    if (rule.keywords.some((k) => keywords.includes(k) || matchesKeyword(zoneName, k))) {
      return typeof rule.summary === "function" ? rule.summary(zoneName) : rule.summary;
    }
  }
  return defaultSummary;
}
