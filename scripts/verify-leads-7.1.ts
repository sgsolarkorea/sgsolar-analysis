/**
 * Step 7.1 — Lead capture funnel verification (unit-level)
 */
import { consultationToLeadInput } from "../src/lib/leads/fromConsultation";
import { createLeadRecord, saveLead } from "../src/lib/leads/storage";
import { validateLeadBody } from "../src/lib/leads/validate";
import { leadTypeToSource } from "../src/types/lead";
import type { ConsultationRequestBody, ConsultationSubmission } from "../src/types/consultation";

const BASE = {
  address: "충청남도 서산시 성연면 대포리 733",
  resultUrl: "https://sgsolar-analysis.vercel.app/result?address=test",
  pdfUrl: "https://sgsolar-analysis.vercel.app/api/report/pdf?address=test",
  installType: "토지형",
  estimatedCapacityKw: 450,
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

for (const leadType of ["pdf_download", "consultation", "save_result"] as const) {
  const source = leadTypeToSource(leadType);
  assert(`${leadType} source mapping`, source.length > 0);
}

const pdfValid = validateLeadBody({
  leadType: "pdf_download",
  name: "테스트",
  phone: "01012345678",
  email: "test@example.com",
  ...BASE,
});
assert("pdf_download validation", pdfValid.ok);

const saveValid = validateLeadBody({
  leadType: "save_result",
  phone: "01012345678",
  address: BASE.address,
  resultUrl: BASE.resultUrl,
  pdfUrl: BASE.pdfUrl,
});
assert("save_result validation", saveValid.ok);

const consultValid = validateLeadBody({
  leadType: "consultation",
  name: "테스트",
  phone: "01012345678",
  email: "test@example.com",
  message: "상담 문의",
  ...BASE,
});
assert("consultation validation", consultValid.ok);

if (pdfValid.ok) {
  const record = createLeadRecord(pdfValid.data);
  assert("pdf_download record leadType", record.leadType === "pdf_download");
  assert("pdf_download record status", record.status === "new");
  assert("pdf_download record source", record.source === "pdf_gate");
}

const submission: ConsultationSubmission = {
  id: "00000000-0000-4000-8000-000000000001",
  submittedAt: new Date().toISOString(),
  name: "테스트",
  phone: "01012345678",
  email: "test@example.com",
  address: BASE.address,
  installType: "토지형",
  message: "상담 문의",
  resultPageUrl: BASE.resultUrl,
};

const consultRequest: ConsultationRequestBody = {
  name: submission.name,
  phone: submission.phone,
  email: submission.email,
  address: submission.address,
  installType: submission.installType,
  message: submission.message,
  resultPageUrl: BASE.resultUrl,
  pdfUrl: BASE.pdfUrl,
  analysisContext: { capacity: "450 kW" },
};

const consultLeadInput = consultationToLeadInput(submission, consultRequest);
assert("consultation lead mapping", consultLeadInput.leadType === "consultation");
assert("consultation capacity parse", consultLeadInput.estimatedCapacityKw === 450);

if (process.env.NODE_ENV === "development") {
  const devRecord = createLeadRecord({
    leadType: "save_result",
    phone: "01099998888",
    address: BASE.address,
    resultUrl: BASE.resultUrl,
  });
  saveLead(devRecord).then((result) => {
    assert("dev memory save", result.saved);
    if (failed) process.exit(1);
    console.log("\nAll Step 7.1 lead funnel checks passed");
  });
} else {
  if (failed) process.exit(1);
  console.log("\nAll Step 7.1 lead funnel checks passed");
}
