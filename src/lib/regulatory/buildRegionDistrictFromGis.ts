import type { RegionDistrictAnalysis, RegionDistrictRow } from "@/types/landInfo";
import type { LandUseAttrItem, LandUseCategory } from "@/types/siteIntel";

const CATEGORY_LABELS: Record<LandUseCategory, string> = {
  용도지역: "용도지역",
  용도지구: "용도지구",
  용도구역: "용도구역",
  지구단위계획: "지구단위계획",
  도시계획시설: "도시계획시설",
  기타: "기타 법정구역",
};

function categoryCondition(item: LandUseAttrItem): string {
  const parts: string[] = [item.name];
  if (item.areaRatio != null && item.areaRatio > 0) {
    parts.push(`면적비 ${item.areaRatio}%`);
  }
  return parts.join(" · ");
}

function itemToRow(item: LandUseAttrItem): RegionDistrictRow {
  const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category;
  return {
    district: `${categoryLabel}: ${item.name}`,
    feasibility: "확인 완료",
    condition: categoryCondition(item),
  };
}

function sortRows(rows: RegionDistrictRow[]): RegionDistrictRow[] {
  const order = ["용도지역:", "용도지구:", "용도구역:", "지구단위계획:", "도시계획시설:", "기타"];
  return [...rows].sort((a, b) => {
    const ai = order.findIndex((prefix) => a.district.startsWith(prefix));
    const bi = order.findIndex((prefix) => b.district.startsWith(prefix));
    const aOrder = ai === -1 ? order.length : ai;
    const bOrder = bi === -1 ? order.length : bi;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.district.localeCompare(b.district, "ko");
  });
}

function formatCollectedAt(iso?: string): string | undefined {
  if (!iso) return undefined;
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return undefined;
  }
}

export function buildRegionDistrictFromGis(
  landUseAttributes: LandUseAttrItem[],
  collectedAt?: string,
): RegionDistrictAnalysis {
  const rows = sortRows(landUseAttributes.map(itemToRow));
  const confirmedAt = formatCollectedAt(collectedAt);

  const sourceNote = confirmedAt
    ? `토지이용계획 GIS 기준 1차 확인 결과입니다. 확인일 ${confirmedAt}. 세부 인허가·조례 기준은 상담 시 추가 검토합니다.`
    : "토지이용계획 GIS 기준 1차 확인 결과입니다. 세부 인허가·조례 기준은 상담 시 추가 검토합니다.";

  return {
    rows,
    sourceNote,
    collectedAt,
    dataSource: "토지이용계획",
  };
}
