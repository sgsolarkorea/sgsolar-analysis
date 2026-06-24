/**
 * Step 6.13 production verification
 */
const BASE = "https://sgsolar-analysis.vercel.app";
const TARGETS = ["서산시", "논산시", "군산시", "전주시", "평택시"];

async function waitForDeploy() {
  for (let i = 1; i <= 30; i++) {
    const res = await fetch(`${BASE}/api/admin/regulatory-review`, {
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.rows) && data.rows.length > 0) return true;
    }
    console.log(`Deploy wait ${i}/30`);
    await new Promise((r) => setTimeout(r, 10000));
  }
  return false;
}

console.log("=== Waiting for production deploy (Step 6.13) ===");
if (!(await waitForDeploy())) process.exit(1);

const res = await fetch(`${BASE}/api/admin/regulatory-review`);
const data = await res.json();
const pageRes = await fetch(`${BASE}/admin/regulatory-review`);

let failed = 0;
console.log(`API rows: ${data.rows.length}, page HTTP ${pageRes.status}`);

if (!pageRes.ok || !pageRes.headers.get("content-type")?.includes("text/html")) {
  console.error("FAIL admin page");
  failed += 1;
}

for (const name of TARGETS) {
  const row = data.rows.find((item) => item.municipalityLabel === name);
  if (!row) {
    console.error(`FAIL missing ${name}`);
    failed += 1;
    continue;
  }
  console.log(`PASS ${name} · ${row.reviewStatus} · link=${row.hasSourceUrl}`);
}

const resultRes = await fetch(
  `${BASE}/result?address=${encodeURIComponent("충남 서산시 대산읍 기은리 698-6")}`,
);
const resultHtml = await resultRes.text();
if (!resultHtml.includes("조례정보") || resultHtml.includes("parsed QA")) {
  console.error("FAIL result page regression");
  failed += 1;
} else {
  console.log("PASS result page unchanged");
}

if (failed) process.exit(1);
console.log("\nAll Step 6.13 production checks passed");
