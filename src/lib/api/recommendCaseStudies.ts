import type { InstallTypeOption } from "@/data/resultUx";
import {
  publishedCaseStudies,
  type CaseStudy,
  type RecommendedCaseStudy,
} from "@/data/caseStudies";

const TOP_N = 3;

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

const CITY_PATTERN = /([가-힣]+(?:시|군|구))(?:\s|$)/;

export interface CaseStudyMatchInput {
  installType: InstallTypeOption;
  capacityKw: number;
  address?: string;
  jibunAddress?: string;
  province?: string;
  city?: string;
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

function resolveSiteRegion(input: CaseStudyMatchInput): { province: string; city: string } {
  const searchText = `${input.address ?? ""} ${input.jibunAddress ?? ""}`.trim();
  return {
    province: input.province ?? extractProvince(searchText),
    city: input.city ?? extractCity(searchText),
  };
}

function scoreCapacity(siteKw: number, caseKw: number): number {
  if (siteKw <= 0 || caseKw <= 0) return 0.3;
  const ratio = Math.min(siteKw, caseKw) / Math.max(siteKw, caseKw);
  if (ratio >= 0.7) return 1;
  if (ratio >= 0.4) return 0.75;
  if (ratio >= 0.2) return 0.5;
  return 0.25;
}

function scoreRegion(
  site: { province: string; city: string },
  item: CaseStudy,
): number {
  if (!site.province) return 0.3;
  if (site.province === item.province) {
    if (site.city && item.city && site.city === item.city) return 1;
    if (site.city && item.city) return 0.75;
    return 0.85;
  }
  return 0.2;
}

function buildRecommendReason(
  site: { province: string; city: string },
  item: CaseStudy,
  scores: { capacity: number; region: number },
): string {
  const parts: string[] = [];

  if (scores.region >= 0.75 && site.city && item.city && site.city === item.city) {
    parts.push(`${item.city} ${item.installCategory}`);
  } else if (scores.region >= 0.5 && item.province) {
    parts.push(`${item.province}권 ${item.installCategory}`);
  } else {
    parts.push(`${item.installCategory} 시공사례`);
  }

  if (scores.capacity >= 0.7) {
    parts.push(`${item.capacityLabel} 용량대`);
  } else if (scores.capacity >= 0.4) {
    parts.push("유사 용량대");
  }

  if (item.featured) {
    parts.push("대표 사례");
  }

  return `${parts.join(" · ")} 참고`;
}

interface ScoredCaseStudy extends RecommendedCaseStudy {
  _total: number;
}

/**
 * CS-1 매칭 v1 — installType → capacity → region → featured
 * @see docs/CAPACITY_POLICY.md (시공사례는 별도 CS 단계)
 */
export function recommendCaseStudies(
  input: CaseStudyMatchInput,
  pool: CaseStudy[] = publishedCaseStudies,
  limit = TOP_N,
): RecommendedCaseStudy[] {
  const site = resolveSiteRegion(input);
  const siteKw = input.capacityKw > 0 ? input.capacityKw : 100;

  const sameType = pool.filter((item) => item.installType === input.installType);

  const ranked: ScoredCaseStudy[] = sameType
    .map((item) => {
      const capacity = scoreCapacity(siteKw, item.capacityKw);
      const region = scoreRegion(site, item);
      const featuredBoost = item.featured ? 0.05 : 0;
      const total = capacity * 0.45 + region * 0.4 + featuredBoost;
      return {
        ...item,
        recommendReason: buildRecommendReason(site, item, { capacity, region }),
        _total: total,
      };
    })
    .sort((a, b) => b._total - a._total);

  let selected = ranked.slice(0, limit);

  if (selected.length < limit) {
    const pickedIds = new Set(selected.map((item) => item.id));
    const featuredFallback = pool
      .filter((item) => item.featured && item.published && !pickedIds.has(item.id))
      .map((item) => ({
        ...item,
        recommendReason: `${item.installCategory} 대표 시공사례`,
        _total: 0,
      }));
    selected = [...selected, ...featuredFallback].slice(0, limit);
  }

  return selected.map(({ _total: _ignored, ...item }) => item);
}
