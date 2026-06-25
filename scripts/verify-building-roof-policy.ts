/**
 * 건물형 policy 정합성 검증 (edge_tolerance production / dual max-fill / A-B basis)
 * run: npx tsx scripts/verify-building-roof-policy.ts
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
import { resolveFinalCapacity } from "../src/lib/solar/capacityResolution";
import { analyzeSolarSite } from "../src/lib/api/analysis";
import { resolveLayoutBoundary } from "../src/lib/solar/resolveLayoutBoundary";
import { resolveSiteGeometry } from "../src/lib/solar/resolveSiteGeometry";
import {
  computeModuleLayout,
  computeMultiBuildingRoofModuleLayout,
} from "../src/lib/solar/moduleLayout";
import { polygonAreaSqm } from "../src/lib/solar/polygonGeometry";
import { getFieldValue, parseAreaSqm } from "../src/lib/solar/calculate";

const ADDRESSES = [
  "전주시 덕진구 호성동1가 27-1",
  "전주시 완산구 척동9길 9-3",
  "경남 창원시 마산회원구 내서읍 중리 1129-5",
];

async function inspectAddress(address: string) {
  const data = await analyzeSolarSite(address);
  const buildingAreaSqm = parseAreaSqm(getFieldValue(data.buildingInfo, "건축면적"));
  const landAreaSqm = parseAreaSqm(getFieldValue(data.landInfo, "면적"));

  const geometry = await resolveSiteGeometry({
    pnu: data.pnu ?? undefined,
    lat: data.lat,
    lng: data.lng,
    capacityKw: data.solarMetrics.capacityKw,
    installType: data.solarMetrics.installType,
    buildingAreaSqm: buildingAreaSqm ?? undefined,
    landAreaSqm: landAreaSqm ?? undefined,
  });

  const { boundary, geometry: layoutGeometry } = await resolveLayoutBoundary({
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
    layoutGeometry.buildingLayoutBoundaries &&
    layoutGeometry.buildingLayoutBoundaries.length > 1
      ? computeMultiBuildingRoofModuleLayout({
          boundaries: layoutGeometry.buildingLayoutBoundaries,
          polygonSource: "building",
          capacityKw: data.solarMetrics.capacityKw,
          installType: data.solarMetrics.installType,
          moduleCount: data.solarMetrics.moduleCount,
          centerLat: data.lat,
          centerLng: data.lng,
        })
      : computeModuleLayout({
          boundary,
          polygonSource: "building",
          capacityKw: data.solarMetrics.capacityKw,
          installType: data.solarMetrics.installType,
          moduleCount: data.solarMetrics.moduleCount,
          centerLat: data.lat,
          centerLng: data.lng,
        });

  const d = layout.arrayLayoutDiagnostics;
  const layoutBoundaries =
    layoutGeometry.buildingLayoutBoundaries?.filter((b) => b.length >= 3) ??
    (boundary.length >= 3 ? [boundary] : []);
  const bUsableSqm = layoutBoundaries.reduce((sum, b) => sum + polygonAreaSqm(b), 0);
  const aBasisSqm = geometry.capacityAreaSqm;
  const aCapacityKw = data.solarMetrics.capacityKw;
  const bCapacityKw = d?.selectedPlacedKw ?? layout.stats.placedModuleCount * 0.64;
  const capacityResolution = resolveFinalCapacity({
    installType: data.solarMetrics.installType as InstallTypeOption,
    areaBasedCapacityKw: aCapacityKw,
    layoutCapacityKw: bCapacityKw,
  });

  return {
    address,
    capacityResolutionPolicy: capacityResolution.policy,
    areaBasedCapacityKw: capacityResolution.areaBasedCapacityKw,
    layoutCapacityKw: capacityResolution.layoutCapacityKw,
    finalCapacityKw: capacityResolution.finalCapacityKw,
    capacityLimitingFactor: capacityResolution.capacityLimitingFactor,
    selectedFittingPolicy: d?.selectedFittingPolicy,
    selectedToleranceM: d?.selectedToleranceM,
    strictPlacedModuleCount: d?.strictPlacedModuleCount,
    edgeTolerancePlacedModuleCount: d?.edgeTolerancePlacedModuleCount,
    selectedPlacedModuleCount: d?.selectedPlacedModuleCount ?? layout.stats.placedModuleCount,
    selectedCapacityKw: Math.round(bCapacityKw * 100) / 100,
    layoutMode: d?.layoutMode,
    targetQuotaUsedForLayout: d?.targetQuotaUsedForLayout ?? false,
    dualTargetQuotaLimited: d?.dualTargetQuotaLimited ?? false,
    targetQuotaLimited: d?.targetQuotaLimited ?? false,
    aBasisAreaSqm: Math.round(aBasisSqm * 100) / 100,
    bBasisAreaSqm: Math.round(bUsableSqm * 100) / 100,
    aBasisMatchesB: Math.abs(aBasisSqm - bUsableSqm) < 0.5,
    areaCapacityKw: aCapacityKw,
    areaPerKwUsed: areaPerKwByType.roof,
    reverseAreaPerKwB: bCapacityKw > 0 ? Math.round((bUsableSqm / bCapacityKw) * 100) / 100 : null,
    continuousMaxFill: d?.continuousMaxFill,
    dualMaxFill: d?.dualMaxFill,
  };
}

async function main() {
  const results = [];
  for (const address of ADDRESSES) {
    results.push(await inspectAddress(address));
  }
  console.log(JSON.stringify({ addresses: results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
