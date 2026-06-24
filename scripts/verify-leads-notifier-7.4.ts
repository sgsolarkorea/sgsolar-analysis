/**
 * Step 7.4 — Lead notifier verification
 */
import { LEAD_CRM_DEFAULTS } from "../src/lib/leads/leadRecordHelpers";
import { isLeadEmailRequired, notifyLeadCreated } from "../src/lib/leads/notifier";
import type { LeadRecord } from "../src/types/lead";

const sampleLead: LeadRecord = {
  id: "test-id",
  createdAt: new Date().toISOString(),
  leadType: "save_result",
  status: "new",
  source: "result_save",
  phone: "01000000000",
  address: "테스트 주소",
  ...LEAD_CRM_DEFAULTS,
};

let failed = 0;

function assert(label: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`OK: ${label}`);
  }
}

async function main() {
  assert("save_result email not required", !isLeadEmailRequired(sampleLead));
  assert("consultation email required", isLeadEmailRequired({ ...sampleLead, leadType: "consultation" }));

  const result = await notifyLeadCreated(sampleLead);
  assert("notifier returns email result", typeof result.email === "object");
  assert("admin_dashboard adapter ran", result.adapters.admin_dashboard?.ok === true);
  assert("slack adapter skipped", result.adapters.slack?.skipped === true);
  assert("solapi_sms adapter skipped", result.adapters.solapi_sms?.skipped === true);
  assert("solapi_kakao adapter skipped", result.adapters.solapi_kakao?.skipped === true);

  if (failed) process.exit(1);
  console.log("\nAll Step 7.4 notifier checks passed");
}

void main();
