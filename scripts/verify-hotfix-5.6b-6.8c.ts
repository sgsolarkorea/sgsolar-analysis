import { resolveKepcoOffice } from "../src/lib/kepco/resolveKepcoOffice";
import { resolveOrdinanceDisplay } from "../src/lib/regulatory/resolveOrdinanceDisplay";

const KEPCO_CASES = [
  "충북 음성군 생극면 임곡리 49",
  "충북 음성군 생극면 임곡리 49-1",
];

console.log("=== KEPCO ===");
for (const address of KEPCO_CASES) {
  const r = resolveKepcoOffice(address);
  console.log(
    JSON.stringify({
      address,
      office: r.officeName,
      basis: r.matchBasisLabel,
      phone: r.officePhoneDisplay,
      phoneStatus: r.phoneStatus,
    }),
  );
}

console.log("\n=== ORDINANCE ===");
for (const address of ["전주시 완산구 척동9길 9-3"]) {
  const r = resolveOrdinanceDisplay(address);
  const card = r.cards[0];
  console.log(
    JSON.stringify({
      address,
      displayStatus: r.policy.displayStatus,
      articleTitle: card?.articleTitle,
      has1000m: card?.summaryBullets.some((b) => b.includes("1000")),
      hasSchool: card?.summaryBullets.some((b) => b.includes("학교")),
      bullets: card?.summaryBullets,
    }),
  );
}
