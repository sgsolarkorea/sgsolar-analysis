/**
 * Regulatory DB validation (Step 6.5)
 * Usage: node scripts/validate-regulatory-db.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  CONFIDENCE_LEVELS,
  REGULATORY_SIDO_LIST,
  REVIEW_STATUSES,
  SOURCE_STATUSES,
  SOURCE_TYPES,
  regionKey,
} from "./lib/regulatory-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "src", "data", "regulatory");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8"));
}

function fail(errors) {
  console.error("\nValidation FAILED:");
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

function main() {
  const errors = [];
  const warnings = [];

  const regionData = readJson("korea-region-registry.json");
  const sourceData = readJson("regulation-source-registry.json");
  const setbackData = readJson("setback-regulations.json");

  const regionKeys = new Set(regionData.regions.map((r) => r.key));
  const sourceKeys = new Set(Object.keys(sourceData.entries ?? {}));
  const setbackKeys = new Set(Object.keys(setbackData.entries ?? {}));

  if (regionData.meta.regionCount !== regionData.regions.length) {
    errors.push(`region meta count mismatch: meta=${regionData.meta.regionCount} actual=${regionData.regions.length}`);
  }

  if (regionData.regions.length < 229) {
    warnings.push(`region count ${regionData.regions.length} < 229 target (address lookup granularity)`);
  }

  const sidoInRegistry = new Set(regionData.regions.map((r) => r.sido));
  for (const sido of REGULATORY_SIDO_LIST) {
    if (!sidoInRegistry.has(sido)) errors.push(`missing sido in region registry: ${sido}`);
  }

  for (const region of regionData.regions) {
    const expected = regionKey(region.sido, region.sigungu);
    if (region.key !== expected) errors.push(`region key mismatch: ${region.key} !== ${expected}`);
  }

  for (const key of regionKeys) {
    if (!sourceKeys.has(key)) errors.push(`source registry missing region key: ${key}`);
  }

  for (const key of sourceKeys) {
    if (!regionKeys.has(key)) errors.push(`source registry orphan key (not in region registry): ${key}`);
  }

  for (const key of setbackKeys) {
    if (!regionKeys.has(key)) {
      errors.push(`setback entry key not in region registry: ${key}`);
    }
  }

  for (const [key, entry] of Object.entries(sourceData.entries ?? {})) {
    if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
      errors.push(`source entry has no sources: ${key}`);
      continue;
    }
    for (const source of entry.sources) {
      if (!SOURCE_TYPES.includes(source.type)) errors.push(`invalid source type at ${key}: ${source.type}`);
      if (!SOURCE_STATUSES.includes(source.status)) errors.push(`invalid source status at ${key}: ${source.status}`);
      if (source.sourceUrl && !/^https:\/\/(www\.)?(law\.go\.kr|elis\.go\.kr)/.test(source.sourceUrl)) {
        warnings.push(`${key}/${source.type}: non-official domain URL ${source.sourceUrl}`);
      }
    }
  }

  let verifiedWithoutReview = 0;
  for (const [key, entry] of Object.entries(setbackData.entries ?? {})) {
    if (!CONFIDENCE_LEVELS.includes(entry.confidence)) {
      errors.push(`invalid confidence at ${key}: ${entry.confidence}`);
    }
    if (entry.reviewStatus && !REVIEW_STATUSES.includes(entry.reviewStatus)) {
      errors.push(`invalid reviewStatus at ${key}: ${entry.reviewStatus}`);
    }
    if (entry.confidence === "verified" && entry.reviewStatus !== "verified") {
      verifiedWithoutReview += 1;
      errors.push(`verified confidence without reviewStatus=verified at ${key}`);
    }
    if (entry.confidence === "verified" && !entry.verifiedAt) {
      warnings.push(`${key}: verified confidence but verifiedAt is null`);
    }
  }

  if (verifiedWithoutReview > 0) {
    errors.push(`found ${verifiedWithoutReview} verified confidence entries failing review gate`);
  }

  console.log("Regulatory DB validation");
  console.log(`  Regions: ${regionData.regions.length} (${regionData.meta.sidoCount} sido)`);
  console.log(`  Source registry entries: ${sourceKeys.size}`);
  console.log(`  Setback curated entries: ${setbackKeys.size}`);
  console.log(`  Setback keys ⊆ region: ${[...setbackKeys].every((k) => regionKeys.has(k))}`);
  console.log(`  Source keys = region keys: ${sourceKeys.size === regionKeys.size}`);

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const w of warnings) console.log(`  - ${w}`);
  }

  if (errors.length > 0) fail(errors);

  console.log("\nValidation PASSED");
}

main();
