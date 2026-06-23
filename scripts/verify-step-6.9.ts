/**
 * Step 6.9 — manual override + verification addresses
 */
import { resolveKepcoOffice } from "../src/lib/kepco/resolveKepcoOffice";
import { lookupSetbackRegulation } from "../src/lib/regulatory/setbackRegulationDb";
import { resolveOrdinanceDisplay } from "../src/lib/regulatory/resolveOrdinanceDisplay";

const CASES = [
  {
    label: "전주",
    address: "전주시 완산구 척동9길 9-3",
    expect: {
      displayStatus: "manual_pending",
      hasManualOverride: true,
      hasParsedCandidate: false,
    },
  },
  {
    label: "서산",
    address: "충남 서산시 대산읍 기은리 698-6",
    expect: {
      hasParsedCandidate: true,
      hasManualOverride: false,
    },
  },
  {
    label: "음성 생극",
    address: "충북 음성군 생극면 임곡리 49",
    expect: {
      kepcoOffice: "음성지사",
    },
  },
];

let failed = 0;

for (const { label, address, expect } of CASES) {
  console.log(`\n=== ${label} ===`);
  const ordinance = resolveOrdinanceDisplay(address);
  const setback = lookupSetbackRegulation(address);

  const out = {
    address,
    displayStatus: ordinance.policy.displayStatus,
    hasManualOverride: ordinance.hasManualOverride ?? false,
    hasParsedCandidate: ordinance.hasParsedCandidate,
    ordinanceName: ordinance.cards[0]?.ordinanceName,
    articleTitle: ordinance.cards[0]?.articleTitle,
    bullets: ordinance.cards[0]?.summaryBullets,
    setbackSource: setback.source,
    setbackIsManual: setback.isManualOverride ?? false,
    setbackConfidence: setback.confidence,
  };

  if (expect.kepcoOffice) {
    const kepco = resolveKepcoOffice(address);
    Object.assign(out, {
      kepcoOffice: kepco.officeName,
      kepcoPhone: kepco.officePhoneDisplay,
    });
    if (kepco.officeName !== expect.kepcoOffice) {
      console.error(`FAIL: expected kepco ${expect.kepcoOffice}, got ${kepco.officeName}`);
      failed += 1;
    }
  }

  for (const [key, value] of Object.entries(expect)) {
    if (key === "kepcoOffice") continue;
    const actual =
      (out as Record<string, unknown>)[key] ??
      (ordinance as unknown as Record<string, unknown>)[key];
    if (actual !== value) {
      console.error(`FAIL: ${key} expected ${value}, got ${actual}`);
      failed += 1;
    }
  }

  console.log(JSON.stringify(out, null, 2));
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nAll Step 6.9 checks passed");
