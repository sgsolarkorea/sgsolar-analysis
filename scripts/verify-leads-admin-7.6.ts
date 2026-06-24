/**
 * Step 7.6 — Lead CRM detail management verification
 */
import { computeLeadAdminKpi } from "../src/lib/leads/adminMetrics";
import { parseLeadAdminPatch } from "../src/lib/leads/adminPatch";
import {
  isLeadOverdue,
  mergeLeadUpdate,
  normalizeLeadRecord,
} from "../src/lib/leads/leadRecordHelpers";
import { createLeadRecord } from "../src/lib/leads/storage";
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

function main() {
  const legacy = {
    id: "legacy-id",
    createdAt: "2026-01-01T00:00:00.000Z",
    leadType: "save_result",
    status: "new",
    source: "result_save",
    phone: "01000000000",
    address: "레거시 주소",
  } as LeadRecord;

  const normalized = normalizeLeadRecord(legacy);
  assert("legacy memo default", normalized.memo === "");
  assert("legacy nextFollowUpAt default", normalized.nextFollowUpAt === null);
  assert("legacy lostReason default", normalized.lostReason === null);

  const base = createLeadRecord({
    leadType: "consultation",
    name: "테스트",
    phone: "01011112222",
    address: "충남 서산시",
  });

  const withCrm = mergeLeadUpdate(base, {
    memo: "  통화 완료  ",
    nextAction: "견적 작성",
    nextFollowUpAt: "2026-06-19T03:00:00.000Z",
  });
  assert("memo trimmed", withCrm.memo === "통화 완료");
  assert("nextAction saved", withCrm.nextAction === "견적 작성");
  assert("nextFollowUpAt saved", withCrm.nextFollowUpAt === "2026-06-19T03:00:00.000Z");

  const contacted = mergeLeadUpdate(withCrm, { status: "contacted" });
  assert("contactedAt auto-set", contacted.contactedAt !== null);
  assert("contactedAt preserved on re-save", mergeLeadUpdate(contacted, { status: "quoted" }).contactedAt === contacted.contactedAt);

  const quoted = mergeLeadUpdate(contacted, { status: "quoted" });
  assert("quotedAt auto-set", quoted.quotedAt !== null);

  const contracted = mergeLeadUpdate(quoted, { status: "contracted" });
  assert("contractedAt auto-set", contracted.contractedAt !== null);

  const overdueLead = mergeLeadUpdate(base, {
    nextFollowUpAt: "2020-01-01T00:00:00.000Z",
    status: "contacted",
  });
  assert("overdue when follow-up past", isLeadOverdue(overdueLead));
  assert("not overdue when contracted", !isLeadOverdue({ ...overdueLead, status: "contracted" }));
  assert("not overdue when rejected", !isLeadOverdue({ ...overdueLead, status: "rejected" }));

  const patch = parseLeadAdminPatch({
    status: "hold",
    memo: "보류",
    lostReason: "예산 부족",
  });
  assert("parseLeadAdminPatch status", patch?.status === "hold");
  assert("parseLeadAdminPatch lostReason", patch?.lostReason === "예산 부족");
  assert("parseLeadAdminPatch rejects invalid status", parseLeadAdminPatch({ status: "invalid" }) === null);

  const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayIso = new Date(
    Date.UTC(todayKst.getUTCFullYear(), todayKst.getUTCMonth(), todayKst.getUTCDate(), 12, 0, 0),
  ).toISOString();

  const kpiLeads: LeadRecord[] = [
    mergeLeadUpdate(base, { nextFollowUpAt: todayIso, status: "contacted" }),
    mergeLeadUpdate(createLeadRecord({ leadType: "save_result", phone: "01022223333", address: "A" }), {
      nextFollowUpAt: "2020-01-01T00:00:00.000Z",
      status: "new",
    }),
    mergeLeadUpdate(createLeadRecord({ leadType: "pdf_download", phone: "01033334444", address: "B" }), {
      status: "contracted",
    }),
  ];

  const kpi = computeLeadAdminKpi(kpiLeads);
  assert("kpi todayFollowUpCount", kpi.todayFollowUpCount >= 1);
  assert("kpi overdueCount", kpi.overdueCount >= 1);
  assert("kpi contracted", kpi.contracted === 1);

  if (failed) process.exit(1);
  console.log("\nAll Step 7.6 lead CRM checks passed");
}

main();
