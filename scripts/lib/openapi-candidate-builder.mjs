/**
 * Step 6.10 — build parsed_candidates entry from Open API fetch results
 */
import { parseOrdinanceDistances } from "./ordinance-distance-parser.mjs";
import { LONG_DISTANCE_REVIEW_REASON } from "./ordinance-distance-review.mjs";
import {
  extractAppendixReferencesFromArticles,
  findSolarRelatedArticles,
} from "./local-ordinance-body-parser.mjs";
import {
  filterSolarAppendixCandidates,
  toAppendixRefs,
} from "./local-ordinance-appendix-parser.mjs";

export function buildOpenApiCandidate({
  regionKey,
  entry,
  ordinanceName,
  listItem,
  bodyLoaded,
  appendixItems = [],
  collectionMeta = {},
}) {
  const base = {
    regionKey,
    municipalityLabel: entry.municipalityLabel ?? entry.sigungu,
    sido: entry.sido,
    sigungu: entry.sigungu,
    ordinanceName: bodyLoaded.ordinanceName || ordinanceName,
    sourceUrl: bodyLoaded.sourceUrl,
    sourceType: "ordinance",
    sourceOrigin: collectionMeta.hasOfficialApiKey ? "openapi.law.go.kr" : "law.go.kr",
    sourceCollectionMethod: "openapi",
    openapiMst: listItem?.mst ?? bodyLoaded.ordinSeq,
    openapiListReference: collectionMeta.listReference ?? null,
    openapiBodyReference: bodyLoaded.openapiBodyReference ?? null,
    openapiAppendixReference: collectionMeta.appendixReference ?? null,
    openapiFetchModes: {
      list: collectionMeta.listMode ?? null,
      body: bodyLoaded.openapiBodyMode ?? null,
      appendix: collectionMeta.appendixMode ?? null,
    },
    extractedDistances: {
      building: null,
      residential: null,
      road: null,
      river: null,
      school: null,
      cultural: null,
    },
    matchedText: [],
    parserConfidence: "none",
    parsedAt: new Date().toISOString().slice(0, 10),
  };

  const parsed = parseOrdinanceDistances(bodyLoaded, {
    sido: entry.sido,
    sigungu: entry.sigungu,
  });

  const solarArticles = findSolarRelatedArticles(bodyLoaded.articles ?? []);
  const appendixRefsFromBody = extractAppendixReferencesFromArticles(bodyLoaded.articles ?? []);
  const filteredAppendix = filterSolarAppendixCandidates(appendixItems, {
    sigungu: entry.sigungu,
    relatedMst: listItem?.mst,
  });
  const openapiAppendixRefs = toAppendixRefs(filteredAppendix);

  const mergedAppendixRefs = [...(parsed.appendixRefs ?? [])];
  for (const ref of openapiAppendixRefs) {
    if (!mergedAppendixRefs.some((existing) => existing.title === ref.title)) {
      mergedAppendixRefs.push(ref);
    }
  }

  let notes = `Step 6.10 Open API 수집 (${collectionMeta.listMode ?? "unknown"})`;
  if (collectionMeta.fallbackUsed) {
    notes += " — official OC 미설정 또는 검증 실패, DRF fallback 사용";
  }
  if (parsed.requiresManualReview) {
    notes = `${parsed.reviewReason ?? LONG_DISTANCE_REVIEW_REASON} — ${notes}`;
  } else if (parsed.excludedSections?.length) {
    notes =
      "제16조의4 등 발전시설 등 일반 허가기준(1000m)은 태양광 전용 이격 아님 — 별표 또는 manual_review 필요";
  } else if (parsed.parserConfidence === "low") {
    notes =
      "태양광 관련 조문/별표 참조 확인 — 별표 본문 HWP 추가 파싱 필요";
  } else if (parsed.distanceCount === 0 && parsed.solarArticleCount > 0) {
    notes = "태양광 관련 조문은 있으나 구조화된 이격거리 수치 미추출";
  }

  const distanceExtractionMethod =
    collectionMeta.hasOfficialApiKey && bodyLoaded.openapiBodyMode === "openapi_xml"
      ? "openapi_xml"
      : parsed.distanceExtractionMethod ?? "xml";

  return {
    ...base,
    extractedDistances: parsed.extractedDistances,
    matchedText: parsed.matchedText,
    matchedSections: parsed.matchedSections,
    excludedSections: parsed.excludedSections,
    manualReviewCandidates: parsed.manualReviewCandidates,
    requiresManualReview: parsed.requiresManualReview ?? false,
    reviewReason: parsed.reviewReason,
    suspectDistanceReason: parsed.suspectDistanceReason,
    urbanRegionNotice: parsed.urbanRegionNotice,
    isUrbanMetro: parsed.isUrbanMetro ?? false,
    appendixRefs: mergedAppendixRefs,
    parserConfidence: parsed.parserConfidence,
    distanceExtractionMethod,
    appendixSourceUrl: openapiAppendixRefs[0]?.hwpUrl ?? null,
    appendixFileType: openapiAppendixRefs[0]?.hwpUrl ? "hwp" : null,
    appendixParseSuccess: false,
    appendixMatchedText: [],
    parseStats: {
      solarArticleCount: parsed.solarArticleCount ?? solarArticles.length,
      distanceCount: parsed.distanceCount ?? 0,
      appendixCount: mergedAppendixRefs.length,
      manualReviewCount: parsed.manualReviewCandidates?.length ?? 0,
      openapiAppendixCandidates: filteredAppendix.length,
      bodyArticleCount: bodyLoaded.articles?.length ?? 0,
      bodyAppendixInlineCount: bodyLoaded.appendices?.length ?? 0,
      appendixRefsFromBody: appendixRefsFromBody.length,
    },
    notes,
  };
}
