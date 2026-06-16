/**
 * REC 가중치·수익성 검증 스크립트
 * node scripts/rec-weight-verify.mjs
 */
import { smpPrice, recPrice, yearlyGenerationPerKw, resolveConstructionCostPerKw } from "../src/data/solarConfig.ts";
import {
  resolveLandRecWeight,
  resolveBuildingRecWeight,
  resolveLegacyLandRecWeight,
} from "../src/lib/solar/recWeight.ts";
import { calculateSolarMetrics } from "../src/lib/solar/calculate.ts";
import { calculateIrrPercent, calculateRoiPercent } from "../src/lib/solar/profitability.ts";

const market = {
  smpPrice,
  recPrice,
  smpDate: "fallback",
  recDate: "fallback",
  source: "solarConfig fallback",
  isFallback: true,
};

function calcByCapacity(capacityKw, category) {
  const areaPerKw = category === "land" ? 8.72 : 6.76;
  const baseAreaSqm = capacityKw * areaPerKw;
  const installType = category === "land" ? "토지형" : "지붕형";
  const landInfo = category === "land" ? [{ label: "면적", value: `${baseAreaSqm}㎡` }] : [];
  const buildingInfo = category === "land" ? [] : [{ label: "건축면적", value: `${baseAreaSqm}㎡` }];

  const out = calculateSolarMetrics({
    installType,
    landInfo,
    buildingInfo,
    market,
  });

  const { weight: recWeight, reason } =
    category === "land" ? resolveLandRecWeight(capacityKw) : resolveBuildingRecWeight(capacityKw);

  return {
    capacityKw: out.capacityKw,
    installType,
    formula: reason,
    recWeight,
    recRevenue: out.metrics.recRevenueWon,
    smpRevenue: out.metrics.smpRevenueWon,
    totalRevenue: out.metrics.totalRevenueWon,
    payback: out.metrics.paybackYears,
    roi: out.metrics.roiPercent,
    irr: out.metrics.irrPercent,
    cumulative20: out.metrics.revenue20YearWon,
  };
}

function legacyCalc(capacityKw) {
  const legacyWeight = resolveLegacyLandRecWeight(capacityKw);
  const annualGen = Math.round(capacityKw * yearlyGenerationPerKw);
  const smpRev = annualGen * smpPrice;
  const recRev = (annualGen / 1000) * recPrice * legacyWeight;
  const total = smpRev + recRev;
  const cost = Math.round(capacityKw * resolveConstructionCostPerKw(capacityKw));
  return {
    recWeight: legacyWeight,
    recRevenue: recRev,
    smpRevenue: smpRev,
    totalRevenue: total,
    payback: total > 0 ? Math.round((cost / total) * 10) / 10 : 0,
    roi: calculateRoiPercent(cost, total),
    irr: calculateIrrPercent(cost, total),
    cumulative20: total * 20,
  };
}

function printTable(title, rows, cols) {
  console.log(`\n=== ${title} ===`);
  console.log(cols.join(" | "));
  console.log("-".repeat(cols.join(" | ").length));
  for (const r of rows) {
    console.log(cols.map((c) => String(r[c] ?? "")).join(" | "));
  }
}

const landCases = [50, 99, 100, 150, 500, 1000, 1560.6, 3000, 3500];
const buildingCases = [50, 500, 1000, 3000, 3500, 5000];

const landRows = landCases.map((kw) => {
  const r = calcByCapacity(kw, "land");
  return {
    총용량: `${kw}kW`,
    설치유형: "토지형",
    계산식: r.formula.slice(0, 40) + (r.formula.length > 40 ? "…" : ""),
    "REC 가중치": r.recWeight,
    "REC 수익": Math.round(r.recRevenue).toLocaleString("ko-KR"),
    연매출: Math.round(r.totalRevenue).toLocaleString("ko-KR"),
  };
});

const buildingRows = buildingCases.map((kw) => {
  const r = calcByCapacity(kw, "building");
  return {
    총용량: `${kw}kW`,
    설치유형: "건축물형",
    계산식: r.formula.slice(0, 40) + (r.formula.length > 40 ? "…" : ""),
    "REC 가중치": r.recWeight,
    "REC 수익": Math.round(r.recRevenue).toLocaleString("ko-KR"),
    연매출: Math.round(r.totalRevenue).toLocaleString("ko-KR"),
  };
});

printTable("토지형 테스트", landRows, ["총용량", "설치유형", "REC 가중치", "REC 수익", "연매출"]);
printTable("건축물형 테스트", buildingRows, ["총용량", "설치유형", "REC 가중치", "REC 수익", "연매출"]);

const kw1560 = 1560.6;
const before = legacyCalc(kw1560);
const after = calcByCapacity(kw1560, "land");

const compareRows = [
  {
    항목: "REC 가중치",
    수정전: before.recWeight,
    수정후: after.recWeight,
  },
  {
    항목: "REC 수익(원/년)",
    수정전: Math.round(before.recRevenue).toLocaleString("ko-KR"),
    수정후: Math.round(after.recRevenue).toLocaleString("ko-KR"),
  },
  {
    항목: "SMP 수익(원/년)",
    수정전: Math.round(before.smpRevenue).toLocaleString("ko-KR"),
    수정후: Math.round(after.smpRevenue).toLocaleString("ko-KR"),
  },
  {
    항목: "총 연매출(원/년)",
    수정전: Math.round(before.totalRevenue).toLocaleString("ko-KR"),
    수정후: Math.round(after.totalRevenue).toLocaleString("ko-KR"),
  },
  {
    항목: "투자비 회수(년)",
    수정전: before.payback,
    수정후: after.payback,
  },
  {
    항목: "ROI (20년 %)",
    수정전: before.roi,
    수정후: after.roi,
  },
  {
    항목: "IRR (20년 %)",
    수정전: before.irr,
    수정후: after.irr,
  },
  {
    항목: "20년 누적 매출(원)",
    수정전: Math.round(before.cumulative20).toLocaleString("ko-KR"),
    수정후: Math.round(after.cumulative20).toLocaleString("ko-KR"),
  },
];

printTable(`운봉리 114+113+117 (${kw1560}kW) 비교`, compareRows, ["항목", "수정전", "수정후"]);

console.log("\n[공식 검증 1560.6kW]");
const expected =
  Math.floor(((99.999 * 1.2 + (1560.6 - 99.999) * 1.0) / 1560.6) * 10000) / 10000;
console.log("기대 REC 가중치:", expected);
console.log("실제 REC 가중치:", after.recWeight);
