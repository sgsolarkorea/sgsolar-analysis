import {
  measureAllSetbackTargets,
  type SetbackMeasureResult,
  type SetbackTargetSpec,
} from "@/lib/gis/distanceEngine";
import type { VworldFetchCounter } from "@/lib/gis/vworldClient";
import {
  buildSetbackGuidance,
  formatSetbackDistanceDisplay,
  resolveSetbackJudgment,
  SETBACK_SECTION_NOTICE,
} from "@/lib/regulatory/setbackDisplay";
import type { ParcelContext } from "@/types/siteIntel";
import type { SetbackReview, SetbackReviewRow } from "@/types/regulatoryReview";

export const SETBACK_GIS_TARGETS: SetbackTargetSpec[] = [
  {
    key: "building",
    label: "건물/주거지",
    detail: "인근 건물",
    standardM: 200,
    layerIds: ["LT_C_SPBD"],
    searchRadiusM: 350,
    featureSize: 100,
  },
  {
    key: "road",
    label: "도로",
    detail: "포장도로",
    standardM: 100,
    layerIds: ["LT_C_UPISUQ151", "LT_L_SPRD"],
    searchRadiusM: 250,
    featureSize: 100,
  },
  {
    key: "river",
    label: "하천",
    standardM: 100,
    layerIds: ["LT_C_WKMSTRM"],
    searchRadiusM: 350,
    featureSize: 100,
  },
  {
    key: "school",
    label: "학교",
    standardM: 100,
    layerIds: ["LT_C_DHSCH", "LT_C_DMSCH", "LT_C_DESCH"],
    searchRadiusM: 350,
    featureSize: 50,
  },
  {
    key: "cultural",
    label: "문화재보호구역",
    standardM: 100,
    layerIds: ["LT_C_UO301"],
    searchRadiusM: 350,
    featureSize: 50,
  },
];

function formatStandardM(standardM: number): string {
  return `${standardM}m`;
}

function measureToRow(target: SetbackTargetSpec, result: SetbackMeasureResult): SetbackReviewRow {
  const judgment = resolveSetbackJudgment(target.standardM, result.distanceM);
  return {
    item: target.label,
    detail: target.detail,
    standard: formatStandardM(target.standardM),
    estimatedDistanceM: result.distanceM,
    measured: formatSetbackDistanceDisplay(result.distanceM),
    judgment,
    remark: buildSetbackGuidance({
      targetKey: target.key,
      standardM: target.standardM,
      distanceM: result.distanceM,
      judgment,
    }),
  };
}

export interface BuildSetbackFromGisResult extends SetbackReview {
  layerErrors: Array<{ key: string; error: string; layerId?: string }>;
}

export async function buildSetbackFromGis(
  parcel: ParcelContext,
  _installType?: string,
  counter?: VworldFetchCounter,
): Promise<BuildSetbackFromGisResult> {
  const results = await measureAllSetbackTargets(parcel, SETBACK_GIS_TARGETS, counter);
  const rows = SETBACK_GIS_TARGETS.map((target, index) =>
    measureToRow(target, results[index]),
  );

  const layerErrors = results
    .filter((result) => result.distanceM == null && result.error)
    .map((result) => ({
      key: result.key,
      error: result.error!,
      layerId: result.layerId,
    }));

  if (layerErrors.length > 0) {
    console.debug("[SetbackReview] layer lookup details", layerErrors);
  }

  const withDistance = results.filter((result) => result.distanceM != null).length;

  return {
    notice: SETBACK_SECTION_NOTICE,
    rows,
    meta: {
      partial: layerErrors.length > 0 || withDistance < SETBACK_GIS_TARGETS.length,
      errors: layerErrors.map((entry) => `${entry.key}: ${entry.error}`),
      debug: layerErrors,
      collectedAt: new Date().toISOString(),
      gisDistanceCount: withDistance,
    },
    layerErrors,
  };
}
