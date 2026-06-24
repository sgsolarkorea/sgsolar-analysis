/**
 * Step 6.11 — ordinance info table verification
 */
import { resolveOrdinanceDisplay } from "../src/lib/regulatory/resolveOrdinanceDisplay";
import { resolveOrdinanceInfoList } from "../src/lib/regulatory/resolveOrdinanceInfoList";

const CASES = [
  "충북 음성군 생극면 임곡리 49",
  "충남 서산시 대산읍 기은리 698-6",
  "전주시 완산구 척동9길 9-3",
];

let failed = 0;

for (const address of CASES) {
  const display = resolveOrdinanceDisplay(address);
  const info = resolveOrdinanceInfoList(address, "", display, null);
  console.log(`\n=== ${address} ===`);
  console.log(
    JSON.stringify(
      {
        rowCount: info.rows.length,
        hasLinks: info.hasOfficialLinks,
        rows: info.rows.map((r) => ({
          kind: r.kind,
          name: r.name,
          revisedAt: r.revisedAt,
          hasLink: Boolean(r.sourceUrl),
          link: r.sourceUrl?.includes("law.go.kr") ? "law.go.kr OK" : r.sourceUrl,
        })),
        cardCount: display.cards.length,
      },
      null,
      2,
    ),
  );
  if (info.rows.length === 0) {
    console.error("FAIL: no ordinance info rows");
    failed += 1;
  }
  if (!info.hasOfficialLinks) {
    console.error("FAIL: no official links");
    failed += 1;
  }
}

if (failed) process.exit(1);
console.log("\nAll Step 6.11 checks passed");
