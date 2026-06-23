/**
 * 전국 조례 DB pipeline skeleton 생성 (Step 6.5)
 * Usage: node scripts/build-regulatory-db.mjs
 *
 * - korea-region-registry.json → regulation-source-registry.json skeleton
 * - 기존 setback-regulations.json entries 보존 + 확장 필드 merge
 * - 신규 지자체는 DB에 추가하지 않음 (lookup 시 common fallback 유지)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  defaultSetbackSkeleton,
  defaultSourceSkeleton,
  regionKey,
} from "./lib/regulatory-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "src", "data", "regulatory");

const REGION_PATH = path.join(DATA_DIR, "korea-region-registry.json");
const SOURCE_PATH = path.join(DATA_DIR, "regulation-source-registry.json");
const SETBACK_PATH = path.join(DATA_DIR, "setback-regulations.json");

const EXTENDED_SETBACK_FIELDS = [
  "sourceUrl",
  "lastUpdated",
  "verifiedAt",
  "reviewStatus",
  "notes",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function normalizeExistingSetbackEntry(key, entry) {
  const skeleton = defaultSetbackSkeleton(entry.sigungu, entry.sido);
  const merged = {
    ...skeleton,
    ...entry,
    municipalityLabel: entry.municipalityLabel ?? entry.sigungu,
    distances: { ...skeleton.distances, ...entry.distances },
  };

  delete merged.qaNote;

  if (entry.qaNote && !merged.notes) {
    merged.notes = entry.qaNote;
  }

  if (merged.confidence === "verified" && merged.reviewStatus === "not_started") {
    merged.reviewStatus = "parsed";
    merged.notes = [merged.notes, "QA: verified confidence requires manual reviewStatus upgrade"].filter(Boolean).join(" ");
  }

  if (merged.confidence === "ordinance_based" && merged.reviewStatus === "not_started") {
    merged.reviewStatus = "source_found";
  }

  if (merged.confidence === "needs_verification" && merged.reviewStatus === "not_started") {
    merged.reviewStatus = "not_started";
  }

  if (merged.sourceUrl === undefined) merged.sourceUrl = "";
  if (merged.verifiedAt === undefined) merged.verifiedAt = null;
  if (merged.notes === undefined) merged.notes = "";

  return merged;
}

function buildSourceRegistry(regions) {
  /** @type {Record<string, { sources: object[] }>} */
  const entries = {};

  for (const region of regions) {
    const key = region.key ?? regionKey(region.sido, region.sigungu);
    entries[key] = {
      municipalityLabel: region.sigungu,
      sido: region.sido,
      sigungu: region.sigungu,
      sources: defaultSourceSkeleton(region.sigungu, region.sido),
    };
  }

  return {
    meta: {
      version: "2026-06-23",
      generatedAt: new Date().toISOString().slice(0, 10),
      description: "전국 지자체 태양광 조례·지침 source registry skeleton",
      regionCount: regions.length,
      entryCount: Object.keys(entries).length,
    },
    entries,
  };
}

function mergeKnownSourceHints(sourceRegistry, setbackEntries) {
  const hints = {
    "충청남도|논산시": [
      { type: "ordinance", name: "논산시 도시계획 조례", status: "not_started" },
      { type: "guideline", name: "논산시 개발행위허가 운영지침", status: "not_started" },
    ],
    "전라북도|전주시": [
      {
        type: "ordinance",
        name: "전주시 도시계획 조례",
        appendix: "[별표 26] 태양광 발전시설 허가기준",
        status: "source_found",
      },
    ],
  };

  for (const [key, sources] of Object.entries(hints)) {
    if (!sourceRegistry.entries[key]) continue;
    sourceRegistry.entries[key].sources = sources.map((hint) => ({
      sourceUrl: "",
      status: "not_started",
      ...hint,
    }));
    if (setbackEntries[key]) {
      sourceRegistry.entries[key].linkedSetbackReviewStatus = setbackEntries[key].reviewStatus;
    }
  }
}

function main() {
  if (!fs.existsSync(REGION_PATH)) {
    console.error("Missing region registry. Run: node scripts/build-korea-region-registry.mjs");
    process.exit(1);
  }

  const regionData = readJson(REGION_PATH);
  const regions = regionData.regions;

  const sourceRegistry = buildSourceRegistry(regions);

  let setbackData = readJson(SETBACK_PATH);
  const normalizedEntries = {};
  for (const [key, entry] of Object.entries(setbackData.entries ?? {})) {
    normalizedEntries[key] = normalizeExistingSetbackEntry(key, entry);
  }

  mergeKnownSourceHints(sourceRegistry, normalizedEntries);

  setbackData = {
    ...setbackData,
    meta: {
      ...setbackData.meta,
      version: "2026-06-23-step6.5",
      pipelineVersion: "6.5",
      regionRegistryVersion: regionData.meta.version,
      description:
        "지자체별 태양광 이격거리 기준 DB. Step 6.5 확장 필드(reviewStatus 등) 수용. 미등록 지자체는 common fallback.",
      registeredMunicipalities: Object.keys(normalizedEntries).length,
      nationwideRegionCount: regions.length,
    },
    entries: normalizedEntries,
  };

  writeJson(SOURCE_PATH, sourceRegistry);
  writeJson(SETBACK_PATH, setbackData);

  console.log(`Source registry: ${Object.keys(sourceRegistry.entries).length} entries → ${SOURCE_PATH}`);
  console.log(`Setback DB: ${Object.keys(normalizedEntries).length} curated entries (extended fields) → ${SETBACK_PATH}`);
  console.log("Parser hook: connect ordinance parser output to normalizeExistingSetbackEntry() + reviewStatus workflow");
}

main();
