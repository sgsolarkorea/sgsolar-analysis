/**
 * Step 6.12 — PDF ordinance info verification (HTML layer)
 */
import { resolveOrdinanceForAddress } from "../src/lib/ordinanceLearning/registry";
import { resolveOrdinanceDisplay } from "../src/lib/regulatory/resolveOrdinanceDisplay";
import { resolveOrdinanceInfoList } from "../src/lib/regulatory/resolveOrdinanceInfoList";
import { buildReportHtml } from "../src/lib/pdf/html/buildReportHtml";
import {
  PDF_ORDINANCE_INFO_DISCLAIMER,
  PDF_ORDINANCE_INFO_TITLE,
  PDF_ORDINANCE_SUMMARY_TITLE,
} from "../src/lib/pdf/reportContent";
import type { ResolvedSiteReview } from "../src/types/siteReview";

const CASES = [
  "충북 음성군 생극면 임곡리 49",
  "충남 서산시 대산읍 기은리 698-6",
  "전주시 완산구 척동9길 9-3",
];

const BANNED = [/VWorld/i, /parser QA/i, /production/i, /Open API/i, /source registry/i];

const stubAssets = {
  fontFacesCss: "",
  logoDataUrl: null,
  mapDataUrl: null,
  mapOverlaySvg: null,
  mapWidth: 640,
  mapHeight: 360,
  mapAvailable: false,
  mapFailureReason: "test",
};

const stubData = {
  address: "",
  jibunAddress: "",
  lat: 36.5,
  lng: 127.0,
  analyzedAt: "2026-06-24",
  capacity: "100kW",
  annualRevenue: "0",
  constructionCost: "0",
  landInfo: [],
  buildingInfo: [],
  layerARegulatoryAnalysis: { rows: [], sourceNote: "" },
  setbackReview: { rows: [], notice: "", appliedStandard: null },
  gridInfo: {
    status: "unknown",
    statusLabel: "확인 필요",
    substation: { name: "-", remainingMw: null, cumulativeMw: null },
    transformer: { name: "-", remainingMw: null, cumulativeMw: null },
    distributionLine: { name: "-", remainingMw: null, cumulativeMw: null },
  },
  solarMetrics: {
    installType: "토지형",
    capacityKw: 100,
    moduleCount: 0,
    baseAreaSqm: 0,
    baseAreaLabel: "토지",
    formula: "-",
    modulePowerW: 550,
    capacityDisclaimer: "-",
    market: null,
    recWeight: 1.0,
  },
  profitability: { recWeight: "1.0" },
  monthlyGeneration: [],
  recommendation: { grade: "B" as const, message: "검토 가능" },
  landInfoDetail: { landCategory: "-", area: "-", zoning: "-", dataSource: "api" },
  regionDistrictAnalysis: { rows: [] },
} as const;

let failed = 0;

async function main() {
for (const address of CASES) {
  const ordinanceResult = await resolveOrdinanceForAddress(address);
  const display = resolveOrdinanceDisplay(address, "", ordinanceResult.data);
  const info = resolveOrdinanceInfoList(address, "", display, ordinanceResult.data);

  const html = buildReportHtml(
    { ...stubData, address } as unknown as ResolvedSiteReview,
    stubAssets,
    { ordinanceInfo: info, ordinanceDisplay: display },
  );

  const checks = {
    hasOrdinanceInfoTitle: html.includes(PDF_ORDINANCE_INFO_TITLE),
    hasOrdinanceSummaryTitle: html.includes(PDF_ORDINANCE_SUMMARY_TITLE),
    hasLawUrl: html.includes("law.go.kr"),
    hasDisclaimer: html.includes(PDF_ORDINANCE_INFO_DISCLAIMER),
    rowCount: info.rows.length,
    cardCount: display.cards.length,
    noBannedTerms: !BANNED.some((re) => re.test(html)),
  };

  console.log(`\n=== ${address} ===`);
  console.log(JSON.stringify(checks, null, 2));

  for (const [key, ok] of Object.entries(checks)) {
    if (key === "rowCount" || key === "cardCount") continue;
    if (!ok) failed += 1;
  }
  if (checks.rowCount === 0) failed += 1;
}

if (failed) process.exit(1);
console.log("\nAll Step 6.12 PDF HTML checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
