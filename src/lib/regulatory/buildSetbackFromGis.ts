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
import {
  formatSetbackStandardM,
  lookupSetbackRegulation,
  SETBACK_TARGET_DISTANCE_KEY,
} from "@/lib/regulatory/setbackRegulationDb";
import type { ParcelContext } from "@/types/siteIntel";
import type {
  ResolvedSetbackRegulation,
  SetbackAppliedStandard,
  SetbackReview,
  SetbackReviewRow,
} from "@/types/regulatoryReview";
import {
  buildSetbackStandardColumnLabel,
  buildSetbackStandardNotice,
} from "@/lib/regulatory/setbackRegulationDb";

const SETBACK_GIS_TARGET_DEFS: Omit<SetbackTargetSpec, "standardM">[] = [
  {
    key: "building",
    label: "건물/주거지",
    detail: "인근 건물",
    layerIds: ["LT_C_SPBD"],
    searchRadiusM: 350,
    featureSize: 100,
  },
  {
    key: "road",
    label: "도로",
    detail: "포장도로",
    layerIds: ["LT_C_UPISUQ151", "LT_L_SPRD"],
    searchRadiusM: 250,
    featureSize: 100,
  },
  {
    key: "river",
    label: "하천",
    layerIds: ["LT_C_WKMSTRM"],
    searchRadiusM: 350,
    featureSize: 100,
  },
  {
    key: "school",
    label: "학교",
    layerIds: ["LT_C_DHSCH", "LT_C_DMSCH", "LT_C_DESCH"],
    searchRadiusM: 350,
    featureSize: 50,
  },
  {
    key: "cultural",
    label: "문화재보호구역",
    layerIds: ["LT_C_UO301"],
    searchRadiusM: 350,
    featureSize: 50,
  },
];

function buildTargets(regulation: ResolvedSetbackRegulation): SetbackTargetSpec[] {
  return SETBACK_GIS_TARGET_DEFS.map((def) => {
    const distanceKey = SETBACK_TARGET_DISTANCE_KEY[def.key];
    const standardM = regulation.distances[distanceKey];
    return { ...def, standardM };
  });
}

function buildAppliedStandard(regulation: ResolvedSetbackRegulation): SetbackAppliedStandard {
  return {
    municipalityLabel: regulation.municipalityLabel,
    source: regulation.source,
    lastUpdated: regulation.lastUpdated,
    confidence: regulation.confidence,
    isFallback: regulation.isFallback,
    notice: buildSetbackStandardNotice(regulation),
    columnLabel: buildSetbackStandardColumnLabel(regulation),
  };
}

function measureToRow(target: SetbackTargetSpec, result: SetbackMeasureResult): SetbackReviewRow {
  const judgment = resolveSetbackJudgment(target.standardM, result.distanceM);
  return {
    item: target.label,
    detail: target.detail,
    standard: formatSetbackStandardM(target.standardM),
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
  options?: {
    installType?: string;
    address?: string;
    jibunAddress?: string;
    regulation?: ResolvedSetbackRegulation;
    counter?: VworldFetchCounter;
  },
): Promise<BuildSetbackFromGisResult> {
  const regulation =
    options?.regulation ??
    lookupSetbackRegulation(options?.address ?? "", options?.jibunAddress ?? "");
  const targets = buildTargets(regulation);
  const results = await measureAllSetbackTargets(parcel, targets, options?.counter);
  const rows = targets.map((target, index) => measureToRow(target, results[index]));

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
    appliedStandard: buildAppliedStandard(regulation),
    rows,
    meta: {
      partial: layerErrors.length > 0 || withDistance < targets.length,
      errors: layerErrors.map((entry) => `${entry.key}: ${entry.error}`),
      debug: layerErrors,
      collectedAt: new Date().toISOString(),
      gisDistanceCount: withDistance,
    },
    layerErrors,
  };
}

export { SETBACK_GIS_TARGET_DEFS as SETBACK_GIS_TARGETS };
