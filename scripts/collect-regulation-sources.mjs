/**
 * Step 6.6 — 공식 조례 source 수집
 * Usage:
 *   node scripts/collect-regulation-sources.mjs [--all|--priority] [--dry-run]
 *
 * Priority: elis(law.go.kr gubun=ELIS) > law.go.kr > (미구현) municipal
 * Discovery: law.go.kr 자치법규 slug URL (1순위) → title/ordinSeq 검증, DDG fallback
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { regionKey } from "./lib/regulatory-constants.mjs";
import {
  isPriorityRegion,
  PRIORITY_SIGUNGU,
  resolveGuidelineSearchName,
  resolveOrdinanceSearchAlternates,
  resolveOrdinanceSearchName,
  searchOfficialLawUrl,
  sleep,
} from "./lib/regulation-source-resolver.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const REGION_PATH = path.join(ROOT, "src", "data", "regulatory", "korea-region-registry.json");
const SOURCE_PATH = path.join(ROOT, "src", "data", "regulatory", "regulation-source-registry.json");
const REPORT_PATH = path.join(ROOT, "src", "data", "regulatory", "source-collection-report.json");

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const PRIORITY_ONLY = args.has("--priority");
const RUN_ALL = args.has("--all") || !PRIORITY_ONLY;
const RESUME = args.has("--resume");
const RETRY_FAILED = args.has("--retry-failed");
const COLLECT_GUIDELINES = args.has("--guidelines");
const PRIORITY_SIGUNGU_LIST = [...PRIORITY_SIGUNGU];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, data) {
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function applySourceResult(source, result) {
  source.sourceUrl = result.sourceUrl;
  source.status = result.status;
  if (result.sourceOrigin) source.sourceOrigin = result.sourceOrigin;
  source.notes = result.notes || "";
  source.collectedAt = new Date().toISOString().slice(0, 10);
}

async function main() {
  const regionData = readJson(REGION_PATH);
  const sourceData = readJson(SOURCE_PATH);
  const regions = regionData.regions.filter((r) =>
    RUN_ALL ? true : isPriorityRegion(r.sido, r.sigungu),
  );

  console.log(`Collecting sources for ${regions.length} regions (dryRun=${DRY_RUN})`);

  const searchCache = new Map();
  const stats = {
    regionsProcessed: 0,
    ordinanceSourceFound: 0,
    ordinanceNeedsVerification: 0,
    ordinanceNotStarted: 0,
    guidelineSourceFound: 0,
    byType: {},
    byOrigin: {},
    priority: { total: 0, found: 0 },
  };

  for (const region of regions) {
    const key = region.key ?? regionKey(region.sido, region.sigungu);
    const entry = sourceData.entries[key];
    if (!entry) {
      console.warn("skip missing entry", key);
      continue;
    }

    stats.regionsProcessed += 1;
    const priority = isPriorityRegion(region.sido, region.sigungu);
    if (priority) stats.priority.total += 1;

    const ordinanceName = resolveOrdinanceSearchName(region.sido, region.sigungu);
    const ordinanceAlternates = resolveOrdinanceSearchAlternates(region.sido, region.sigungu).slice(1);
    const ordinanceSource = entry.sources.find((s) => s.type === "ordinance");
    if (ordinanceSource) {
      ordinanceSource.name = ordinanceName;

      if (!DRY_RUN) {
        const cacheKey = [ordinanceName, ...ordinanceAlternates].join("||");
        const skipFound =
          (RESUME || RETRY_FAILED) && ordinanceSource.status === "source_found" && ordinanceSource.sourceUrl;
        const skipNotFailed = RETRY_FAILED && ordinanceSource.status !== "not_started";

        let result;
        if (skipFound || skipNotFailed) {
          result = {
            sourceUrl: ordinanceSource.sourceUrl,
            status: ordinanceSource.status,
            sourceOrigin: ordinanceSource.sourceOrigin,
            notes: ordinanceSource.notes || "",
          };
          searchCache.set(cacheKey, result);
        } else {
          result = await searchOfficialLawUrl(ordinanceName, searchCache, 150, {
            alternates: ordinanceAlternates,
          });
          applySourceResult(ordinanceSource, result);
          if (result.matchedName && result.matchedName !== ordinanceName) {
            ordinanceSource.name = result.matchedName;
          }
        }

        stats.byType.ordinance = (stats.byType.ordinance || 0) + 1;
        if (result.status === "source_found") {
          stats.ordinanceSourceFound += 1;
          if (priority) stats.priority.found += 1;
          stats.byOrigin[result.sourceOrigin || "unknown"] =
            (stats.byOrigin[result.sourceOrigin || "unknown"] || 0) + 1;
        } else if (result.status === "needs_verification") {
          stats.ordinanceNeedsVerification += 1;
        } else {
          stats.ordinanceNotStarted += 1;
        }

        console.log(
          `${key} | ordinance ${result.status} | ${result.sourceUrl ? result.sourceUrl.slice(0, 70) : "-"}`,
        );
      }
    }

    const guidelineName = resolveGuidelineSearchName(region.sigungu);
    const guidelineSource = entry.sources.find((s) => s.type === "guideline");
    if (guidelineSource && guidelineName && COLLECT_GUIDELINES && priority) {
      guidelineSource.name = guidelineName;
      if (!DRY_RUN) {
        const result = await searchOfficialLawUrl(guidelineName, searchCache, 150, {
          allowDdgFallback: false,
        });
        applySourceResult(guidelineSource, result);
        if (result.status === "source_found") stats.guidelineSourceFound += 1;
        console.log(
          `  guideline ${result.status} | ${result.sourceUrl ? result.sourceUrl.slice(0, 70) : "-"}`,
        );
      }
    }

    await sleep(50);

    if (!DRY_RUN && stats.regionsProcessed % 25 === 0) {
      writeJson(SOURCE_PATH, sourceData);
      console.log(`... checkpoint saved (${stats.regionsProcessed}/${regions.length})`);
    }
  }

  const totalSources = Object.values(sourceData.entries).flatMap((e) => e.sources);
  const foundCount = totalSources.filter((s) => s.sourceUrl && s.status === "source_found").length;
  const needsVerificationCount = totalSources.filter((s) => s.status === "needs_verification").length;
  const notStartedCount = totalSources.filter((s) => !s.sourceUrl || s.status === "not_started").length;

  sourceData.meta = {
    ...sourceData.meta,
    version: "2026-06-23-step6.6",
    collectedAt: new Date().toISOString().slice(0, 10),
    sourceFoundCount: foundCount,
    sourceNeedsVerificationCount: needsVerificationCount,
    sourceNotStartedCount: notStartedCount,
    collectionMethod: "law.go.kr 자치법규 slug + ordinInfoP (elis gubun=ELIS when present)",
  };

  const report = {
    generatedAt: new Date().toISOString(),
    regionsProcessed: stats.regionsProcessed,
    ordinanceSourceFound: stats.ordinanceSourceFound,
    ordinanceNeedsVerification: stats.ordinanceNeedsVerification,
    ordinanceNotStarted: stats.ordinanceNotStarted,
    guidelineSourceFound: stats.guidelineSourceFound,
    totalSourceFound: foundCount,
    totalNeedsVerification: needsVerificationCount,
    totalNotStarted: notStartedCount,
    sourceFoundRatePct: Number(((foundCount / totalSources.length) * 100).toFixed(1)),
    ordinanceFoundRatePct: Number(
      (
        (Object.values(sourceData.entries).filter((e) =>
          e.sources.some((s) => s.type === "ordinance" && s.status === "source_found"),
        ).length /
          Object.keys(sourceData.entries).length) *
        100
      ).toFixed(1),
    ),
    byType: stats.byType,
    byOrigin: stats.byOrigin,
    priorityRegions: stats.priority,
    sgSolarCities: PRIORITY_SIGUNGU_LIST.map((sigungu) => {
      const entry = Object.values(sourceData.entries).find((e) => e.sigungu === sigungu);
      const ord = entry?.sources.find((s) => s.type === "ordinance");
      return {
        sigungu,
        status: ord?.status ?? "missing",
        sourceUrl: ord?.sourceUrl ?? "",
      };
    }),
    ordinanceNotStartedRegions: Object.entries(sourceData.entries)
      .filter(([, e]) => e.sources.some((s) => s.type === "ordinance" && s.status === "not_started"))
      .map(([key, e]) => ({ key, sigungu: e.sigungu, sido: e.sido })),
    dryRun: DRY_RUN,
  };

  if (!DRY_RUN) {
    writeJson(SOURCE_PATH, sourceData);
    writeJson(REPORT_PATH, report);
  }

  console.log("\n=== Collection summary ===");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
