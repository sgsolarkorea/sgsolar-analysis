/**
 * capacity-policy-v1 릴리즈 회귀 검증
 * run: npx tsx scripts/verify-capacity-policy-release.ts
 * optional: PROD_BASE=https://sgsolar-analysis.vercel.app npx tsx scripts/verify-capacity-policy-release.ts
 */
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

import { areaPerKwByType } from "../src/data/solarConfig";
import type { InstallTypeOption } from "../src/data/resultUx";
import { analyzeSolarSite } from "../src/lib/api/analysis";
import { lookupParcelByAddress } from "../src/lib/api/parcelLookup";
import { parseConsultationAnalysisContext } from "../src/lib/consultation/analysisContextFields";
import { formatCapacityDisplay, calculateSolarMetrics, getFieldValue, parseAreaSqm } from "../src/lib/solar/calculate";
import { resolveFinalCapacity } from "../src/lib/solar/capacityResolution";
import { resolveLayoutBoundary } from "../src/lib/solar/resolveLayoutBoundary";
import { resolveMultiParcelSiteGeometry } from "../src/lib/solar/resolveMultiParcelGeometry";
import {
  computeModuleLayout,
  computeMultiBuildingRoofModuleLayout,
} from "../src/lib/solar/moduleLayout";

const PROD_BASE = process.env.PROD_BASE?.replace(/\/$/, "");

type CaseSpec =
  | { kind: "single"; label: string; address: string }
  | {
      kind: "multi-parcel";
      label: string;
      primaryAddress: string;
      parcels: Array<{ address: string; isPrimary: boolean }>;
    };

const CASES: CaseSpec[] = [
  { kind: "single", label: "호성동 27-1", address: "전주시 덕진구 호성동1가 27-1" },
  { kind: "single", label: "척동9길 9-3", address: "전주시 완산구 척동9길 9-3" },
  {
    kind: "single",
    label: "창원 중리 1129-5",
    address: "경남 창원시 마산회원구 내서읍 중리 1129-5",
  },
  { kind: "single", label: "서산 기은리 698-6", address: "충남 서산시 대산읍 기은리 698-6" },
  {
    kind: "multi-parcel",
    label: "통영 신전리 5필지",
    primaryAddress: "경남 통영시 산양읍 신전리 1288-1",
    parcels: [
      { address: "경남 통영시 산양읍 신전리 1288-1", isPrimary: true },
      { address: "경남 통영시 산양읍 신전리 1320", isPrimary: false },
      { address: "경남 통영시 산양읍 신전리 1321", isPrimary: false },
      { address: "경남 통영시 산양읍 신전리 1287", isPrimary: false },
      { address: "경남 통영시 산양읍 신전리 1286", isPrimary: false },
    ],
  },
];

function buildConsultationContext(input: {
  metrics: Awaited<ReturnType<typeof analyzeSolarSite>>["solarMetrics"];
  parcelCount: number;
  layoutMode?: string;
}) {
  return parseConsultationAnalysisContext({
    installType: input.metrics.installType,
    capacity: formatCapacityDisplay(input.metrics.capacityKw),
    capacityKw: input.metrics.capacityKw,
    moduleCount: input.metrics.moduleCount,
    areaPerKw: input.metrics.areaPerKw,
    roofUsableAreaSqm: input.metrics.roofUsableAreaSqm,
    landUsableAreaSqm: input.metrics.usableAreaSqm,
    parcelCount: input.parcelCount,
    layoutMode: input.layoutMode,
  });
}

async function inspectSingle(address: string) {
  const data = await analyzeSolarSite(address);
  const buildingAreaSqm = parseAreaSqm(getFieldValue(data.buildingInfo, "건축면적"));
  const landAreaSqm = parseAreaSqm(getFieldValue(data.landInfo, "면적"));

  const { boundary, geometry } = await resolveLayoutBoundary({
    pnu: data.pnu ?? undefined,
    lat: data.lat,
    lng: data.lng,
    capacityKw: data.solarMetrics.capacityKw,
    installType: data.solarMetrics.installType,
    buildingAreaSqm: buildingAreaSqm ?? undefined,
    landAreaSqm: landAreaSqm ?? undefined,
  });

  const layout =
    data.solarMetrics.installType !== "토지형" &&
    geometry.buildingLayoutBoundaries &&
    geometry.buildingLayoutBoundaries.length > 1
      ? computeMultiBuildingRoofModuleLayout({
          boundaries: geometry.buildingLayoutBoundaries,
          polygonSource: "building",
          capacityKw: data.solarMetrics.capacityKw,
          installType: data.solarMetrics.installType,
          moduleCount: data.solarMetrics.moduleCount,
          centerLat: data.lat,
          centerLng: data.lng,
        })
      : computeModuleLayout({
          boundary,
          polygonSource: data.solarMetrics.installType === "토지형" ? "cadastral" : "building",
          capacityKw: data.solarMetrics.capacityKw,
          installType: data.solarMetrics.installType,
          moduleCount: data.solarMetrics.moduleCount,
          centerLat: data.lat,
          centerLng: data.lng,
        });

  const m = data.solarMetrics;
  const layoutKw = layout.arrayLayoutDiagnostics?.selectedPlacedKw ?? layout.stats.placedModuleCount * 0.64;
  const finalCap = resolveFinalCapacity({
    installType: m.installType as InstallTypeOption,
    areaBasedCapacityKw: m.capacityKw,
    layoutCapacityKw: layoutKw,
  });
  const consultation = buildConsultationContext({
    metrics: m,
    parcelCount: 1,
    layoutMode: layout.stats.layoutMode,
  });

  const pdfCapacityKw = (await analyzeSolarSite(address)).solarMetrics.capacityKw;

  let prodCapacityKw: number | null = null;
  if (PROD_BASE) {
    const html = await fetch(`${PROD_BASE}/result?address=${encodeURIComponent(address)}`, {
      cache: "no-store",
    }).then((r) => r.text());
    const match = html.match(/capacityKw\\":([\d.]+)/);
    prodCapacityKw = match ? Number(match[1]) : null;
  }

  const issues: string[] = [];
  if (consultation?.capacityKw !== m.capacityKw) issues.push("consultation.capacityKw mismatch");
  if (consultation?.moduleCount !== m.moduleCount) issues.push("consultation.moduleCount mismatch");
  if (pdfCapacityKw !== m.capacityKw) issues.push("pdf analyze capacity mismatch");
  if (prodCapacityKw != null && Math.abs(prodCapacityKw - m.capacityKw) > 0.01) {
    issues.push(`prod SSR ${prodCapacityKw} != local ${m.capacityKw}`);
  }
  if (m.installType !== "토지형" && finalCap.policy !== "building_area_only") {
    issues.push("building policy expected building_area_only");
  }
  if (m.installType !== "토지형" && finalCap.finalCapacityKw !== m.capacityKw) {
    issues.push("building finalCapacityKw must equal A");
  }

  return {
    address,
    installType: m.installType,
    uiCapacityKw: m.capacityKw,
    uiModuleCount: m.moduleCount,
    areaPerKw: m.areaPerKw,
    baseAreaSqm: m.baseAreaSqm,
    roofUsableAreaSqm: m.roofUsableAreaSqm,
    landUsableAreaSqm: m.usableAreaSqm,
    layoutMode: layout.stats.layoutMode,
    layoutCapacityKw: Math.round(layoutKw * 100) / 100,
    finalCapacityKw: finalCap.finalCapacityKw,
    capacityPolicy: finalCap.policy,
    consultation,
    pdfCapacityKw,
    prodCapacityKw,
    parcelCount: 1,
    ok: issues.length === 0,
    issues,
  };
}

async function inspectMultiParcel(spec: Extract<CaseSpec, { kind: "multi-parcel" }>) {
  const REGISTRY_TOTAL_SQM = 8549;
  const refs = [];
  for (const p of spec.parcels) {
    const parcel = await lookupParcelByAddress(p.address, { isPrimary: p.isPrimary });
    refs.push({
      pnu: parcel.pnu,
      lat: parcel.lat,
      lng: parcel.lng,
      isPrimary: p.isPrimary,
    });
  }

  const primary = refs.find((r) => r.isPrimary) ?? refs[0];
  const primaryData = await analyzeSolarSite(spec.primaryAddress);
  const multiGeometry = await resolveMultiParcelSiteGeometry({
    parcels: refs,
    capacityKw: primaryData.solarMetrics.capacityKw,
    registryLandAreaSqm: REGISTRY_TOTAL_SQM,
  });

  const mergedMetrics = calculateSolarMetrics({
    installType: "토지형",
    landInfo: primaryData.landInfo,
    buildingInfo: primaryData.buildingInfo,
    market: primaryData.solarMetrics.market,
    capacityAreaSqm: multiGeometry.capacityAreaSqm,
    capacityBasis: multiGeometry.capacityBasis,
    parcelCount: refs.length,
    displayUsableAreaSqm: multiGeometry.landUsableAreaSqm,
  });

  const { boundary, geometry } = await resolveLayoutBoundary({
    pnu: primary.pnu,
    lat: primary.lat,
    lng: primary.lng,
    capacityKw: mergedMetrics.capacityKw,
    installType: "토지형",
    landAreaSqm: REGISTRY_TOTAL_SQM,
    parcels: refs,
  });

  const layout = computeModuleLayout({
    boundary,
    polygonSource: "cadastral",
    capacityKw: mergedMetrics.capacityKw,
    installType: "토지형",
    moduleCount: mergedMetrics.metrics.moduleCount,
    centerLat: primary.lat,
    centerLng: primary.lng,
  });

  const m = mergedMetrics.metrics;
  const layoutKw = layout.arrayLayoutDiagnostics?.selectedPlacedKw ?? layout.stats.placedModuleCount * 0.64;
  const finalCap = resolveFinalCapacity({
    installType: m.installType as InstallTypeOption,
    areaBasedCapacityKw: m.capacityKw,
    layoutCapacityKw: layoutKw,
  });
  const consultation = buildConsultationContext({
    metrics: m,
    parcelCount: spec.parcels.length,
    layoutMode: layout.stats.layoutMode,
  });

  const issues: string[] = [];
  if (geometry.mergedParcelCount !== 5) issues.push(`mergedParcelCount=${geometry.mergedParcelCount}`);
  if (consultation?.parcelCount !== 5) issues.push("consultation.parcelCount != 5");
  if (consultation?.capacityKw !== m.capacityKw) issues.push("consultation.capacityKw mismatch");
  if (finalCap.policy !== "land_min_area_layout") issues.push("land policy expected land_min_area_layout");

  return {
    address: spec.primaryAddress,
    label: spec.label,
    installType: "토지형",
    uiCapacityKw: m.capacityKw,
    uiModuleCount: m.moduleCount,
    areaPerKw: m.areaPerKw,
    landUsableAreaSqm: geometry.landUsableAreaSqm ?? m.usableAreaSqm,
    mergedParcelCount: geometry.mergedParcelCount,
    layoutMode: layout.stats.layoutMode,
    layoutCapacityKw: Math.round(layoutKw * 100) / 100,
    finalCapacityKw: finalCap.finalCapacityKw,
    capacityPolicy: finalCap.policy,
    parcelCount: spec.parcels.length,
    consultation,
    ok: issues.length === 0,
    issues,
  };
}

async function main() {
  const results = [];
  for (const spec of CASES) {
    if (spec.kind === "single") {
      results.push({ label: spec.label, ...(await inspectSingle(spec.address)) });
    } else {
      results.push({ ...(await inspectMultiParcel(spec)) });
    }
  }

  const policy = {
    buildingAreaPerKw: areaPerKwByType.roof,
    landAreaPerKw: areaPerKwByType.land,
    tag: "capacity-policy-v1-building-4.45",
  };

  const allOk = results.every((r) => r.ok);
  console.log(JSON.stringify({ policy, allOk, results }, null, 2));
  if (!allOk) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
