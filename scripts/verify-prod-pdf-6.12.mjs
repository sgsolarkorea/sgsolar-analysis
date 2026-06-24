/**
 * Step 6.12 production PDF verification
 */
const BASE = "https://sgsolar-analysis.vercel.app";
const DEPLOY_MARKER = "조례정보";

const CASES = [
  { id: "eumseong", address: "충북 음성군 생극면 임곡리 49", minRows: 2 },
  { id: "seosan", address: "충남 서산시 대산읍 기은리 698-6", minRows: 1 },
  { id: "jeonju", address: "전주시 완산구 척동9길 9-3", minRows: 1 },
];

const BANNED = [/VWorld/i, /parser QA/i, /Open API/i, /source registry/i];

async function fetchPdf(address) {
  const res = await fetch(`${BASE}/api/report/pdf?address=${encodeURIComponent(address)}`, {
    headers: { "Cache-Control": "no-cache" },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, buf, text: buf.toString("latin1") };
}

async function waitForDeploy(maxAttempts = 30, intervalMs = 10000) {
  for (let i = 1; i <= maxAttempts; i++) {
    const { text, status } = await fetchPdf(CASES[0].address);
    if (status === 200 && text.includes(DEPLOY_MARKER)) {
      return { ready: true, attempts: i };
    }
    console.log(`Deploy wait ${i}/${maxAttempts} — PDF ordinance section not yet live`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { ready: false, attempts: maxAttempts };
}

console.log("=== Waiting for Vercel production deploy (Step 6.12) ===");
const deploy = await waitForDeploy();
if (!deploy.ready) {
  console.error("Deploy marker not found in PDF");
  process.exit(1);
}
console.log(`Deploy ready after ${deploy.attempts} attempt(s)\n`);

let failed = 0;
for (const c of CASES) {
  const { status, buf, text } = await fetchPdf(c.address);
  const lawMatches = (text.match(/law\.go\.kr/g) ?? []).length;
  const checks = {
    httpOk: status === 200,
    isPdf: buf.slice(0, 4).toString() === "%PDF",
    hasOrdinanceInfo: text.includes("조례정보"),
    hasSummary: text.includes("지자체 조례 검토"),
    hasDisclaimer: text.includes("사전 검토용 참고 자료"),
    hasLawUrl: lawMatches >= c.minRows,
    noBannedTerms: !BANNED.some((re) => re.test(text)),
    sizeOk: buf.length > 80_000,
  };
  console.log(`=== ${c.id}: ${c.address} (${buf.length} bytes) ===`);
  for (const [key, ok] of Object.entries(checks)) {
    console.log(`  ${ok ? "PASS" : "FAIL"} ${key}${key === "hasLawUrl" ? ` (${lawMatches})` : ""}`);
    if (!ok) failed += 1;
  }
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll Step 6.12 production PDF checks passed");
