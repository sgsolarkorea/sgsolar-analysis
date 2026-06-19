import type { LandInfoDetail, RegionDistrictAnalysis, RegionDistrictFeasibility, RegionDistrictRow } from "@/types/landInfo";
import { getFieldValue } from "@/lib/solar/calculate";
import type { InfoField } from "@/types/siteReview";

interface DistrictTemplate {
  district: string;
  keywords: string[];
  feasible: RegionDistrictFeasibility;
  feasibleCondition: string;
  restrictedCondition: string;
  unknownCondition: string;
}

const DISTRICT_TEMPLATES: DistrictTemplate[] = [
  {
    district: "농림지역",
    keywords: ["농림", "농업", "전", "답", "임야"],
    feasible: "가능",
    feasibleCondition: "발전소 건축 가능, 농지법·토지이용계획 추가 검토 필요",
    restrictedCondition: "농지 전용·농지법 추가 검토 필요",
    unknownCondition: "토지이용계획 확인 필요",
  },
  {
    district: "농업진흥구역",
    keywords: ["농업진흥"],
    feasible: "제한",
    feasibleCondition: "농지법·농업진흥구역 규제 검토",
    restrictedCondition: "농지법 적용, 전용허가 등 추가 검토",
    unknownCondition: "농업진흥구역 해당 여부 확인 필요",
  },
  {
    district: "계획관리지역",
    keywords: ["계획관리"],
    feasible: "가능",
    feasibleCondition: "계획관리지역 내 발전소 설치 검토 가능",
    restrictedCondition: "용도지역·개발행위허가 추가 검토",
    unknownCondition: "용도지역 확인 필요",
  },
  {
    district: "생산관리지역",
    keywords: ["생산관리"],
    feasible: "가능",
    feasibleCondition: "생산관리지역 내 설치 검토 가능",
    restrictedCondition: "개발행위허가·이격거리 추가 검토",
    unknownCondition: "용도지역 확인 필요",
  },
  {
    district: "보전관리지역",
    keywords: ["보전관리"],
    feasible: "제한",
    feasibleCondition: "보전관리지역 내 조건부 검토",
    restrictedCondition: "경관·개발밀도 기준 추가 검토",
    unknownCondition: "용도지역 확인 필요",
  },
  {
    district: "자연녹지지역",
    keywords: ["자연녹지", "녹지"],
    feasible: "가능",
    feasibleCondition: "자연녹지지역 내 설치 검토 가능",
    restrictedCondition: "경관·이격거리 추가 검토",
    unknownCondition: "용도지역 확인 필요",
  },
  {
    district: "개발제한구역",
    keywords: ["개발제한", "greenbelt"],
    feasible: "제한",
    feasibleCondition: "개발제한구역 예외 규정 검토",
    restrictedCondition: "개발제한구역 내 설치 제한 가능",
    unknownCondition: "개발제한구역 해당 여부 확인 필요",
  },
  {
    district: "가축사육제한구역",
    keywords: ["가축", "축사"],
    feasible: "제한",
    feasibleCondition: "가축사육제한구역 내 조건부 검토",
    restrictedCondition: "축사·가축 관련 규제 추가 검토",
    unknownCondition: "가축사육제한구역 확인 필요",
  },
  {
    district: "문화재보호구역",
    keywords: ["문화재", "역사문화"],
    feasible: "제한",
    feasibleCondition: "문화재보호구역 내 조건부 검토",
    restrictedCondition: "문화재청·경관심의 추가 검토",
    unknownCondition: "문화재보호구역 확인 필요",
  },
];

function hasUsableValue(value?: string | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== "확인 필요" && trimmed !== "—";
}

function buildContextText(landInfo: InfoField[], landDetail?: LandInfoDetail): string {
  return [
    getFieldValue(landInfo, "용도지역"),
    getFieldValue(landInfo, "지역·지구"),
    getFieldValue(landInfo, "토지이용계획"),
    getFieldValue(landInfo, "지목"),
    landDetail?.zoning,
    landDetail?.zoningSecondary,
    landDetail?.landUseSituation,
    landDetail?.regionDistrictSummary,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildConfirmedDataRows(
  landInfo: InfoField[],
  landDetail?: LandInfoDetail,
): RegionDistrictRow[] {
  const fieldSources: Array<{ district: string; value?: string | null }> = [
    { district: "지목", value: getFieldValue(landInfo, "지목") || landDetail?.landCategory },
    { district: "면적", value: getFieldValue(landInfo, "면적") || landDetail?.area },
    { district: "용도지역", value: getFieldValue(landInfo, "용도지역") || landDetail?.zoning },
    { district: "용도지구", value: landDetail?.zoningSecondary },
    { district: "지역·지구", value: getFieldValue(landInfo, "지역·지구") || landDetail?.regionDistrictSummary },
    { district: "토지이용계획", value: getFieldValue(landInfo, "토지이용계획") || landDetail?.landUseSituation },
  ];

  return fieldSources
    .filter((field) => hasUsableValue(field.value))
    .map((field) => ({
      district: field.district,
      feasibility: "확인 완료" as RegionDistrictFeasibility,
      condition: field.value!.trim(),
    }));
}

function resolveRow(template: DistrictTemplate, context: string, hasLandData: boolean): RegionDistrictRow {
  const matched = template.keywords.some((keyword) => context.includes(keyword));

  if (!hasLandData || !context || context === "확인 필요") {
    return {
      district: template.district,
      feasibility: "추가 확인 필요",
      condition: template.unknownCondition,
    };
  }

  if (matched) {
    return {
      district: template.district,
      feasibility: template.feasible,
      condition: template.feasibleCondition,
    };
  }

  return {
    district: template.district,
    feasibility: "기본 확인",
    condition: "조회 기준 해당 없음 · 세부 규제는 상담 시 확인",
  };
}

export function resolveRegionDistrictAnalysis(
  landInfo: InfoField[],
  landDetail?: LandInfoDetail,
): RegionDistrictAnalysis {
  const context = buildContextText(landInfo, landDetail);
  const hasLandData = hasUsableValue(context);
  const confirmedRows = buildConfirmedDataRows(landInfo, landDetail);
  const regulationRows = DISTRICT_TEMPLATES.map((template) =>
    resolveRow(template, context, hasLandData),
  );

  const rows = [...confirmedRows, ...regulationRows];

  return {
    rows,
    sourceNote:
      landDetail?.dataSource === "api"
        ? "VWorld 토지특성·용도지역 기준 1차 확인 결과입니다. 조례·인허가 세부 기준은 상담 시 추가 검토합니다."
        : "토지정보 확인 후 지역·지구 분석이 정확해집니다.",
  };
}
