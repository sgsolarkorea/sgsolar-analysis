/**
 * Step 6.7 — 조례 본문 parsing + 거리값 extraction → parsed_candidates.json
 *
 * Usage:
 *   node scripts/parse-regulation-ordinances.mjs [--priority|--all] [--dry-run]
 *
 * Does NOT modify setback-regulations.json (candidates only).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { regionKey } from "./lib/regulatory-constants.mjs";
import { loadOfficialOrdinance } from "./lib/ordinance-fetcher.mjs";
import { parseOrdinanceDistances } from "./lib/ordinance-distance-parser.mjs";
import { LONG_DISTANCE_REVIEW_REASON } from "./lib/ordinance-distance-review.mjs";
import { PRIORITY_SIGUNGU, sleep } from "./lib/regulation-source-resolver.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SOURCE_PATH = path.join(ROOT, "src", "data", "regulatory", "regulation-source-registry.json");
const OUTPUT_PATH = path.join(ROOT, "src", "data", "regulatory", "parsed_candidates.json");

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const PRIORITY_ONLY = args.has("--priority");
const RUN_ALL = args.has("--all") || !PRIORITY_ONLY;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, data) {
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function selectRegions(sourceData) {
  const entries = [];
  for (const [key, entry] of Object.entries(sourceData.entries)) {
    const ordinance = entry.sources?.find((s) => s.type === "ordinance");
    if (!ordinance || ordinance.status !== "source_found" || !ordinance.sourceUrl) continue;
    if (PRIORITY_ONLY && !PRIORITY_SIGUNGU.has(entry.sigungu)) continue;
    entries.push({ key, entry, ordinance });
  }
  return entries;
}

async function parseRegion({ key, entry, ordinance }) {
  const base = {
    regionKey: key,
    municipalityLabel: entry.municipalityLabel ?? entry.sigungu,
    sido: entry.sido,
    sigungu: entry.sigungu,
    ordinanceName: ordinance.name,
    sourceUrl: ordinance.sourceUrl,
    sourceType: ordinance.type ?? "ordinance",
    sourceOrigin: ordinance.sourceOrigin ?? "unknown",
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

  try {
    const loaded = await loadOfficialOrdinance(ordinance.sourceUrl);
    const parsed = parseOrdinanceDistances(loaded, {
      sido: entry.sido,
      sigungu: entry.sigungu,
    });

    let notes = "";
    if (parsed.requiresManualReview) {
      notes = parsed.reviewReason ?? LONG_DISTANCE_REVIEW_REASON;
      if (parsed.urbanRegionNotice) {
        notes = `${notes} — ${parsed.urbanRegionNotice}`;
      }
    } else if (parsed.excludedSections?.length) {
      notes =
        "제16조의4 등 발전시설 등 일반 허가기준(1000m)은 태양광 전용 이격 아님 — HWP 별표 또는 manual_review 필요";
    } else if (parsed.parserConfidence === "low") {
      notes =
        "태양광 관련 조문/별표 참조는 확인됐으나 별표 본문이 HWP 첨부만 제공되어 거리값 자동 추출 불가";
    } else if (parsed.distanceCount === 0 && parsed.solarArticleCount > 0) {
      notes = "태양광 관련 조문은 있으나 구조화된 이격거리 수치 미추출";
    }

    return {
      ...base,
      ordinanceName: loaded.ordinanceName || ordinance.name,
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
        appendixCount: parsed.appendixRefs.length,
        manualReviewCount: parsed.manualReviewCandidates?.length ?? 0,
      },
      notes,
    };
  } catch (error) {
    return {
      ...base,
      parserConfidence: "none",
      notes: String(error),
    };
  }
}

async function main() {
  const sourceData = readJson(SOURCE_PATH);
  const regions = selectRegions(sourceData);

  console.log(
    `Parsing ${regions.length} source_found regions (priorityOnly=${PRIORITY_ONLY}, dryRun=${DRY_RUN})`,
  );

  const candidates = [];
  const stats = {
    processed: 0,
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
    withDistances: 0,
  };

  for (const region of regions) {
    stats.processed += 1;
    const candidate = DRY_RUN
      ? {
          regionKey: region.key,
          ordinanceName: region.ordinance.name,
          sourceUrl: region.ordinance.sourceUrl,
          sourceType: "ordinance",
          parserConfidence: "none",
          extractedDistances: {},
          matchedText: [],
        }
      : await parseRegion(region);

    candidates.push(candidate);
    stats[candidate.parserConfidence] = (stats[candidate.parserConfidence] || 0) + 1;
    if (candidate.parseStats?.distanceCount > 0) stats.withDistances += 1;

    console.log(
      `${region.key} | ${candidate.parserConfidence} | distances=${candidate.parseStats?.distanceCount ?? 0} | solarArts=${candidate.parseStats?.solarArticleCount ?? 0}`,
    );

    await sleep(150);

    if (!DRY_RUN && stats.processed % 10 === 0) {
      writeJson(OUTPUT_PATH, {
        meta: { version: "2026-06-23-step6.7", inProgress: true },
        candidates,
      });
    }
  }

  const output = {
    meta: {
      version: "2026-06-23-step6.7c",
      generatedAt: new Date().toISOString(),
      parserVersion: "1.2.0",
      description:
        "Step 6.7 parsed setback distance candidates — NOT applied to setback-regulations.json",
      scope: PRIORITY_ONLY ? "priority_sg_solar" : "all_source_found",
      regionsProcessed: stats.processed,
      confidenceCounts: {
        high: stats.high,
        medium: stats.medium,
        low: stats.low,
        none: stats.none,
      },
      withDistances: stats.withDistances,
    },
    candidates,
  };

  if (!DRY_RUN) {
    writeJson(OUTPUT_PATH, output);
  }

  console.log("\n=== Parse summary ===");
  console.log(JSON.stringify(output.meta, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
