/**
 * Step 6.9 — setback-manual-overrides.json validation
 * Usage: node scripts/validate-setback-manual-overrides.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CONFIDENCE_LEVELS, regionKey } from "./lib/regulatory-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OVERRIDE_PATH = path.join(ROOT, "src", "data", "regulatory", "setback-manual-overrides.json");
const REGION_PATH = path.join(ROOT, "src", "data", "regulatory", "korea-region-registry.json");

const REVIEW_STATUSES = ["manual_verified", "manual_pending"];
const DISTANCE_KEYS = ["residential", "building", "road", "river", "school", "cultural"];

function fail(errors) {
  console.error("\nValidation FAILED:");
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

function main() {
  const errors = [];
  const warnings = [];

  const data = JSON.parse(fs.readFileSync(OVERRIDE_PATH, "utf8"));
  const regionData = JSON.parse(fs.readFileSync(REGION_PATH, "utf8"));
  const regionKeys = new Set(regionData.regions.map((r) => r.key));

  if (!data.meta?.version) {
    errors.push("meta.version is required");
  }

  const entries = data.entries ?? {};
  for (const [key, entry] of Object.entries(entries)) {
    if (!regionKeys.has(key)) {
      errors.push(`orphan region key (not in korea-region-registry): ${key}`);
    }

    const expected = regionKey(entry.sido, entry.sigungu);
    if (key !== expected) {
      errors.push(`key mismatch for ${key}: expected ${expected}`);
    }

    if (!REVIEW_STATUSES.includes(entry.reviewStatus)) {
      errors.push(`${key}: invalid reviewStatus "${entry.reviewStatus}"`);
    }

    if (!CONFIDENCE_LEVELS.includes(entry.confidence)) {
      errors.push(`${key}: invalid confidence "${entry.confidence}"`);
    }

    if (!entry.source?.trim()) {
      errors.push(`${key}: source is required`);
    }

    if (!entry.sourceUrl?.trim()) {
      if (entry.reviewStatus === "manual_verified") {
        errors.push(`${key}: sourceUrl is required for manual_verified`);
      } else {
        warnings.push(`${key}: sourceUrl is empty (pending entry)`);
      }
    }

    if (entry.reviewStatus === "manual_verified") {
      if (!entry.verifiedAt?.trim()) {
        errors.push(`${key}: verifiedAt is required for manual_verified`);
      }
      if (!entry.verifiedBy?.trim()) {
        warnings.push(`${key}: verifiedBy is empty for manual_verified`);
      }
    } else if (entry.verifiedAt) {
      warnings.push(`${key}: verifiedAt set on manual_pending entry`);
    }

    if (!entry.distances || typeof entry.distances !== "object") {
      errors.push(`${key}: distances object is required`);
      continue;
    }

    for (const distKey of DISTANCE_KEYS) {
      const value = entry.distances[distKey];
      if (value !== null && typeof value !== "number") {
        errors.push(`${key}: distances.${distKey} must be number or null (got ${typeof value})`);
      }
      if (typeof value === "number" && (value < 0 || value > 5000)) {
        warnings.push(`${key}: distances.${distKey}=${value} looks unusual (0–5000m expected)`);
      }
    }

    if (typeof entry.distances.school === "number") {
      warnings.push(`${key}: school distance set — ensure ordinance evidence exists`);
    } else if (entry.distances.school !== null) {
      errors.push(`${key}: school must be number or null`);
    } else {
      warnings.push(`${key}: school is null (recommended unless ordinance evidence exists)`);
    }

    if (entry.reviewStatus === "manual_verified") {
      const hasAnyDistance = DISTANCE_KEYS.some(
        (k) => typeof entry.distances[k] === "number",
      );
      if (!hasAnyDistance) {
        errors.push(`${key}: manual_verified requires at least one explicit distance`);
      }
    }
  }

  console.log(`Validated ${Object.keys(entries).length} manual override entries (v${data.meta?.version})`);

  if (warnings.length) {
    console.warn("\nWarnings:");
    for (const w of warnings) console.warn(`  - ${w}`);
  }

  if (errors.length) fail(errors);

  console.log("\nValidation OK");
}

main();
