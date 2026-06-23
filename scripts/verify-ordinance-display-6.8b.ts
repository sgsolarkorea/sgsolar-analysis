/**
 * Step 6.8b — ordinance display verification
 */
import { resolveOrdinanceDisplay } from "../src/lib/regulatory/resolveOrdinanceDisplay";

const CASES = [
  { label: "전주", address: "전주시 완산구 척동9길 9-3" },
  { label: "평택", address: "경기도 평택시 청북읍 토진리 314-14" },
  { label: "서산", address: "충남 서산시 대산읍 기은리 698-6" },
];

for (const { label, address } of CASES) {
  const result = resolveOrdinanceDisplay(address);
  const card = result.cards[0];
  console.log(`\n=== ${label} ===`);
  console.log(
    JSON.stringify(
      {
        displayStatus: result.policy.displayStatus,
        isUrbanMetro: result.policy.isUrbanMetro,
        hideSetback: result.policy.hideSetbackDistances,
        includeSchool: result.policy.includeSchoolSetback,
        ordinanceName: card?.ordinanceName,
        articleTitle: card?.articleTitle,
        has1000m: card?.summaryBullets.some((b) => b.includes("1000")),
        hasSchool: card?.summaryBullets.some((b) => b.includes("학교")),
        bullets: card?.summaryBullets,
        sourceUrl: card?.sourceUrl?.includes("law.go.kr") ? "law.go.kr OK" : card?.sourceUrl,
      },
      null,
      2,
    ),
  );
}
