import type {
  OrdinanceDisplayCard,
  OrdinanceDisplayPolicy,
  ParsedDistanceSet,
  ParsedOrdinanceCandidate,
  UrbanOrdinanceNotice,
} from "@/types/regulatoryReview";
export const METRO_URBAN_SIDOS = new Set(["서울특별시", "경기도", "인천광역시"]);

export const URBAN_REVIEW_NOTICE: UrbanOrdinanceNotice = {
  status: "urban_review_required",
  title: "수도권 도시지역 검토",
  paragraphs: [
    "해당 지역은 도시지역 특성상 일반 농촌형 태양광 이격거리 기준보다 개발행위허가, 건축물 설치 가능 여부, 경관·민원, 계통 접속 검토가 우선됩니다.",
    "세부 기준은 관할 지자체 조례와 인허가 검토를 통해 확인해야 합니다.",
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

const SCHOOL_EVIDENCE_RE =
  /학교(?:보건법|부지|경계)?|교육시설|교육환경보호|유치원|어린이집|유아교육법|영유아보육법|초등학교|중학교|고등학교/i;

const QUALITATIVE_BY_KEY: Record<keyof ParsedDistanceSet, string> = {
  building: "건축물·인접시설 이격 기준",
  residential: "주거밀집지역 이격 기준",
  road: "도로 경계 이격 기준",
  river: "하천 경계 이격 기준",
  school: "학교·교육시설 이격 기준",
  cultural: "문화재 등 보전시설 주변 검토",
};

const DEFAULT_QUALITATIVE_BULLETS = [
  "도로 경계 이격 기준",
  "주거밀집지역 이격 기준",
  "문화재 등 보전시설 주변 검토",
  "경사도 기준 검토",
  "완충공간 및 차폐시설 검토",
];

export function isMetroUrbanSido(sido: string | null | undefined): boolean {
  return sido != null && METRO_URBAN_SIDOS.has(sido);
}

function ordinanceCorpus(candidate: ParsedOrdinanceCandidate): string {
  return [
    ...(candidate.matchedText ?? []),
    ...(candidate.matchedSections?.map((s) => s.title) ?? []),
    ...(candidate.appendixMatchedText ?? []),
    candidate.notes ?? "",
  ].join("\n");
}

/** 조례 원문에 학교/교육시설 직접 근거가 있는지 (소각·고형연료·문화재 병기 문맥 제외) */
export function candidateHasSchoolOrdinanceEvidence(candidate: ParsedOrdinanceCandidate): boolean {
  const texts = [
    ...(candidate.matchedText ?? []),
    ...(candidate.matchedSections?.map((s) => s.title) ?? []),
    ...(candidate.appendixMatchedText ?? []),
  ];

  for (const text of texts) {
    if (/소각|고형연료|폐기물|자원순환/i.test(text)) continue;

    if (/학교보건법|유아교육법|영유아보육법|교육환경보호/i.test(text)) {
      return true;
    }

    if (!/학교|교육시설|어린이집|유치원/i.test(text)) continue;

    // 문화재·국가유산·도서관 등과 병기된 공공건축물 목록은 학교 전용 기준 아님
    if (/국가유산|문화|한옥|도서관|공공건축물\s*\(\s*학교/i.test(text)) {
      continue;
    }

    if (/학교.*(?:부지|경계).*\d+\s*미터|\d+\s*미터.*학교/i.test(text)) {
      return true;
    }
  }
  return false;
}

function filterDistancesForDisplay(
  candidate: ParsedOrdinanceCandidate,
): ParsedDistanceSet {
  const distances = { ...candidate.extractedDistances };
  const corpus = ordinanceCorpus(candidate);

  if (
    distances.building != null &&
    /국가유산|문화|한옥|보전|공공건축물/i.test(corpus) &&
    distances.cultural == null
  ) {
    distances.cultural = distances.building;
    distances.building = null;
  }

  const showSchool = candidateHasSchoolOrdinanceEvidence(candidate);
  if (!showSchool) {
    distances.school = null;
  }
  return distances;
}

function hasDisplayableDistances(candidate: ParsedOrdinanceCandidate): boolean {
  return Object.values(filterDistancesForDisplay(candidate)).some((v) => v != null);
}

/** 1000m+ 소각/고형연료 등만 manual review인 경우 — 확인된 sub-1000m 거리는 표시 허용 */
export function isPartialManualReviewOnly(candidate: ParsedOrdinanceCandidate): boolean {
  if (!candidate.requiresManualReview) return false;
  if (!hasDisplayableDistances(candidate)) return false;

  const manualCandidates = candidate.manualReviewCandidates ?? [];
  if (manualCandidates.length === 0) return false;

  return manualCandidates.every(
    (c) =>
      c.distanceM >= 1000 ||
      c.reason === "non_solar_facility_permit_rule" ||
      c.reason === "long_distance_without_solar_keyword",
  );
}

export function resolveUrbanPolicy(input: {
  sido: string | null;
  candidate?: ParsedOrdinanceCandidate | null;
}): OrdinanceDisplayPolicy {
  const isUrbanMetro = input.candidate?.isUrbanMetro ?? isMetroUrbanSido(input.sido);
  const includeSchoolSetback = input.candidate
    ? candidateHasSchoolOrdinanceEvidence(input.candidate)
    : false;

  if (isUrbanMetro) {
    return {
      isUrbanMetro: true,
      hideSetbackDistances: true,
      hideOrdinanceDistances: true,
      includeSchoolSetback: false,
      displayStatus: "urban_review_required",
      urbanNotice: URBAN_REVIEW_NOTICE,
    };
  }

  if (input.candidate?.requiresManualReview && !isPartialManualReviewOnly(input.candidate)) {
    return {
      isUrbanMetro: false,
      hideSetbackDistances: false,
      hideOrdinanceDistances: true,
      includeSchoolSetback,
      displayStatus: "manual_review",
      reviewReason: input.candidate.reviewReason,
    };
  }

  return {
    isUrbanMetro: false,
    hideSetbackDistances: false,
    hideOrdinanceDistances: false,
    includeSchoolSetback,
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

/** UI 표시용 — 개발행위허가 조문은 통일된 명칭 사용 */
export function normalizePermitArticleTitle(title: string): string {
  const sanitized = sanitizeArticleTitle(title);
  if (/개발행위허가|허가\s*기준|허가기준/i.test(sanitized)) {
    return "개발행위허가의 기준";
  }
  if (/태양|발전|신재생|에너지/i.test(sanitized) && /기준|허가/i.test(sanitized)) {
    return "개발행위허가의 기준";
  }
  return sanitized;
}

function resolvePrimaryArticleTitle(candidate: ParsedOrdinanceCandidate): string {
  const permitSection = candidate.matchedSections?.find(
    (s) => s.type === "article" && /개발행위허가|허가\s*기준|허가기준/i.test(s.title),
  );
  if (permitSection?.title) return normalizePermitArticleTitle(permitSection.title);

  const solarSection = candidate.matchedSections?.find(
    (s) =>
      s.type === "article" &&
      /태양|발전|신재생|에너지/i.test(s.title),
  );
  if (solarSection?.title) return normalizePermitArticleTitle(solarSection.title);

  return "개발행위허가의 기준";
}

function resolveAppendixTitle(candidate: ParsedOrdinanceCandidate): string | undefined {
  const solarAppendix = candidate.appendixRefs?.find((a) =>
    /태양|발전|이격/i.test(a.title),
  );
  if (!solarAppendix?.title) return undefined;
  return sanitizeArticleTitle(solarAppendix.title);
}

function isDistanceVerified(
  candidate: ParsedOrdinanceCandidate,
  key: keyof ParsedDistanceSet,
  value: number,
): boolean {
  if (value >= 1000) return false;

  if (
    candidate.appendixParseSuccess &&
    candidate.distanceExtractionMethod === "hwp" &&
    candidate.parseStats?.distanceCount
  ) {
    return true;
  }

  const confidence = candidate.parserConfidence;
  if (confidence === "low" || confidence === "none") return false;

  const corpus = ordinanceCorpus(candidate);
  const label = DISTANCE_LABELS[key];
  const hasCategoryMention =
    corpus.includes(`${value}`) ||
    corpus.includes(`${value.toLocaleString("ko-KR")}`) ||
    new RegExp(`${label}|${key === "residential" ? "주거|취락|가구" : ""}|${key === "cultural" ? "문화|유산|한옥|보전" : ""}`, "i").test(
      corpus,
    );

  if (confidence === "high" && hasCategoryMention) return true;
  if (confidence === "medium" && hasCategoryMention && candidate.parseStats?.distanceCount) {
    return true;
  }

  return false;
}

function inferCulturalDistanceM(candidate: ParsedOrdinanceCandidate): number | null {
  if (candidate.extractedDistances.cultural != null) {
    return candidate.extractedDistances.cultural;
  }
  for (const text of candidate.matchedText ?? []) {
    if (/국가유산|문화|한옥|보전/i.test(text)) {
      const match = text.match(/(\d+)\s*미터/);
      if (match) return Number(match[1]);
    }
  }
  return null;
}

function buildVerifiedNumericBullets(
  candidate: ParsedOrdinanceCandidate,
): string[] {
  const distances = filterDistancesForDisplay(candidate);
  const bullets: string[] = [];

  for (const key of Object.keys(DISTANCE_LABELS) as Array<keyof ParsedDistanceSet>) {
    const value = distances[key];
    if (value == null) continue;

    if (key === "cultural" && distances.cultural == null) {
      const inferred = inferCulturalDistanceM(candidate);
      if (inferred != null && isDistanceVerified(candidate, "cultural", inferred)) {
        bullets.push(`문화재 ${inferred}m`);
      }
      continue;
    }

    if (isDistanceVerified(candidate, key, value)) {
      bullets.push(`${DISTANCE_LABELS[key]} ${value}m`);
    }
  }

  return bullets;
}

function buildQualitativeBullets(candidate: ParsedOrdinanceCandidate): string[] {
  const corpus = ordinanceCorpus(candidate);
  const bullets: string[] = [];

  for (const key of Object.keys(QUALITATIVE_BY_KEY) as Array<keyof ParsedDistanceSet>) {
    if (key === "school" && !candidateHasSchoolOrdinanceEvidence(candidate)) continue;

    const patterns: Record<keyof ParsedDistanceSet, RegExp> = {
      building: /건축|건물|공공건축/i,
      residential: /주거|취락|가구|세대/i,
      road: /도로/i,
      river: /하천|수계/i,
      school: SCHOOL_EVIDENCE_RE,
      cultural: /문화|유산|한옥|보전|공원/i,
    };

    if (patterns[key].test(corpus) || candidate.extractedDistances[key] != null) {
      bullets.push(QUALITATIVE_BY_KEY[key]);
    }
  }

  for (const text of candidate.matchedText ?? []) {
    const slope = text.match(SLOPE_RE);
    if (slope && !bullets.includes(`경사도 ${slope[1]}도 미만`)) {
      bullets.push(`경사도 ${slope[1]}도 미만`);
    }
    if (/표고\s*\d+/i.test(text) && !bullets.some((b) => b.includes("경사"))) {
      bullets.push("경사도 기준 검토");
    }
  }

  if (/완충|차폐|피뢰/i.test(corpus)) {
    bullets.push("완충공간 및 차폐시설 검토");
  }

  if (bullets.length === 0) {
    return DEFAULT_QUALITATIVE_BULLETS.slice(0, 5);
  }

  if (!bullets.includes("경사도 기준 검토") && !bullets.some((b) => b.startsWith("경사도"))) {
    bullets.push("경사도 기준 검토");
  }
  if (!bullets.some((b) => b.includes("완충") || b.includes("차폐"))) {
    bullets.push("완충공간 및 차폐시설 검토");
  }

  return [...new Set(bullets)].slice(0, 8);
}

function buildSummaryBullets(
  candidate: ParsedOrdinanceCandidate,
  policy: OrdinanceDisplayPolicy,
): string[] {
  if (policy.hideOrdinanceDistances) return [];

  const verified = buildVerifiedNumericBullets(candidate);
  if (verified.length > 0) {
    const qualitative = buildQualitativeBullets(candidate).filter(
      (q) => !verified.some((v) => q.startsWith(v.split(" ")[0])),
    );
    return [...new Set([...verified, ...qualitative])].slice(0, 8);
  }

  return buildQualitativeBullets(candidate);
}

function resolveSourceOriginLabel(origin?: string, url?: string): string {
  if (origin === "elis.go.kr" || url?.includes("elis") || url?.includes("ELIS")) {
    return "elis.go.kr";
  }
  if (origin === "law.go.kr" || url?.includes("law.go.kr")) return "law.go.kr";
  if (origin === "municipal") return "지자체 공식";
  return "law.go.kr";
}

function resolveSourceUrl(candidate: ParsedOrdinanceCandidate): string {
  return candidate.sourceUrl;
}

export function buildOrdinanceDisplayCards(
  candidate: ParsedOrdinanceCandidate,
  policy: OrdinanceDisplayPolicy,
): OrdinanceDisplayCard[] {
  const sourceUrl = resolveSourceUrl(candidate);
  const sourceOriginLabel = resolveSourceOriginLabel(candidate.sourceOrigin, sourceUrl);
  const summaryBullets = buildSummaryBullets(candidate, policy);
  const ordinanceName = candidate.ordinanceName.includes("도시계획")
    ? candidate.ordinanceName
    : `${candidate.municipalityLabel} 도시계획 조례`;

  return [
    {
      id: candidate.regionKey,
      ordinanceName,
      articleTitle: resolvePrimaryArticleTitle(candidate),
      appendixTitle: resolveAppendixTitle(candidate),
      summaryBullets,
      sourceUrl,
      sourceOriginLabel,
      parserConfidence: candidate.parserConfidence,
      showDistances: summaryBullets.length > 0,
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
    articleTitle: normalizePermitArticleTitle(input.articleTitle),
    appendixTitle: input.appendixTitle
      ? sanitizeArticleTitle(input.appendixTitle)
      : undefined,
    summaryBullets: input.summaryBullets,
    sourceUrl: input.sourceUrl ?? "",
    sourceOriginLabel: "law.go.kr",
    showDistances: input.summaryBullets.length > 0,
  };
}
