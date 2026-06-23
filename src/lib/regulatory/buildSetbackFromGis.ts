import {
  measureAllSetbackTargets,
  type SetbackMeasureResult,
  type SetbackTargetSpec,
} from "@/lib/gis/distanceEngine";
import type { VworldFetchCounter } from "@/lib/gis/vworldClient";
import type { ParcelContext } from "@/types/siteIntel";
import type { SetbackJudgment, SetbackReview, SetbackReviewRow } from "@/types/regulatoryReview";

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

function formatEstimatedDistanceM(distanceM: number | null): string {
  if (distanceM == null) return "데이터 확인 필요";
  return `${distanceM}m`;
}

function resolveJudgment(standardM: number, distanceM: number | null): SetbackJudgment {
  if (distanceM == null) return "데이터 확인 필요";
  if (distanceM >= standardM) return "기본 확인";
  if (distanceM >= standardM * 0.5) return "조례 확인 필요";
  return "추가 검토 필요";
}

function buildRemark(result: SetbackMeasureResult, judgment: SetbackJudgment): string {
  if (judgment === "데이터 확인 필요") {
    return result.error ? `GIS 레이어 조회 실패 (${result.error})` : "GIS 레이어 데이터 확인 필요";
  }
  const parts: string[] = ["공공 GIS 기준 추정"];
  if (result.featureLabel) parts.push(result.featureLabel);
  if (result.layerId) parts.push(`레이어 ${result.layerId}`);
  return parts.join(" · ");
}

function measureToRow(target: SetbackTargetSpec, result: SetbackMeasureResult): SetbackReviewRow {
  const judgment = resolveJudgment(target.standardM, result.distanceM);
  return {
    item: target.label,
    detail: target.detail,
    standard: formatStandardM(target.standardM),
    estimatedDistanceM: result.distanceM,
    measured: formatEstimatedDistanceM(result.distanceM),
    judgment,
    remark: buildRemark(result, judgment),
  };
}

export interface BuildSetbackFromGisResult extends SetbackReview {
  layerErrors: Array<{ key: string; error: string }>;
}

export async function buildSetbackFromGis(
  parcel: ParcelContext,
  installType?: string,
  counter?: VworldFetchCounter,
): Promise<BuildSetbackFromGisResult> {
  const isRoof =
    installType?.includes("지붕") ||
    installType?.includes("옥상") ||
    installType?.includes("축사") ||
    installType?.includes("공장") ||
    installType?.includes("상가");

  const results = await measureAllSetbackTargets(parcel, SETBACK_GIS_TARGETS, counter);
  const rows = SETBACK_GIS_TARGETS.map((target, index) =>
    measureToRow(target, results[index]),
  );

  const layerErrors = results
    .filter((result) => result.distanceM == null && result.error)
    .map((result) => ({ key: result.key, error: result.error! }));

  const withDistance = results.filter((result) => result.distanceM != null).length;

  return {
    notice: isRoof
      ? "지붕형 태양광은 이격거리 조례에 무관하게 설치를 검토할 수 있습니다. 아래는 참고용 GIS 추정 거리입니다."
      : "아래 거리는 공공 GIS 기준 추정값이며, 최종 이격거리는 지자체 조례·현장 확인이 필요합니다.",
    rows,
    meta: {
      partial: layerErrors.length > 0 || withDistance < SETBACK_GIS_TARGETS.length,
      errors: layerErrors.map((entry) => `${entry.key}: ${entry.error}`),
      collectedAt: new Date().toISOString(),
      gisDistanceCount: withDistance,
    },
    layerErrors,
  };
}
