import type { InfoField } from "@/types/siteReview";
import { getFieldValue, parseAreaSqm } from "@/lib/solar/calculate";

/** API 실패 시 sampleData 가짜 수치 대신 사용 — 용량 계산에 영향 없음 */
export function unavailableLandInfo(): InfoField[] {
  return [
    { label: "지목", value: "확인 필요", status: "확인 필요" },
    { label: "용도지역", value: "확인 필요", status: "확인 필요" },
    { label: "면적", value: "확인 필요", status: "확인 필요" },
    { label: "규제사항", value: "확인 필요", status: "추가 확인 필요" },
    { label: "토지이용계획", value: "확인 필요", status: "확인 필요" },
  ];
}

export function unavailableBuildingInfo(): InfoField[] {
  return [
    { label: "건물 용도", value: "확인 필요", status: "확인 필요" },
    { label: "구조", value: "확인 필요", status: "확인 필요" },
    { label: "건축면적", value: "확인 필요", status: "확인 필요" },
    { label: "연면적", value: "확인 필요", status: "확인 필요" },
    { label: "지상층수", value: "확인 필요", status: "확인 필요" },
    { label: "사용승인일", value: "확인 필요", status: "상담 시 확인" },
    { label: "지붕형태", value: "확인 필요", status: "추가 확인 필요" },
  ];
}

export type InfoDataSource = "API" | "unavailable-fallback" | "sampleData";

const SAMPLE_BUILDING_AREA = "820㎡";
const SAMPLE_LAND_AREA = "2,340㎡";

export function hasLandRecord(landInfo: InfoField[]): boolean {
  const landCategory = getFieldValue(landInfo, "지목");
  const landArea = getFieldValue(landInfo, "면적");
  const zoning = getFieldValue(landInfo, "용도지역");

  return (
    (landCategory !== "" && landCategory !== "확인 필요") ||
    (landArea !== "" && landArea !== "확인 필요") ||
    (zoning !== "" && zoning !== "확인 필요")
  );
}

export function hasBuildingRecord(buildingInfo: InfoField[]): boolean {
  const buildingUse = getFieldValue(buildingInfo, "건물 용도");
  const buildingArea = getFieldValue(buildingInfo, "건축면적");

  return (
    (buildingUse !== "" && buildingUse !== "확인 필요") ||
    (buildingArea !== "" && buildingArea !== "확인 필요")
  );
}

export function resolveInfoDataSource(
  fields: InfoField[],
  areaLabel: string,
): InfoDataSource {
  const areaValue = getFieldValue(fields, areaLabel);

  if (areaValue === SAMPLE_BUILDING_AREA || areaValue === SAMPLE_LAND_AREA) {
    return "sampleData";
  }

  if (fields.every((field) => field.value === "확인 필요")) {
    return "unavailable-fallback";
  }

  if (parseAreaSqm(areaValue) != null || fields.some((field) => field.value !== "확인 필요")) {
    return "API";
  }

  return "unavailable-fallback";
}
