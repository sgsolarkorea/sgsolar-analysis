/**
 * Step 6.10 — 공공데이터포털 법제처 자치법규 Open API 정식 source 수집
 *
 * Usage:
 *   node scripts/collect-regulation-sources-openapi.mjs [--verify|--priority|--all] [--dry-run]
 *
 * APIs (law.go.kr Open API / DRF fallback):
 *   1. target=ordin       — 자치법규 목록
 *   2. target=ordin + MST — 자치법규 본문
 *   3. target=ordinbyl    — 별표·서식 목록
 *
 * Env: LAW_API_OC or REGULATION_API_KEY (optional; 없으면 DRF HTML/XML fallback)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { regionKey } from "./lib/regulatory-constants.mjs";
import {
  fetchOrdinanceBody,
  getRegulationApiKey,
  hasOfficialApiKey,
  searchOrdinanceAppendices,
  searchOrdinanceList,
  sleep,
} from "./lib/law-openapi-client.mjs";
import {
  buildOrdinanceSearchQueries,
  parseOrdinanceListResponse,
  pickBestOrdinanceListItem,
} from "./lib/local-ordinance-list-parser.mjs";
import { parseOrdinanceBodyResponse } from "./lib/local-ordinance-body-parser.mjs";
import {
  APPENDIX_SEARCH_QUERIES,
  parseAppendixListResponse,
} from "./lib/local-ordinance-appendix-parser.mjs";
import { resolveOrgCodes, VERIFICATION_REGION_KEYS } from "./lib/law-org-codes.mjs";
import { buildOpenApiCandidate } from "./lib/openapi-candidate-builder.mjs";
import {
  isPriorityRegion,
  resolveOrdinanceSearchName,
  searchOfficialLawUrl,
} from "./lib/regulation-source-resolver.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const REGION_PATH = path.join(ROOT, "src", "data", "regulatory", "korea-region-registry.json");
const SOURCE_PATH = path.join(ROOT, "src", "data", "regulatory", "regulation-source-registry.json");
const CANDIDATES_PATH = path.join(ROOT, "src", "data", "regulatory", "parsed_candidates.json");
const REPORT_PATH = path.join(ROOT, "src", "data", "regulatory", "openapi-collection-report.json");

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const VERIFY_ONLY = args.has("--verify");
const PRIORITY_ONLY = args.has("--priority");
const RUN_ALL = args.has("--all");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, data) {
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function selectRegions(regionData, sourceData) {
  const keys = new Set();
  if (VERIFY_ONLY) {
    for (const key of VERIFICATION_REGION_KEYS) keys.add(key);
  } else if (PRIORITY_ONLY) {
    for (const region of regionData.regions) {
      if (isPriorityRegion(region.sido, region.sigungu)) {
        keys.add(region.key ?? regionKey(region.sido, region.sigungu));
      }
    }
  } else if (RUN_ALL) {
    for (const region of regionData.regions) {
      keys.add(region.key ?? regionKey(region.sido, region.sigungu));
    }
  } else {
    for (const key of VERIFICATION_REGION_KEYS) keys.add(key);
  }

  return regionData.regions
    .filter((region) => keys.has(region.key ?? regionKey(region.sido, region.sigungu)))
    .map((region) => {
      const key = region.key ?? regionKey(region.sido, region.sigungu);
      return {
        region,
        key,
        entry: sourceData.entries[key],
      };
    })
    .filter((row) => row.entry);
}

async function discoverOrdinanceViaOpenApi(region, entry) {
  const primaryName = resolveOrdinanceSearchName(region.sido, region.sigungu);
  const { org, sborg } = resolveOrgCodes(region.sido, region.sigungu);
  const queries = buildOrdinanceSearchQueries(region.sigungu, primaryName);

  let bestItem = null;
  let listMode = null;
  let listReference = null;
  let listQuery = null;
  const listAttempts = [];

  for (const query of queries) {
    // 1순위: query-only (org/sborg 코드 오류 시 결과 0건 방지)
    const listRes = await searchOrdinanceList({ query, display: 20 });
    let parsed = parseOrdinanceListResponse(listRes.raw);
    let candidate = pickBestOrdinanceListItem(parsed.items, primaryName, region.sigungu);

    listAttempts.push({
      query,
      mode: listRes.mode,
      count: parsed.items.length,
      apiReference: listRes.apiReference,
      filter: "query-only",
    });

    // 2순위: org/sborg 필터 (코드가 등록된 경우만, query-only 실패 시)
    if (!candidate && org && sborg) {
      const filteredRes = await searchOrdinanceList({ query, org, sborg, display: 20 });
      parsed = parseOrdinanceListResponse(filteredRes.raw);
      candidate = pickBestOrdinanceListItem(parsed.items, primaryName, region.sigungu);
      listAttempts.push({
        query,
        mode: filteredRes.mode,
        count: parsed.items.length,
        apiReference: filteredRes.apiReference,
        filter: `org=${org}&sborg=${sborg}`,
      });
      if (candidate) {
        bestItem = candidate;
        listMode = filteredRes.mode;
        listReference = filteredRes.apiReference;
        listQuery = query;
        break;
      }
    }

    if (candidate) {
      bestItem = candidate;
      listMode = listRes.mode;
      listReference = listRes.apiReference;
      listQuery = query;
      break;
    }
    await sleep(120);
  }

  return {
    primaryName,
    bestItem,
    listMode,
    listReference,
    listQuery,
    listAttempts,
    org,
    sborg,
  };
}

async function collectAppendices(region, org, sborg, relatedMst, ordinanceName) {
  const merged = [];
  let appendixMode = null;
  let appendixReference = null;

  const queries = [
    `${region.sigungu} 태양광`,
    `${region.sigungu} 태양광 발전시설`,
    ...APPENDIX_SEARCH_QUERIES,
  ];

  for (const query of [...new Set(queries)]) {
    const res = await searchOrdinanceAppendices({
      query,
      org,
      sborg,
      relatedOrdinanceName: ordinanceName,
    });
    appendixMode = res.mode;
    appendixReference = res.apiReference;
    const parsed = parseAppendixListResponse(res.raw);
    for (const item of parsed.items) {
      if (region.sigungu && !item.title.includes(region.sigungu)) continue;
      if (
        item.relatedOrdinanceName &&
        ordinanceName &&
        !item.relatedOrdinanceName.includes(region.sigungu)
      ) {
        continue;
      }
      merged.push(item);
    }
    await sleep(100);
  }

  const seen = new Set();
  const items = merged.filter((item) => {
    const key = `${item.title}|${item.fileUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { items, appendixMode, appendixReference };
}

async function collectRegion(row, reportStats) {
  const { region, key, entry } = row;
  const result = {
    regionKey: key,
    sigungu: region.sigungu,
    sido: region.sido,
    listSuccess: false,
    bodySuccess: false,
    appendixSuccess: false,
    fallbackUsed: false,
    errors: [],
    listQuery: null,
    mst: null,
    ordinanceName: null,
    openapiReferences: {},
    fetchModes: {},
  };

  try {
    const discovery = await discoverOrdinanceViaOpenApi(region, entry);
    result.listQuery = discovery.listQuery;
    result.openapiReferences.list = discovery.listReference;
    result.fetchModes.list = discovery.listMode;
    result.listAttempts = discovery.listAttempts;

    if (!discovery.bestItem?.mst) {
      result.errors.push("Open API list: matching ordinance not found");
      reportStats.listFailed += 1;

      const fallback = await searchOfficialLawUrl(discovery.primaryName, new Map(), 150);
      if (fallback.sourceUrl) {
        result.fallbackUsed = true;
        reportStats.slugFallback += 1;
        return { result, fallbackSource: fallback, candidate: null };
      }
      return { result, fallbackSource: null, candidate: null };
    }

    result.listSuccess = true;
    result.mst = discovery.bestItem.mst;
    result.ordinanceName = discovery.bestItem.name;
    reportStats.listSuccess += 1;
    if (discovery.listMode !== "openapi_xml") result.fallbackUsed = true;

    const bodyRes = await fetchOrdinanceBody({ mst: discovery.bestItem.mst });
    result.fetchModes.body = bodyRes.mode;
    result.openapiReferences.body = bodyRes.apiReference;
    if (bodyRes.mode !== "openapi_xml") result.fallbackUsed = true;

    const bodyLoaded = parseOrdinanceBodyResponse(bodyRes.raw, {
      mst: discovery.bestItem.mst,
      apiReference: bodyRes.apiReference,
      mode: bodyRes.mode,
    });
    result.bodySuccess = true;
    reportStats.bodySuccess += 1;

    const appendix = await collectAppendices(
      region,
      discovery.org,
      discovery.sborg,
      discovery.bestItem.mst,
      bodyLoaded.ordinanceName || discovery.bestItem.name,
    );
    result.fetchModes.appendix = appendix.appendixMode;
    result.openapiReferences.appendix = appendix.appendixReference;
    result.appendixSuccess =
      appendix.items.length > 0 ||
      (bodyLoaded.appendices?.length ?? 0) > 0 ||
      (bodyLoaded.appendices?.some((a) => /태양광|발전시설|이격/i.test(`${a.title} ${a.content}`)) ??
        false);
    if (appendix.appendixMode !== "openapi_xml") result.fallbackUsed = true;
    if (result.appendixSuccess) reportStats.appendixSuccess += 1;
    else reportStats.appendixEmpty += 1;

    const candidate = buildOpenApiCandidate({
      regionKey: key,
      entry,
      ordinanceName: discovery.primaryName,
      listItem: discovery.bestItem,
      bodyLoaded,
      appendixItems: appendix.items,
      collectionMeta: {
        hasOfficialApiKey: hasOfficialApiKey(),
        listMode: discovery.listMode,
        listReference: discovery.listReference,
        appendixMode: appendix.appendixMode,
        appendixReference: appendix.appendixReference,
        fallbackUsed: result.fallbackUsed,
      },
    });

    const sourceUpdate = {
      sourceUrl: bodyLoaded.sourceUrl,
      status: "source_found",
      sourceOrigin: hasOfficialApiKey() ? "openapi.law.go.kr" : "law.go.kr",
      notes: `Step 6.10 Open API (MST=${discovery.bestItem.mst}, list=${discovery.listMode})`,
      collectedAt: new Date().toISOString().slice(0, 10),
      openapiMst: discovery.bestItem.mst,
      openapiListReference: discovery.listReference,
      openapiBodyReference: bodyRes.apiReference,
      openapiAppendixReference: appendix.appendixReference,
      collectionMethod: "openapi",
    };

    return { result, sourceUpdate, candidate, ordinanceSourceName: discovery.bestItem.name };
  } catch (error) {
    result.errors.push(String(error));
    reportStats.errors += 1;
    return { result, sourceUpdate: null, candidate: null };
  }
}

function mergeCandidates(existing, updates) {
  const byKey = new Map(existing.candidates.map((c) => [c.regionKey, c]));
  for (const candidate of updates) {
    if (!candidate) continue;
    byKey.set(candidate.regionKey, candidate);
  }
  return [...byKey.values()].sort((a, b) => a.regionKey.localeCompare(b.regionKey, "ko"));
}

async function main() {
  const apiKey = getRegulationApiKey();
  console.log(
    `Step 6.10 Open API collection (verify=${VERIFY_ONLY}, dryRun=${DRY_RUN}, hasOfficialKey=${Boolean(apiKey)})`,
  );

  const regionData = readJson(REGION_PATH);
  const sourceData = readJson(SOURCE_PATH);
  const existingCandidates = fs.existsSync(CANDIDATES_PATH)
    ? readJson(CANDIDATES_PATH)
    : { meta: {}, candidates: [] };

  const regions = selectRegions(regionData, sourceData);
  console.log(`Regions selected: ${regions.length}`);

  const reportStats = {
    regionsProcessed: 0,
    listSuccess: 0,
    listFailed: 0,
    bodySuccess: 0,
    appendixSuccess: 0,
    appendixEmpty: 0,
    slugFallback: 0,
    errors: 0,
    fallbackRegions: 0,
  };

  const regionReports = [];
  const candidateUpdates = [];

  for (const row of regions) {
    reportStats.regionsProcessed += 1;
    console.log(`\n→ ${row.key}`);

    if (DRY_RUN) {
      regionReports.push({ regionKey: row.key, dryRun: true });
      continue;
    }

    const collected = await collectRegion(row, reportStats);
    regionReports.push(collected.result);

    if (collected.fallbackSource) {
      reportStats.fallbackRegions += 1;
      const ordinance = row.entry.sources.find((s) => s.type === "ordinance");
      if (ordinance && collected.fallbackSource.sourceUrl) {
        ordinance.sourceUrl = collected.fallbackSource.sourceUrl;
        ordinance.status = collected.fallbackSource.status;
        ordinance.sourceOrigin = collected.fallbackSource.sourceOrigin;
        ordinance.notes = `Open API list failed; slug fallback — ${collected.fallbackSource.notes}`;
        ordinance.collectedAt = new Date().toISOString().slice(0, 10);
        ordinance.collectionMethod = "openapi_slug_fallback";
      }
    }

    if (collected.sourceUpdate) {
      const ordinance = row.entry.sources.find((s) => s.type === "ordinance");
      if (ordinance) Object.assign(ordinance, collected.sourceUpdate);
      if (collected.ordinanceSourceName) ordinance.name = collected.ordinanceSourceName;
    }

    if (collected.candidate) {
      candidateUpdates.push(collected.candidate);
      console.log(
        `  OK mst=${collected.candidate.openapiMst} confidence=${collected.candidate.parserConfidence} distances=${collected.candidate.parseStats?.distanceCount ?? 0} appendix=${collected.candidate.parseStats?.openapiAppendixCandidates ?? 0}`,
      );
    } else {
      console.log(`  WARN ${collected.result.errors.join("; ") || "no candidate"}`);
    }

    if (collected.result.fallbackUsed && !collected.fallbackSource) {
      reportStats.fallbackRegions += 1;
    }
    await sleep(200);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    step: "6.10",
    hasOfficialApiKey: Boolean(apiKey),
    apiKeyEnv: apiKey ? "LAW_API_OC|REGULATION_API_KEY (set)" : "not configured",
    primarySource: "openapi.law.go.kr",
    fallbackSources: ["DRF HTML/XML (law.go.kr)", "slug/ELIS (Step 6.6)"],
    regionsProcessed: reportStats.regionsProcessed,
    stats: {
      listSuccessRate: reportStats.regionsProcessed
        ? `${reportStats.listSuccess}/${reportStats.regionsProcessed}`
        : "0/0",
      bodySuccessRate: `${reportStats.bodySuccess}/${reportStats.regionsProcessed}`,
      appendixSuccessRate: `${reportStats.appendixSuccess}/${reportStats.regionsProcessed}`,
      slugFallbackCount: reportStats.slugFallback,
      fallbackRegionCount: reportStats.fallbackRegions,
      errorCount: reportStats.errors,
    },
    regionResults: regionReports,
  };

  if (!DRY_RUN) {
    sourceData.meta = {
      ...sourceData.meta,
      openapiCollectionAt: new Date().toISOString().slice(0, 10),
      openapiCollectionVersion: "2026-06-19-step6.10",
      openapiPrimarySource: "openapi.law.go.kr",
    };
    writeJson(SOURCE_PATH, sourceData);
    writeJson(REPORT_PATH, report);

    const mergedCandidates = mergeCandidates(existingCandidates, candidateUpdates);
    const confidenceCounts = { high: 0, medium: 0, low: 0, none: 0 };
    let withDistances = 0;
    for (const c of mergedCandidates) {
      confidenceCounts[c.parserConfidence] = (confidenceCounts[c.parserConfidence] || 0) + 1;
      if (c.parseStats?.distanceCount > 0) withDistances += 1;
    }

    writeJson(CANDIDATES_PATH, {
      meta: {
        ...existingCandidates.meta,
        version: "2026-06-19-step6.10",
        generatedAt: new Date().toISOString(),
        parserVersion: "1.3.0-openapi",
        description:
          "Step 6.7/6.10 parsed setback distance candidates — NOT applied to setback-regulations.json",
        openapiCollectionAt: report.generatedAt,
        openapiRegionsUpdated: candidateUpdates.length,
        scope: VERIFY_ONLY ? "openapi_verify_8" : PRIORITY_ONLY ? "priority_openapi" : "openapi",
        regionsProcessed: mergedCandidates.length,
        confidenceCounts,
        withDistances,
      },
      candidates: mergedCandidates,
    });
  }

  console.log("\n=== Open API collection summary ===");
  console.log(JSON.stringify(report.stats, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
