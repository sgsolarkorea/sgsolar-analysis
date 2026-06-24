/**
 * Step 7.2 — Admin leads dashboard verification
 */
import { computeLeadAdminKpi } from "../src/lib/leads/adminMetrics";
import { createLeadRecord } from "../src/lib/leads/storage";
import { leadTypeToScore } from "../src/types/lead";
import type { LeadRecord } from "../src/types/lead";

let failed = 0;

function assert(label: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`OK: ${label}`);
  }
}

const sampleLeads: LeadRecord[] = [
  createLeadRecord({
    leadType: "consultation",
    name: "홍길동",
    phone: "01011112222",
    address: "충남 서산시",
    installType: "토지형",
  }),
  createLeadRecord({
    leadType: "pdf_download",
    name: "김철수",
    phone: "01033334444",
    address: "전북 전주시",
    installType: "토지형",
  }),
  createLeadRecord({
    leadType: "save_result",
    phone: "01055556666",
    address: "경기 평택시",
  }),
];

sampleLeads[1].status = "contacted";
sampleLeads[2].status = "contracted";

const kpi = computeLeadAdminKpi(sampleLeads);
assert("kpi total", kpi.total === 3);
assert("kpi new", kpi.newLeads === 1);
assert("kpi inConsultation", kpi.inConsultation === 1);
assert("kpi contracted", kpi.contracted === 1);

assert("consultation score HOT", leadTypeToScore("consultation") === "HOT");
assert("pdf score WARM", leadTypeToScore("pdf_download") === "WARM");
assert("save score COLD", leadTypeToScore("save_result") === "COLD");

if (failed) process.exit(1);
console.log("\nAll Step 7.2 admin leads checks passed");
