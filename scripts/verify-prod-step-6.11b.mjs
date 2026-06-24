/**
 * Step 6.11b production verification — copy + VWorld removal
 */
const BASE = "https://sgsolar-analysis.vercel.app";
const DEPLOY_MARKER = "공식 법규 기반";

const BANNED = [/VWorld/i, /VWORLD/i, /parser QA/i, /production/i, /source registry/i, /Open API/i];

const CASES = [
  {
    id: "eumseong",
    address: "충북 음성군 생극면 임곡리 49",
    checks: (html, infoSection) => ({
      hasBadge: infoSection.includes("공식 법규 기반"),
      hasOrdinanceInfo: infoSection.includes("조례정보"),
      hasLink: infoSection.includes("law.go.kr"),
      hasDisclaimer: html.includes("사전 검토용 참고 자료"),
      kepcoOffice: html.includes("음성지사"),
      noBannedTerms: !BANNED.some((re) => re.test(infoSection + extractSection(html, "local-ordinance") + extractSection(html, "land-info") + extractSection(html, "region-district"))),
      noAppError: !html.includes("Application error"),
    }),
  },
  {
    id: "seosan",
    address: "충남 서산시 대산읍 기은리 698-6",
    checks: (html, infoSection) => ({
      hasBadge: infoSection.includes("공식 법규 기반"),
      hasLink: infoSection.includes("law.go.kr"),
      summaryCopy: html.includes("조례 원문 기준으로 주요 검토 항목을 요약"),
      noBannedTerms: !BANNED.some((re) => re.test(infoSection + extractSection(html, "local-ordinance") + extractSection(html, "land-info") + extractSection(html, "region-district"))),
      noAppError: !html.includes("Application error"),
    }),
  },
  {
    id: "jeonju",
    address: "전주시 완산구 척동9길 9-3",
    checks: (html, infoSection) => ({
      hasBadge: infoSection.includes("공식 법규 기반"),
      hasLink: infoSection.includes("law.go.kr"),
      manualPending: html.includes("조례 수동 검토"),
      noBannedTerms: !BANNED.some((re) => re.test(infoSection + extractSection(html, "local-ordinance") + extractSection(html, "land-info") + extractSection(html, "region-district"))),
      noAppError: !html.includes("Application error"),
    }),
  },
];

function extractSection(html, id) {
  const start = html.indexOf(`id="${id}"`);
  if (start < 0) return "";
  const end = html.indexOf("<section", start + 10);
  return end > start ? html.slice(start, end) : html.slice(start, start + 15000);
}

async function fetchHtml(address) {
  const res = await fetch(`${BASE}/result?address=${encodeURIComponent(address)}`, {
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  return { status: res.status, html: await res.text() };
}

async function waitForDeploy(maxAttempts = 30, intervalMs = 10000) {
  for (let i = 1; i <= maxAttempts; i++) {
    const { html } = await fetchHtml(CASES[0].address);
    if (html.includes(DEPLOY_MARKER)) {
      return { ready: true, attempts: i };
    }
    console.log(`Deploy wait ${i}/${maxAttempts} — 6.11b marker not yet live`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { ready: false, attempts: maxAttempts };
}

console.log("=== Waiting for Vercel production deploy (Step 6.11b) ===");
const deploy = await waitForDeploy();
if (!deploy.ready) {
  console.error("Deploy marker not found after wait");
  process.exit(1);
}
console.log(`Deploy ready after ${deploy.attempts} attempt(s)\n`);

let failed = 0;
for (const c of CASES) {
  const { status, html } = await fetchHtml(c.address);
  const infoSection = extractSection(html, "ordinance-info");
  const results = c.checks(html, infoSection);
  console.log(`=== ${c.id}: ${c.address} (HTTP ${status}) ===`);
  for (const [key, ok] of Object.entries(results)) {
    console.log(`  ${ok ? "PASS" : "FAIL"} ${key}`);
    if (!ok) failed += 1;
  }
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll Step 6.11b production checks passed");
