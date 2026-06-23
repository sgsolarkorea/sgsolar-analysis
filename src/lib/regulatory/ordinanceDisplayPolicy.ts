import type {
  OrdinanceDisplayCard,
  OrdinanceDisplayPolicy,
  ParsedDistanceSet,
  ParsedOrdinanceCandidate,
  UrbanOrdinanceNotice,
} from "@/types/regulatoryReview";

/** Step 6.8 — 수도권 표기 정책 (서울·경기·인천) */
export const METRO_URBAN_SIDOS = new Set(["서울특별시", "경기도", "인천광역시"]);

export const URBAN_REVIEW_NOTICE: UrbanOrdinanceNotice = {
  status: "urban_review_required",
  title: "수도권 도시지역 검토",
  paragraphs: [
    "해당 지역은 일반 농촌형 태양광 이격거리 기준보다",
    "개발행위허가, 건축물 설치 가능 여부,",
    "계통 접속 가능 여부 검토가 우선됩니다.",
    "세부 기준은 관할 지자체 조례 및 인허가 검토 후 확정됩니다.",
  ],
};

const DISTANCE_LABELS: Record<keyof ParsedDistanceSet, string> = {
  building: "건축물",
  residential: "주거지",
  road: "도로",
  river: "하천",
  school: "학교",
  cultural: "문화재",
};

const SLOPE_RE = /경사(?:도)?\s*(\d+)\s*도\s*(?:미만|이하|이내)/i;

export function isMetroUrbanSido(sido: string | null | undefined): boolean {
  return sido != null && METRO_URBAN_SIDOS.has(sido);
}

export function resolveUrbanPolicy(input: {
  sido: string | null;
  candidate?: ParsedOrdinanceCandidate | null;
}): OrdinanceDisplayPolicy {
  const isUrbanMetro = input.candidate?.isUrbanMetro ?? isMetroUrbanSido(input.sido);

  if (isUrbanMetro) {
    return {
      isUrbanMetro: true,
      hideSetbackDistances: true,
      hideOrdinanceDistances: true,
      displayStatus: "urban_review_required",
      urbanNotice: URBAN_REVIEW_NOTICE,
    };
  }

  if (input.candidate?.requiresManualReview) {
    return {
      isUrbanMetro: false,
      hideSetbackDistances: false,
      hideOrdinanceDistances: true,
      displayStatus: "manual_review",
      reviewReason: input.candidate.reviewReason,
    };
  }

  return {
    isUrbanMetro: false,
    hideSetbackDistances: false,
    hideOrdinanceDistances: false,
    displayStatus: input.candidate ? "candidate" : "preparing",
  };
}

/** 조 번호·별표 번호는 UI에서 제거, 조문명만 표시 */
export function sanitizeArticleTitle(title: string): string {
  const parenMatch = title.match(/제\d+조(?:의\d+)?\s*\(([^)]+)\)/);
  if (parenMatch?.[1]) return parenMatch[1].trim();

  return title
    .replace(/^제\d+조(?:의\d+)?\s*/u, "")
    .replace(/^\[별표\s*\d+\]\s*/u, "")
    .replace(/^별표\s*\d+\s*/u, "")
    .trim();
}

function bulletsFromDistances(distances: ParsedDistanceSet): string[] {
  return (Object.keys(DISTANCE_LABELS) as Array<keyof ParsedDistanceSet>)
    .filter((key) => distances[key] != null)
    .map((key) => `${DISTANCE_LABELS[key]} ${distances[key]}m`);
}

function bulletsFromMatchedText(texts: string[]): string[] {
  const bullets: string[] = [];
  for (const text of texts) {
    const slope = text.match(SLOPE_RE);
    if (slope) {
      bullets.push(`경사도 ${slope[1]}도 미만`);
    }
  }
  return bullets;
}

function resolveSourceOriginLabel(origin?: string, url?: string): string {
  if (origin === "elis.go.kr" || url?.includes("elis")) return "elis.go.kr";
  if (origin === "law.go.kr" || url?.includes("law.go.kr")) return "law.go.kr";
  if (origin === "municipal") return "지자체 공식";
  return "law.go.kr";
}

function resolvePrimaryArticleTitle(candidate: ParsedOrdinanceCandidate): string {
  const solarSection = candidate.matchedSections?.find(
    (s) =>
      s.type === "article" &&
      /태양|발전|신재생|에너지/i.test(s.title),
  );
  if (solarSection?.title) return sanitizeArticleTitle(solarSection.title);

  const firstArticle = candidate.matchedSections?.find((s) => s.type === "article");
  if (firstArticle?.title) return sanitizeArticleTitle(firstArticle.title);

  const solarAppendix = candidate.appendixRefs?.find((a) =>
    /태양|발전/i.test(a.title),
  );
  if (solarAppendix?.title) return sanitizeArticleTitle(solarAppendix.title);

  return "개발행위허가의 기준";
}

function resolveAppendixTitle(candidate: ParsedOrdinanceCandidate): string | undefined {
  const solarAppendix = candidate.appendixRefs?.find((a) =>
    /태양|발전|이격/i.test(a.title),
  );
  if (!solarAppendix?.title) return undefined;
  return sanitizeArticleTitle(solarAppendix.title);
}

export function buildOrdinanceDisplayCards(
  candidate: ParsedOrdinanceCandidate,
  policy: OrdinanceDisplayPolicy,
): OrdinanceDisplayCard[] {
  const sourceUrl = candidate.appendixSourceUrl ?? candidate.sourceUrl;
  const sourceOriginLabel = resolveSourceOriginLabel(candidate.sourceOrigin, sourceUrl);

  if (policy.hideOrdinanceDistances) {
    return [
      {
        id: candidate.regionKey,
        ordinanceName: candidate.ordinanceName,
        articleTitle: resolvePrimaryArticleTitle(candidate),
        appendixTitle: resolveAppendixTitle(candidate),
        summaryBullets: [],
        sourceUrl,
        sourceOriginLabel,
        parserConfidence: candidate.parserConfidence,
        showDistances: false,
      },
    ];
  }

  const summaryBullets = [
    ...bulletsFromDistances(candidate.extractedDistances),
    ...bulletsFromMatchedText(candidate.matchedText ?? []),
  ];

  const uniqueBullets = [...new Set(summaryBullets)].slice(0, 8);

  return [
    {
      id: candidate.regionKey,
      ordinanceName: candidate.ordinanceName,
      articleTitle: resolvePrimaryArticleTitle(candidate),
      appendixTitle: resolveAppendixTitle(candidate),
      summaryBullets: uniqueBullets,
      sourceUrl,
      sourceOriginLabel,
      parserConfidence: candidate.parserConfidence,
      showDistances: uniqueBullets.length > 0,
    },
  ];
}

export function buildLegacyCardFromStatic(input: {
  slug: string;
  ordinanceTitle: string;
  articleTitle: string;
  appendixTitle?: string;
  summaryBullets: string[];
  sourceUrl?: string;
}): OrdinanceDisplayCard {
  return {
    id: input.slug,
    ordinanceName: input.ordinanceTitle,
    articleTitle: sanitizeArticleTitle(input.articleTitle),
    appendixTitle: input.appendixTitle
      ? sanitizeArticleTitle(input.appendixTitle)
      : undefined,
    summaryBullets: input.summaryBullets,
    sourceUrl: input.sourceUrl ?? "",
    sourceOriginLabel: "law.go.kr",
    showDistances: input.summaryBullets.length > 0,
  };
}
