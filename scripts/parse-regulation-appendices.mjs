/**
 * Step 6.7b — HWP/PDF appendix parsing for low-confidence parsed candidates.
 *
 * Usage:
 *   node scripts/parse-regulation-appendices.mjs [--priority] [--dry-run]
 *
 * Updates parsed_candidates.json only (NOT setback-regulations.json).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseAppendixFile, pickAppendixRefsToTry } from "./lib/appendix-file-parser.mjs";
import { computeParserConfidence } from "./lib/ordinance-distance-parser.mjs";
import { PRIORITY_SIGUNGU, sleep } from "./lib/regulation-source-resolver.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const INPUT_PATH = path.join(ROOT, "src", "data", "regulatory", "parsed_candidates.json");
const REPORT_PATH = path.join(ROOT, "src", "data", "regulatory", "appendix-parse-report.json");

const STEP_6_7B_TARGETS = new Set([
  "충청남도|논산시",
  "전라북도|군산시",
  "전라북도|부안군",
  "전라북도|김제시",
  "경기도|평택시",
  "충청남도|서산시",
]);

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const PRIORITY_ONLY = args.has("--priority") || !args.has("--all");

const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1, none: 0 };

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, data) {
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function maxConfidence(a, b) {
  return (CONFIDENCE_RANK[a] ?? 0) >= (CONFIDENCE_RANK[b] ?? 0) ? a : b;
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

function mergeDistanceSets(xmlDistances, appendixDistances, preferAppendix = false) {
  const merged = { ...emptyDistances() };
  for (const key of Object.keys(merged)) {
    const xmlVal = xmlDistances?.[key] ?? null;
    const hwpVal = appendixDistances?.[key] ?? null;
    if (preferAppendix && hwpVal != null) {
      merged[key] = hwpVal;
    } else if (hwpVal != null && xmlVal == null) {
      merged[key] = hwpVal;
    } else if (xmlVal != null && hwpVal == null) {
      merged[key] = xmlVal;
    } else if (hwpVal != null && xmlVal != null) {
      merged[key] = preferAppendix ? hwpVal : xmlVal;
    }
  }
  return merged;
}

function shouldProcessCandidate(candidate) {
  if (!PRIORITY_ONLY) return true;
  if (!STEP_6_7B_TARGETS.has(candidate.regionKey)) return false;
  if (PRIORITY_SIGUNGU.has(candidate.sigungu)) return true;
  return STEP_6_7B_TARGETS.has(candidate.regionKey);
}

function needsAppendixParse(candidate) {
  const hasHwpRef = candidate.appendixRefs?.some((r) => r.hwpUrl && !r.hasInlineContent);
  const isLow = candidate.parserConfidence === "low";
  const isTargetRevalidation =
    candidate.regionKey === "충청남도|서산시" ||
    (candidate.parserConfidence === "high" && candidate.notes?.includes("generic"));
  return hasHwpRef && (isLow || isTargetRevalidation || STEP_6_7B_TARGETS.has(candidate.regionKey));
}

async function enrichCandidate(candidate) {
  const xmlDistances = { ...candidate.extractedDistances };
  const xmlConfidence = candidate.parserConfidence;
  const refsToTry = pickAppendixRefsToTry(candidate.appendixRefs ?? []);
  if (!refsToTry.length) {
    return {
      ...candidate,
      distanceExtractionMethod: candidate.distanceExtractionMethod ?? "xml",
      appendixParseAttempted: false,
    };
  }

  let bestAppendixResult = null;
  let bestRef = null;
  const triedUrls = [];

  for (const ref of refsToTry.slice(0, 4)) {
    const appendixResult = await parseAppendixFile(ref);
    triedUrls.push(ref.hwpUrl);
    if (
      !bestAppendixResult ||
      (appendixResult.appendixRelevanceScore ?? 0) > (bestAppendixResult.appendixRelevanceScore ?? 0) ||
      ((appendixResult.appendixRelevanceScore ?? 0) === (bestAppendixResult.appendixRelevanceScore ?? 0) &&
        appendixResult.distanceCount > bestAppendixResult.distanceCount)
    ) {
      bestAppendixResult = appendixResult;
      bestRef = ref;
    }
    if (
      appendixResult.distanceCount >= 2 &&
      appendixResult.appendixParseSuccess &&
      (appendixResult.appendixRelevanceScore ?? 0) >= 8
    ) {
      break;
    }
    await sleep(100);
  }

  const appendixResult = bestAppendixResult ?? { appendixParseSuccess: false, distanceCount: 0 };
  const preferAppendix =
    appendixResult.distanceCount > 0 &&
    (candidate.parserConfidence === "low" ||
      candidate.regionKey === "충청남도|서산시" ||
      xmlConfidence === "low" ||
      appendixResult.distanceCount >= (candidate.parseStats?.distanceCount ?? 0));

  const mergedDistances = mergeDistanceSets(
    xmlDistances,
    appendixResult.extractedDistances,
    preferAppendix,
  );
  const distanceCount = Object.values(mergedDistances).filter((v) => v != null).length;

  const distanceExtractionMethod =
    appendixResult.distanceCount > 0 && preferAppendix
      ? appendixResult.appendixFileType === "pdf"
        ? "pdf"
        : "hwp"
      : distanceCount > 0
        ? candidate.distanceExtractionMethod ?? "xml"
        : appendixResult.appendixParseSuccess
          ? appendixResult.appendixFileType === "pdf"
            ? "pdf"
            : "hwp"
          : candidate.distanceExtractionMethod ?? "xml";

  const allMatches = [
    ...(candidate.allMatches ?? []),
    ...(appendixResult.matches ?? []).map((m) => ({
      ...m,
      source: "appendix",
    })),
  ];

  let parserConfidence = computeParserConfidence({
    matches: allMatches,
    distanceCount,
    solarArticleCount: candidate.parseStats?.solarArticleCount ?? 0,
    appendixRefs: candidate.appendixRefs ?? [],
    appendixParseResult: appendixResult,
    distanceExtractionMethod,
  });

  if (appendixResult.distanceCount === 0 || !preferAppendix) {
    parserConfidence = maxConfidence(parserConfidence, xmlConfidence);
  }

  let notes = candidate.notes ?? "";
  if (candidate.regionKey === "충청남도|서산시" && appendixResult.distanceCount > 0) {
    notes =
      "서산 별표24(HWP) 태양광 이격기준 적용 — 제16조의4 1000m(고형연료 등)는 excludedSections 참조";
  } else if (candidate.regionKey === "충청남도|서산시") {
    notes = "제16조의4 발전시설 등 허가기준 1000m는 태양광 전용 이격 아님 — manual_review 권장";
  } else if (parserConfidence === "low" && appendixResult.appendixParseSuccess && distanceCount === 0) {
    notes = "HWP 별표 파싱 성공했으나 태양광 이격거리 수치 미추출";
  } else if (appendixResult.distanceCount > 0) {
    notes = `HWP/PDF 별표에서 ${appendixResult.distanceCount}개 카테고리 거리 추출`;
  }

  return {
    ...candidate,
    extractedDistances: mergedDistances,
    matchedText: [
      ...new Set([...(candidate.matchedText ?? []), ...(appendixResult.matchedText ?? [])]),
    ].slice(0, 12),
    parserConfidence,
    parserConfidenceBefore: xmlConfidence,
    distanceExtractionMethod,
    appendixSourceUrl: appendixResult.appendixSourceUrl ?? bestRef?.hwpUrl ?? null,
    appendixFileType: appendixResult.appendixFileType ?? null,
    appendixParseSuccess: appendixResult.appendixParseSuccess ?? false,
    appendixMatchedText: appendixResult.matchedText ?? [],
    appendixParseAttempted: true,
    appendixParseStats: {
      textLength: appendixResult.appendixTextLength ?? 0,
      relevanceScore: appendixResult.appendixRelevanceScore ?? 0,
      distanceCount: appendixResult.distanceCount ?? 0,
      triedUrls,
      error: appendixResult.error ?? null,
    },
    parseStats: {
      ...(candidate.parseStats ?? {}),
      distanceCount,
    },
    notes,
    parsedAt: new Date().toISOString().slice(0, 10),
  };
}

async function main() {
  const data = readJson(INPUT_PATH);
  const candidates = data.candidates ?? [];

  const report = {
    meta: {
      version: "2026-06-23-step6.7b",
      generatedAt: new Date().toISOString(),
      scope: PRIORITY_ONLY ? "step6.7b_priority_targets" : "all_candidates",
      dryRun: DRY_RUN,
    },
    summary: {
      candidatesTotal: candidates.length,
      candidatesSelected: 0,
      appendixParseAttempted: 0,
      appendixParseSuccess: 0,
      distanceExtracted: 0,
      confidenceBefore: { high: 0, medium: 0, low: 0, none: 0 },
      confidenceAfter: { high: 0, medium: 0, low: 0, none: 0 },
      hwpParseSuccessRate: "0%",
      distanceExtractionSuccessRate: "0%",
    },
    results: [],
  };

  const updated = [];

  for (const candidate of candidates) {
    if (!shouldProcessCandidate(candidate)) {
      updated.push(candidate);
      report.summary.confidenceAfter[candidate.parserConfidence] =
        (report.summary.confidenceAfter[candidate.parserConfidence] || 0) + 1;
      continue;
    }

    report.summary.candidatesSelected += 1;
    report.summary.confidenceBefore[candidate.parserConfidence] =
      (report.summary.confidenceBefore[candidate.parserConfidence] || 0) + 1;

    if (!needsAppendixParse(candidate)) {
      const kept = {
        ...candidate,
        distanceExtractionMethod: candidate.distanceExtractionMethod ?? "xml",
      };
      updated.push(kept);
      report.summary.confidenceAfter[kept.parserConfidence] =
        (report.summary.confidenceAfter[kept.parserConfidence] || 0) + 1;
      continue;
    }

    report.summary.appendixParseAttempted += 1;

    const enriched = DRY_RUN
      ? {
          ...candidate,
          appendixParseAttempted: true,
          distanceExtractionMethod: "hwp",
        }
      : await enrichCandidate(candidate);

    if (enriched.appendixParseSuccess) report.summary.appendixParseSuccess += 1;
    if (enriched.parseStats?.distanceCount > 0) report.summary.distanceExtracted += 1;

    report.summary.confidenceAfter[enriched.parserConfidence] =
      (report.summary.confidenceAfter[enriched.parserConfidence] || 0) + 1;

    report.results.push({
      regionKey: enriched.regionKey,
      sigungu: enriched.sigungu,
      confidenceBefore: candidate.parserConfidence,
      confidenceAfter: enriched.parserConfidence,
      appendixParseSuccess: enriched.appendixParseSuccess ?? false,
      appendixFileType: enriched.appendixFileType ?? null,
      distanceExtractionMethod: enriched.distanceExtractionMethod ?? null,
      distanceCount: enriched.parseStats?.distanceCount ?? 0,
      extractedDistances: enriched.extractedDistances,
      appendixSourceUrl: enriched.appendixSourceUrl ?? null,
      notes: enriched.notes ?? "",
    });

    updated.push(enriched);
    console.log(
      `${enriched.regionKey} | ${candidate.parserConfidence} → ${enriched.parserConfidence} | appendix=${enriched.appendixParseSuccess} | method=${enriched.distanceExtractionMethod} | dist=${enriched.parseStats?.distanceCount ?? 0}`,
    );

    await sleep(200);
  }

  const attempted = report.summary.appendixParseAttempted || 1;
  report.summary.hwpParseSuccessRate = `${Math.round((report.summary.appendixParseSuccess / attempted) * 100)}%`;
  report.summary.distanceExtractionSuccessRate = `${Math.round((report.summary.distanceExtracted / attempted) * 100)}%`;

  const output = {
    meta: {
      ...data.meta,
      version: "2026-06-23-step6.7b",
      generatedAt: new Date().toISOString(),
      parserVersion: "1.1.0",
      description:
        "Step 6.7b parsed setback distance candidates (XML + HWP/PDF appendix) — NOT applied to setback-regulations.json",
      appendixParseSummary: report.summary,
    },
    candidates: updated,
  };

  if (!DRY_RUN) {
    writeJson(INPUT_PATH, output);
    writeJson(REPORT_PATH, report);
  }

  console.log("\n=== Step 6.7b Appendix Parse Report ===");
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
