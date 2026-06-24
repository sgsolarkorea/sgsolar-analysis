/**
 * Step 7.7b — Admin bulk delete verification
 */
import { parseBulkUuidIds } from "../src/lib/admin/parseBulkIds";
import { deleteLead, createLeadRecord, saveLead } from "../src/lib/leads/storage";
import { deleteSearchHistoryEntry, saveSearchHistoryEntry } from "../src/lib/searchHistory/storage";
import type { ResolvedSiteReview } from "../src/types/siteReview";

let failed = 0;

function assert(label: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`OK: ${label}`);
  }
}

const sampleReview = {
  address: "테스트 주소",
  installType: "토지형",
  landCategory: "전",
  zoning: "계획관리지역",
  capacity: "100 kW",
  moduleCount: "250",
  annualGeneration: "120 MWh",
  annualRevenue: "1,200만원",
  landArea: "1,000㎡",
} as unknown as ResolvedSiteReview;

async function main() {
  assert("parseBulkUuidIds valid", parseBulkUuidIds({ ids: ["00000000-0000-4000-8000-000000000001"] })?.length === 1);
  assert("parseBulkUuidIds rejects invalid", parseBulkUuidIds({ ids: ["bad-id"] }) === null);
  assert("parseBulkUuidIds rejects empty", parseBulkUuidIds({ ids: [] }) === null);

  if (process.env.NODE_ENV === "development") {
    const lead = createLeadRecord({
      leadType: "save_result",
      phone: "01099998888",
      address: "bulk delete test lead",
    });
    await saveLead(lead);
    const deleted = await deleteLead(lead.id);
    assert("deleteLead removes entry", deleted.deleted);
    const missing = await deleteLead(lead.id);
    assert("deleteLead missing id safe", !missing.deleted);

    const saved = await saveSearchHistoryEntry(sampleReview, sampleReview.address);
    if (saved.saved) {
      const removed = await deleteSearchHistoryEntry(saved.entry.id);
      assert("deleteSearchHistoryEntry removes entry", removed.deleted);
      const missingHistory = await deleteSearchHistoryEntry(saved.entry.id);
      assert("deleteSearchHistoryEntry missing id safe", !missingHistory.deleted);
    } else {
      console.log("SKIP: search history storage unavailable in this environment");
    }
  }

  if (failed) process.exit(1);
  console.log("\nAll Step 7.7b bulk delete checks passed");
}

void main();
