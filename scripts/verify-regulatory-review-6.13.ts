/**
 * Step 6.13 — regulatory review admin verification
 */
import { buildRegulatoryReviewAdminData } from "../src/lib/regulatory/buildRegulatoryReviewAdminData";
import { formatManualOverrideJsonSnippet } from "../src/lib/regulatory/generateManualOverridePreview";

const TARGETS = ["서산시", "논산시", "군산시", "전주시", "평택시"];

const { rows, meta } = buildRegulatoryReviewAdminData();

console.log("meta:", JSON.stringify(meta, null, 2));

let failed = 0;
for (const name of TARGETS) {
  const row = rows.find((item) => item.municipalityLabel === name || item.sigungu === name);
  if (!row) {
    console.error(`FAIL missing row: ${name}`);
    failed += 1;
    continue;
  }

  const preview = formatManualOverrideJsonSnippet(row, "manual_verified");
  const checks = {
    hasSourceUrl: row.hasSourceUrl,
    reviewStatus: row.reviewStatus,
    confidence: row.parserConfidence,
    hasPreview: preview.includes(row.regionKey),
    hasDistances: preview.includes("distances"),
  };
  console.log(`\n=== ${name} ===`);
  console.log(JSON.stringify(checks, null, 2));
  if (!checks.hasPreview || !checks.hasDistances) failed += 1;
}

if (failed) process.exit(1);
console.log("\nAll Step 6.13 admin data checks passed");
