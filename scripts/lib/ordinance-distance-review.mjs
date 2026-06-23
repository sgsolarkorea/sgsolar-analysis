/**
 * Step 6.7c — Long-distance (≥1000m) and urban/metro review policy.
 */

const SOLAR_DIRECT_KEYWORDS = /태양광|태양\s*에너지|신재생\s*에?너지|신재생|태양에너지/i;

export const LONG_DISTANCE_THRESHOLD_M = 1000;

export const NON_SOLAR_FACILITY_RE =
  /고형연료|소각(?:시설|장)?|폐기물|자원순환|위험(?:물|시설)|장례|축사|도축|묘지|폐차|고물|물류시설|창고시설|액화가스|유해물질|규모초과\s*시설|화장|납골/i;

export const URBAN_METRO_SIDOS = new Set([
  "서울특별시",
  "인천광역시",
  "부산광역시",
  "대구광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "경기도",
]);

export const URBAN_REGION_NOTICE =
  "해당 지역은 도시지역 특성상 이격거리보다 개발행위허가, 건축물 설치 가능 여부, 계통 접속 검토가 중요합니다. 조례 원문 검토 후 반영됩니다.";

export const LONG_DISTANCE_REVIEW_REASON =
  "1000m 이상 거리값은 태양광 이격거리 기준 여부 수동 검토 필요";

const DISTANCE_KEYS = ["building", "residential", "road", "river", "school", "cultural"];

export function isUrbanMetroRegion(sido, _sigungu) {
  return URBAN_METRO_SIDOS.has(sido);
}

function emptyDistances() {
  return Object.fromEntries(DISTANCE_KEYS.map((k) => [k, null]));
}

function classifyLongDistanceMatch(match) {
  const sentence = match.sentence ?? "";
  const hasDirectSolar = SOLAR_DIRECT_KEYWORDS.test(sentence);
  const isOtherFacility = NON_SOLAR_FACILITY_RE.test(sentence);

  if (isOtherFacility) {
    return {
      action: "exclude",
      reason: "non_solar_facility_permit_rule",
      suspectDistanceReason: "물류·창고·폐기물·위험시설 등 태양광 외 시설 허가기준",
    };
  }
  if (!hasDirectSolar) {
    return {
      action: "exclude",
      reason: "long_distance_without_solar_keyword",
      suspectDistanceReason: "1000m 이상이나 태양광/신재생에너지 직접 언급 없음",
    };
  }
  return {
    action: "manual_review",
    reason: "long_distance_solar_requires_manual_review",
    suspectDistanceReason: "태양광 직접 조항이나 1000m 이상 — 자동 확정 불가",
  };
}

function capMatchConfidence(confidence, distanceM) {
  if (distanceM >= LONG_DISTANCE_THRESHOLD_M && confidence === "high") {
    return "medium";
  }
  return confidence;
}

/**
 * Apply 1000m+ and urban/metro policies to parser output.
 */
export function applyDistanceReviewPolicy(parsed, { sido, sigungu } = {}) {
  const urbanMetro = isUrbanMetroRegion(sido, sigungu);
  const manualReviewCandidates = [];
  const excludedSections = [...(parsed.excludedSections ?? [])];
  const confirmedMatches = [];
  const confirmedDistances = emptyDistances();
  const rawMatchedText = [...(parsed.matchedText ?? [])];

  for (const match of parsed.allMatches ?? []) {
    const distanceM = match.distanceM;
    if (distanceM == null) continue;

    let matchConfidence = match.matchConfidence ?? "medium";
    if (distanceM >= LONG_DISTANCE_THRESHOLD_M && matchConfidence === "high") {
      matchConfidence = "medium";
    }

    if (distanceM >= LONG_DISTANCE_THRESHOLD_M) {
      const verdict = classifyLongDistanceMatch(match);
      const candidate = {
        category: match.category,
        label: match.label,
        distanceM,
        sentence: match.sentence,
        reason: verdict.reason,
        suspectDistanceReason: verdict.suspectDistanceReason,
        matchConfidence,
      };

      if (verdict.action === "exclude") {
        excludedSections.push({
          type: "distance_match",
          title: match.label ?? match.category,
          articleNumber: null,
          reason: verdict.reason,
          matchCount: 1,
          distanceM,
          sentence: match.sentence?.slice(0, 240),
        });
        manualReviewCandidates.push(candidate);
        continue;
      }

      manualReviewCandidates.push(candidate);
      continue;
    }

    confirmedMatches.push({ ...match, matchConfidence });
    const prev = confirmedDistances[match.category];
    if (prev == null || distanceM > prev) {
      confirmedDistances[match.category] = distanceM;
    }
  }

  let extractedDistances = { ...confirmedDistances };
  let requiresManualReview = manualReviewCandidates.length > 0;
  let reviewReason = requiresManualReview ? LONG_DISTANCE_REVIEW_REASON : undefined;
  let suspectDistanceReason = manualReviewCandidates[0]?.suspectDistanceReason;
  let distanceExtractionMethod = parsed.distanceExtractionMethod ?? "xml";
  let urbanRegionNotice;

  if (urbanMetro && requiresManualReview) {
    extractedDistances = emptyDistances();
    distanceExtractionMethod = "xml_manual_review";
    urbanRegionNotice = URBAN_REGION_NOTICE;
  } else if (urbanMetro && parsed.distanceCount > 0) {
    const hasOnlyUncertain =
      confirmedMatches.length === 0 && (parsed.allMatches?.length ?? 0) > 0;
    if (hasOnlyUncertain) {
      extractedDistances = emptyDistances();
      requiresManualReview = true;
      reviewReason = LONG_DISTANCE_REVIEW_REASON;
      distanceExtractionMethod = "xml_manual_review";
      urbanRegionNotice = URBAN_REGION_NOTICE;
    }
  }

  if (
    requiresManualReview &&
    confirmedMatches.every((m) => m.matchConfidence !== "high") &&
    manualReviewCandidates.some((c) => c.distanceM >= LONG_DISTANCE_THRESHOLD_M)
  ) {
    distanceExtractionMethod =
      distanceExtractionMethod === "xml" ? "xml_manual_review" : distanceExtractionMethod;
  }

  const distanceCount = Object.values(extractedDistances).filter((v) => v != null).length;
  const reviewMatches = [...confirmedMatches];

  let parserConfidence = parsed.parserConfidence;
  if (requiresManualReview || manualReviewCandidates.length > 0) {
    if (parserConfidence === "high") parserConfidence = "medium";
    if (distanceCount === 0 && requiresManualReview) {
      parserConfidence = urbanMetro ? "low" : "medium";
    }
  }
  if (manualReviewCandidates.some((c) => c.distanceM >= LONG_DISTANCE_THRESHOLD_M)) {
    parserConfidence = parserConfidence === "high" ? "medium" : parserConfidence;
  }

  const matchedText =
    distanceCount > 0
      ? [...new Set(reviewMatches.map((m) => m.sentence))].slice(0, 12)
      : rawMatchedText.slice(0, 12);

  return {
    ...parsed,
    extractedDistances,
    matchedText,
    excludedSections,
    manualReviewCandidates,
    requiresManualReview,
    reviewReason,
    suspectDistanceReason,
    urbanRegionNotice,
    distanceExtractionMethod,
    distanceCount,
    parserConfidence,
    allMatches: reviewMatches,
    isUrbanMetro: urbanMetro,
  };
}

export function summarizeReviewStats(candidates) {
  let manualReviewCount = 0;
  let longDistanceExcluded = 0;
  let urbanMetroCount = 0;

  for (const c of candidates) {
    if (c.requiresManualReview) manualReviewCount += 1;
    if (c.isUrbanMetro) urbanMetroCount += 1;
    longDistanceExcluded += (c.excludedSections ?? []).filter(
      (s) =>
        s.reason === "long_distance_without_solar_keyword" ||
        s.reason === "non_solar_facility_permit_rule",
    ).length;
  }

  return { manualReviewCount, longDistanceExcluded, urbanMetroCount };
}
