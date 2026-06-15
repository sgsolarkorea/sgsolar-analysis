import type { InfoField } from "@/types/siteReview";
import type { ConstructionCase, RecommendedConstructionCase } from "@/types/siteReview";

export interface CaseRecommendInput {
  address: string;
  jibunAddress?: string;
  landInfo: InfoField[];
  buildingInfo: InfoField[];
  capacity: string;
  recommendation: string;
}

interface SiteProfile {
  province: string;
  city: string;
  landCategory: string;
  installCategory: string;
  capacityKw: number;
}

interface DimensionScores {
  region: number;
  installType: number;
  capacity: number;
  land: number;
  total: number;
}

const PROVINCE_ALIASES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /전북|전라북도/, label: "전북" },
  { pattern: /전남|전라남도/, label: "전남" },
  { pattern: /경북|경상북도/, label: "경북" },
  { pattern: /경남|경상남도/, label: "경남" },
  { pattern: /경기/, label: "경기" },
  { pattern: /충북|충청북도/, label: "충북" },
  { pattern: /충남|충청남도/, label: "충남" },
  { pattern: /강원/, label: "강원" },
  { pattern: /제주/, label: "제주" },
  { pattern: /서울/, label: "서울" },
  { pattern: /부산/, label: "부산" },
  { pattern: /대구/, label: "대구" },
  { pattern: /인천/, label: "인천" },
  { pattern: /광주/, label: "광주" },
  { pattern: /대전/, label: "대전" },
  { pattern: /울산/, label: "울산" },
  { pattern: /세종/, label: "세종" },
];

const CITY_PATTERN =
  /([가-힣]+(?:시|군|구))(?:\s|$)/;

const INSTALL_TYPE_GROUPS: Record<string, string[]> = {
  토지형: ["토지형", "토지형 발전사업"],
  지붕형: ["지붕형", "옥상형", "공장형"],
  축사형: ["축사형", "축사/공장 지붕형"],
  상가형: ["상가형", "상가/공장 자가소비"],
  주택형: ["주택형", "주택용"],
  공장형: ["공장형", "상가/공장 자가소비", "축사/공장 지붕형"],
};

const LAND_CATEGORY_GROUPS: Record<string, string[]> = {
  대: ["대", "전", "답"],
  임야: ["임야", "임"],
  건축물: ["건축물", "대", "잡종지"],
};

const WEIGHTS = {
  region: 0.35,
  installType: 0.3,
  capacity: 0.2,
  land: 0.15,
} as const;

const TOP_N = 3;

function getFieldValue(fields: InfoField[], label: string): string {
  return fields.find((field) => field.label === label)?.value?.trim() ?? "";
}

export function parseCapacityKw(capacity: string): number {
  const match = capacity.replace(/,/g, "").match(/([\d.]+)\s*kW/i);
  return match ? Number(match[1]) : 0;
}

function extractProvince(text: string): string {
  for (const { pattern, label } of PROVINCE_ALIASES) {
    if (pattern.test(text)) return label;
  }
  return "";
}

function extractCity(text: string): string {
  const match = text.match(CITY_PATTERN);
  return match?.[1] ?? "";
}

function inferInstallCategory(
  recommendation: string,
  landCategory: string,
  buildingUse: string,
  capacityKw: number,
): string {
  const rec = recommendation.toLowerCase();
  const building = buildingUse.toLowerCase();

  if (building.includes("축사") || rec.includes("축사")) return "축사형";
  if (building.includes("상가") || building.includes("근린") || building.includes("판매")) {
    return capacityKw <= 30 ? "상가형" : "지붕형";
  }
  if (building.includes("공장") || building.includes("창고") || rec.includes("공장")) {
    return "공장형";
  }
  if (rec.includes("옥상") || rec.includes("지붕") || building.includes("업무")) {
    return "지붕형";
  }
  if (capacityKw > 0 && capacityKw <= 30 && (landCategory === "대" || building.includes("주택"))) {
    return "주택형";
  }
  if (landCategory === "대" || landCategory === "전" || landCategory === "답") {
    return capacityKw >= 100 ? "토지형" : "주택형";
  }
  if (landCategory === "임야" || landCategory === "임") return "토지형";

  return capacityKw >= 100 ? "토지형" : "지붕형";
}

function buildSiteProfile(input: CaseRecommendInput): SiteProfile {
  const searchText = `${input.address} ${input.jibunAddress ?? ""}`;
  const landCategory = getFieldValue(input.landInfo, "지목") || "미확인";
  const buildingUse = getFieldValue(input.buildingInfo, "건물 용도");
  const capacityKw = parseCapacityKw(input.capacity);

  return {
    province: extractProvince(searchText),
    city: extractCity(searchText),
    landCategory,
    installCategory: inferInstallCategory(
      input.recommendation,
      landCategory,
      buildingUse,
      capacityKw,
    ),
    capacityKw: capacityKw || 100,
  };
}

function scoreRegion(site: SiteProfile, item: ConstructionCase): number {
  if (!site.province) return 0.3;

  if (site.province === item.province) {
    if (site.city && item.city && site.city === item.city) return 1;
    if (site.city && item.city) return 0.75;
    return 0.85;
  }

  return 0.2;
}

function normalizeInstallCategory(category: string): string {
  for (const [key, aliases] of Object.entries(INSTALL_TYPE_GROUPS)) {
    if (key === category || aliases.includes(category) || category.includes(key)) {
      return key;
    }
  }
  return category;
}

function scoreInstallType(site: SiteProfile, item: ConstructionCase): number {
  const siteType = normalizeInstallCategory(site.installCategory);
  const caseType = normalizeInstallCategory(item.installCategory);

  if (siteType === caseType) return 1;

  const related: Record<string, string[]> = {
    지붕형: ["공장형", "상가형", "축사형"],
    공장형: ["지붕형", "축사형"],
    상가형: ["지붕형", "주택형"],
    주택형: ["상가형"],
    토지형: [],
    축사형: ["공장형", "지붕형"],
  };

  if (related[siteType]?.includes(caseType)) return 0.65;
  if (siteType === "토지형" && caseType !== "토지형") return 0.15;

  return 0.25;
}

function scoreCapacity(siteKw: number, caseKw: number): number {
  if (siteKw <= 0 || caseKw <= 0) return 0.4;

  const ratio = Math.min(siteKw, caseKw) / Math.max(siteKw, caseKw);
  if (ratio >= 0.7) return 1;
  if (ratio >= 0.4) return 0.75;
  if (ratio >= 0.2) return 0.5;
  return 0.25;
}

function normalizeLandCategory(category: string): string {
  for (const [key, aliases] of Object.entries(LAND_CATEGORY_GROUPS)) {
    if (aliases.includes(category)) return key;
  }
  return category;
}

function scoreLand(site: SiteProfile, item: ConstructionCase): number {
  const siteLand = normalizeLandCategory(site.landCategory);
  const caseLand = normalizeLandCategory(item.landCategory);

  if (siteLand === caseLand) return 1;
  if (siteLand === "건축물" && (caseLand === "대" || item.installCategory !== "토지형")) {
    return 0.7;
  }
  if (siteLand === "대" && caseLand === "대") return 1;
  return 0.35;
}

function scoreCase(site: SiteProfile, item: ConstructionCase): DimensionScores {
  const region = scoreRegion(site, item);
  const installType = scoreInstallType(site, item);
  const capacity = scoreCapacity(site.capacityKw, item.capacityKw);
  const land = scoreLand(site, item);
  const total =
    region * WEIGHTS.region +
    installType * WEIGHTS.installType +
    capacity * WEIGHTS.capacity +
    land * WEIGHTS.land;

  return { region, installType, capacity, land, total };
}

function formatInstallLabel(category: string): string {
  const labels: Record<string, string> = {
    토지형: "토지형 발전사업",
    지붕형: "지붕형",
    축사형: "축사 지붕형",
    상가형: "상가 지붕형",
    주택형: "주택 지붕형",
    공장형: "공장 지붕형",
  };
  return labels[category] ?? category;
}

function buildRecommendReason(
  site: SiteProfile,
  item: ConstructionCase,
  scores: DimensionScores,
): string {
  const reasons: string[] = [];

  if (scores.region >= 0.75) {
    if (site.city && item.city && site.city === item.city) {
      reasons.push(`입력 주소와 같은 ${site.city} ${formatInstallLabel(item.installCategory)}`);
    } else if (site.province) {
      reasons.push(`입력 주소와 같은 ${site.province}권 ${formatInstallLabel(item.installCategory)}`);
    }
  } else if (scores.region >= 0.5 && item.province) {
    reasons.push(`${item.province}권 ${formatInstallLabel(item.installCategory)}`);
  }

  if (scores.installType >= 0.9 && reasons.length === 0) {
    reasons.push(`${formatInstallLabel(item.installCategory)}과 유사한 유형`);
  }

  if (scores.capacity >= 0.7) {
    reasons.push(`${item.capacity} 용량대`);
  }

  if (scores.land >= 0.9 && site.landCategory !== "미확인") {
    reasons.push(`${item.landCategory} 지목·건물 조건이 유사`);
  }

  if (reasons.length === 0) {
    return `${item.type} 시공사례입니다.`;
  }

  if (reasons.length === 1) {
    return `${reasons[0]} 사례입니다.`;
  }

  return `${reasons[0]} · ${reasons.slice(1).join(" · ")} 사례입니다.`;
}

export function recommendConstructionCases(
  input: CaseRecommendInput,
  pool: ConstructionCase[],
  limit = TOP_N,
): RecommendedConstructionCase[] {
  const site = buildSiteProfile(input);

  return pool
    .map((item) => {
      const scores = scoreCase(site, item);
      return {
        ...item,
        recommendReason: buildRecommendReason(site, item, scores),
        _score: scores.total,
      };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...item }) => item);
}
