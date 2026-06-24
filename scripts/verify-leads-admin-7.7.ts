/**
 * Step 7.7 — Lead stats and conversion dashboard verification
 */
import { computeLeadAdminStats } from "../src/lib/leads/adminMetrics";
import { mergeLeadUpdate } from "../src/lib/leads/leadRecordHelpers";
import { createLeadRecord } from "../src/lib/leads/storage";

let failed = 0;

function assert(label: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`OK: ${label}`);
  }
}

function main() {
  const base = createLeadRecord({
    leadType: "pdf_download",
    phone: "01011112222",
    address: "A",
  });
  const consultation = createLeadRecord({
    leadType: "consultation",
    phone: "01022223333",
    address: "B",
  });
  const save = createLeadRecord({
    leadType: "save_result",
    phone: "01033334444",
    address: "C",
  });

  const leads = [
    base,
    consultation,
    mergeLeadUpdate(save, { status: "quoted" }),
    mergeLeadUpdate(createLeadRecord({ leadType: "consultation", phone: "01044445555", address: "D" }), {
      status: "contracted",
    }),
  ];

  const stats = computeLeadAdminStats(leads);
  const { kpi } = stats;

  assert("total", kpi.total === 4);
  assert("consultation conversion rate", kpi.consultationConversionRate === 50);
  assert("quote conversion rate", kpi.quoteConversionRate === 25);
  assert("contract conversion rate", kpi.contractConversionRate === 25);
  assert("hot leads", kpi.hotLeads === 2);
  assert("funnel pdf", stats.funnel[0]?.count === 1);
  assert("funnel consultation", stats.funnel[1]?.count === 2);
  assert("funnel quoted", stats.funnel[2]?.count === 1);
  assert("funnel contracted", stats.funnel[3]?.count === 1);
  assert("sources sum", stats.sources.reduce((sum, item) => sum + item.count, 0) === 4);
  assert("sources ratio sum ~100", Math.abs(stats.sources.reduce((sum, item) => sum + item.ratioPercent, 0) - 100) < 0.2);
  assert("daily inflow 7 days", stats.dailyInflow.length === 7);

  const empty = computeLeadAdminStats([]);
  assert("empty conversion rates", empty.kpi.consultationConversionRate === 0);
  assert("empty funnel zeros", empty.funnel.every((step) => step.count === 0));

  if (failed) process.exit(1);
  console.log("\nAll Step 7.7 lead stats checks passed");
}

main();
