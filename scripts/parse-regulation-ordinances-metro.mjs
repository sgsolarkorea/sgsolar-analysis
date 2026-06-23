/**
 * Step 6.7c — 수도권/도시지역 조례 parser QA (1000m+ 거리값 분류)
 *
 * Usage:
 *   node scripts/parse-regulation-ordinances-metro.mjs [--with-appendices]
 *
 * Updates parsed_candidates.json for metro test targets only.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadOfficialOrdinance } from "./lib/ordinance-fetcher.mjs";
import { parseOrdinanceDistances } from "./lib/ordinance-distance-parser.mjs";
import {
  LONG_DISTANCE_REVIEW_REASON,
  summarizeReviewStats,
} from "./lib/ordinance-distance-review.mjs";
import { parseAppendixFile, pickAppendixRefsToTry } from "./lib/appendix-file-parser.mjs";
import { sleep } from "./lib/regulation-source-resolver.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SOURCE_PATH = path.join(ROOT, "src", "data", "regulatory", "regulation-source-registry.json");
const CANDIDATES_PATH = path.join(ROOT, "src", "data", "regulatory", "parsed_candidates.json");
const REPORT_PATH = path.join(ROOT, "src", "data", "regulatory", "metro-parse-report.json");

const METRO_TEST_KEYS = [
  "경기도|평택시",
  "경기도|화성시",
  "경기도|안성시",
  "서울특별시|강남구",
  "인천광역시|남동구",
  "경기도|고양시",
];

const args = new Set(process.argv.slice(2));
const WITH_APPENDICES = args.has("--with-appendices");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, data) {
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function emptyDistances() {
  return {
    building: null,
    residential: null,
    road: null,
    river: null,
    school: null,
    cultural: null,
  };
}

async function tryAppendixEnrichment(candidate) {
  const refs = pickAppendixRefsToTry(candidate.appendixRefs ?? []);
  const hadLongDistanceReview = (candidate.manualReviewCandidates ?? []).some(
    (c) => c.distanceM >= 1000,
  );
  if (!refs.length) return candidate;

  for (const ref of refs.slice(0, 3)) {
    const refLabel = `${ref.title ?? ""} ${ref.hwpUrl ?? ""}`;
    if (!/태양광|태양\s*에너지|신재생|발전시설.*이격|이격거리.*발전/.test(refLabel)) {
      continue;
    }

    const result = await parseAppendixFile(ref);
    if (result.distanceCount > 0 && result.distanceCount <= 6) {
      const allUnder1000 = Object.values(result.extractedDistances ?? {}).every(
        (v) => v == null || v < 1000,
      );
      if (allUnder1000) {
        return {
          ...candidate,
          extractedDistances: result.extractedDistances,
          distanceExtractionMethod: "hwp",
          appendixSourceUrl: result.appendixSourceUrl,
          appendixFileType: result.appendixFileType,
          appendixParseSuccess: true,
          appendixMatchedText: result.matchedText,
          parserConfidence: "medium",
          requiresManualReview: hadLongDistanceReview,
          reviewReason: hadLongDistanceReview
            ? candidate.reviewReason ?? LONG_DISTANCE_REVIEW_REASON
            : undefined,
          parseStats: {
            ...candidate.parseStats,
            distanceCount: result.distanceCount,
          },
          notes: hadLongDistanceReview
            ? `1000m 이상 의심값 제외 후 HWP 태양광 별표 ${result.distanceCount}개 카테고리 추출 — 수동 검토 유지`
            : `HWP 태양광 별표에서 ${result.distanceCount}개 카테고리 거리 추출`,
        };
      }
    }
    await sleep(100);
  }
  return candidate;
}

async function parseMetroRegion(sourceData, regionKey) {
  const entry = sourceData.entries[regionKey];
  if (!entry) {
    return { regionKey, error: "not_in_registry" };
  }
  const ordinance = entry.sources?.find((s) => s.type === "ordinance");
  if (!ordinance?.sourceUrl || ordinance.status !== "source_found") {
    return { regionKey, error: "no_source_found" };
  }

  const loaded = await loadOfficialOrdinance(ordinance.sourceUrl);
  const parsed = parseOrdinanceDistances(loaded, {
    sido: entry.sido,
    sigungu: entry.sigungu,
  });

  let candidate = {
    regionKey,
    municipalityLabel: entry.municipalityLabel ?? entry.sigungu,
    sido: entry.sido,
    sigungu: entry.sigungu,
    ordinanceName: loaded.ordinanceName || ordinance.name,
    sourceUrl: ordinance.sourceUrl,
    sourceType: "ordinance",
    sourceOrigin: ordinance.sourceOrigin ?? "unknown",
    extractedDistances: parsed.extractedDistances,
    matchedText: parsed.matchedText,
    matchedSections: parsed.matchedSections,
    excludedSections: parsed.excludedSections,
    manualReviewCandidates: parsed.manualReviewCandidates ?? [],
    requiresManualReview: parsed.requiresManualReview ?? false,
    reviewReason: parsed.reviewReason,
    suspectDistanceReason: parsed.suspectDistanceReason,
    urbanRegionNotice: parsed.urbanRegionNotice,
    isUrbanMetro: parsed.isUrbanMetro ?? true,
    appendixRefs: parsed.appendixRefs,
    parserConfidence: parsed.parserConfidence,
    distanceExtractionMethod: parsed.distanceExtractionMethod ?? "xml",
    appendixSourceUrl: null,
    appendixFileType: null,
    appendixParseSuccess: false,
    appendixMatchedText: [],
    parseStats: {
      solarArticleCount: parsed.solarArticleCount,
      distanceCount: parsed.distanceCount,
      appendixCount: parsed.appendixRefs?.length ?? 0,
      manualReviewCount: parsed.manualReviewCandidates?.length ?? 0,
    },
    notes: parsed.requiresManualReview
      ? `${parsed.reviewReason ?? LONG_DISTANCE_REVIEW_REASON}${parsed.urbanRegionNotice ? ` — ${parsed.urbanRegionNotice}` : ""}`
      : "",
    parsedAt: new Date().toISOString().slice(0, 10),
  };

  if (WITH_APPENDICES && candidate.requiresManualReview) {
    candidate = await tryAppendixEnrichment(candidate);
  }

  return candidate;
}

async function main() {
  const sourceData = readJson(SOURCE_PATH);
  const existing = fs.existsSync(CANDIDATES_PATH) ? readJson(CANDIDATES_PATH) : { candidates: [] };
  const byKey = new Map(existing.candidates.map((c) => [c.regionKey, c]));

  const report = {
    meta: {
      version: "2026-06-23-step6.7c",
      generatedAt: new Date().toISOString(),
      scope: "metro_urban_qa",
      testRegions: METRO_TEST_KEYS,
      withAppendices: WITH_APPENDICES,
    },
    results: [],
    summary: {
      processed: 0,
      manualReviewCount: 0,
      highConfidenceCount: 0,
      longDistanceExcluded: 0,
      withConfirmedDistances: 0,
    },
  };

  for (const regionKey of METRO_TEST_KEYS) {
    report.summary.processed += 1;
    const candidate = await parseMetroRegion(sourceData, regionKey);
    if (candidate.error) {
      report.results.push({ regionKey, error: candidate.error });
      console.log(`${regionKey} | ERROR ${candidate.error}`);
      continue;
    }

    byKey.set(regionKey, candidate);

    const longExcluded = (candidate.excludedSections ?? []).filter(
      (s) =>
        s.reason === "long_distance_without_solar_keyword" ||
        s.reason === "non_solar_facility_permit_rule",
    ).length;

    if (candidate.requiresManualReview || (candidate.manualReviewCandidates?.length ?? 0) > 0) {
      report.summary.manualReviewCount += 1;
    }
    if (candidate.parserConfidence === "high") report.summary.highConfidenceCount += 1;
    report.summary.longDistanceExcluded += longExcluded;
    if (candidate.parseStats?.distanceCount > 0) report.summary.withConfirmedDistances += 1;

    report.results.push({
      regionKey,
      sigungu: candidate.sigungu,
      parserConfidence: candidate.parserConfidence,
      requiresManualReview: candidate.requiresManualReview,
      distanceExtractionMethod: candidate.distanceExtractionMethod,
      distanceCount: candidate.parseStats?.distanceCount ?? 0,
      extractedDistances: candidate.extractedDistances,
      manualReviewCount: candidate.manualReviewCandidates?.length ?? 0,
      excludedLongDistance: longExcluded,
      highBlocked: candidate.parserConfidence !== "high",
    });

    console.log(
      `${regionKey} | conf=${candidate.parserConfidence} | manual=${candidate.requiresManualReview} | dist=${candidate.parseStats?.distanceCount ?? 0} | method=${candidate.distanceExtractionMethod}`,
    );

    await sleep(150);
  }

  const mergedCandidates = [...byKey.values()].sort((a, b) =>
    a.regionKey.localeCompare(b.regionKey, "ko"),
  );
  const reviewStats = summarizeReviewStats(mergedCandidates.filter((c) => METRO_TEST_KEYS.includes(c.regionKey)));

  writeJson(CANDIDATES_PATH, {
    meta: {
      ...(existing.meta ?? {}),
      version: "2026-06-23-step6.7c",
      generatedAt: new Date().toISOString(),
      parserVersion: "1.2.0",
      description:
        "Step 6.7c parsed candidates with 1000m+ review policy — NOT applied to setback-regulations.json",
      metroQaSummary: { ...report.summary, ...reviewStats },
    },
    candidates: mergedCandidates,
  });

  writeJson(REPORT_PATH, report);

  console.log("\n=== Step 6.7c Metro QA Report ===");
  console.log(JSON.stringify({ ...report.summary, ...reviewStats }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
