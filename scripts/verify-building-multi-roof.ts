/**
 * Multi-building roof capacity verification — run: npx tsx scripts/verify-building-multi-roof.ts
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

import { analyzeSolarSite } from "../src/lib/api/analysis";
import { resolveSiteGeometryFromBundle, fetchSiteGeometryBundle } from "../src/lib/solar/resolveSiteGeometry";
import { getFieldValue, parseAreaSqm } from "../src/lib/solar/calculate";

const CASES = [
  "경남 창원시 마산회원구 내서읍 중리 1129-5",
  "전주시 완산구 척동9길 9-3",
];

async function inspect(address: string) {
  const data = await analyzeSolarSite(address);
  const buildingAreaSqm = parseAreaSqm(getFieldValue(data.buildingInfo, "건축면적"));
  const bundle = data.siteGeometryBundle;
  const geom = bundle
    ? resolveSiteGeometryFromBundle(bundle, {
        lat: data.lat,
        lng: data.lng,
        capacityKw: data.solarMetrics.capacityKw,
        installType: data.solarMetrics.installType,
      })
    : null;

  return {
    address,
    installType: data.solarMetrics.installType,
    calculatedCapacityKw: data.solarMetrics.capacityKw,
    targetModuleCount: data.solarMetrics.moduleCount,
    buildingFootprintAreaSqm: data.solarMetrics.buildingFootprintAreaSqm,
    buildingFootprintAreaSumSqm: data.solarMetrics.buildingFootprintAreaSumSqm,
    roofUsableAreaSqm: data.solarMetrics.roofUsableAreaSqm,
    registryBuildingAreaSqm: data.solarMetrics.registryBuildingAreaSqm,
    detectedBuildingCount: data.solarMetrics.detectedBuildingCount,
    usedBuildingCount: data.solarMetrics.usedBuildingCount,
    excludedBuildingCount: data.solarMetrics.excludedBuildingCount,
    capacityBasis: data.solarMetrics.capacityBasis,
    layoutBoundarySource: geom?.layoutBoundarySource,
    buildingLayoutBoundaryCount: geom?.buildingLayoutBoundaries?.length ?? 0,
    bundleDetected: bundle?.detectedBuildingCount,
    bundleUsed: bundle?.usedBuildingCount,
    bundlePolygonAreas: (bundle?.buildingPolygons ?? []).map((ring) => ring.length),
    registryFromBundle: bundle?.registryBuildingAreaSqm,
  };
}

async function main() {
  for (const address of CASES) {
    try {
      console.log(JSON.stringify(await inspect(address), null, 2));
    } catch (error) {
      console.error(JSON.stringify({ address, error: String(error) }, null, 2));
    }
    console.log("---");
  }
}

main();
