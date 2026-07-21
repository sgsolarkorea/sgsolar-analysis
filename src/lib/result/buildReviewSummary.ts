import { hasBuildingRecord, hasLandRecord } from "@/lib/api/infoFallbacks";
import { hasDetailedGridData } from "@/lib/grid/display";
import { getFieldValue } from "@/lib/solar/calculate";
import type { ReviewStatusItem } from "@/lib/result/reviewStatus";
import type { ResolvedSiteReview } from "@/types/siteReview";

export function buildReviewStatusItems(data: ResolvedSiteReview): ReviewStatusItem[] {
  const items: ReviewStatusItem[] = [];

  items.push({
    key: "address",
    label: "주소 및 위치 정보",
    status: data.lat && data.lng ? "confirmed" : "insufficient_data",
    description:
      data.lat && data.lng
        ? "입력 주소의 좌표와 지번 정보를 확인했습니다."
        : "주소 좌표 정보를 확인하지 못했습니다.",
  });

  items.push({
    key: "land",
    label: "토지 정보",
    status: hasLandRecord(data.landInfo) ? "confirmed" : "insufficient_data",
    description: hasLandRecord(data.landInfo)
      ? "공공데이터 기준 토지 정보를 확인했습니다."
      : "토지 공공데이터를 추가로 확인해야 합니다.",
  });

  items.push({
    key: "building",
    label: "건축물 정보",
    status: hasBuildingRecord(data.buildingInfo)
      ? "confirmed"
      : data.solarMetrics.installType === "토지형"
        ? "not_applicable"
        : "needs_review",
    description: hasBuildingRecord(data.buildingInfo)
      ? "건축물대장 기준 정보를 확인했습니다."
      : data.solarMetrics.installType === "토지형"
        ? "토지형 설치 유형으로 건축물 정보는 참고 항목입니다."
        : "건축물 정보 추가 확인이 필요합니다.",
  });

  const usableArea =
    data.solarMetrics.usableAreaSqm ?? data.solarMetrics.roofUsableAreaSqm ?? data.solarMetrics.baseAreaSqm;
  items.push({
    key: "install-area",
    label: "설치 가능 면적",
    status:
      usableArea != null && usableArea > 0
        ? "reviewable"
        : data.solarMetrics.capacityKw > 0
          ? "needs_review"
          : "insufficient_data",
    description:
      usableArea != null && usableArea > 0
        ? `${data.solarMetrics.baseAreaLabel} 기준 면적을 산정했습니다.`
        : "면적 산정에 필요한 공간 정보가 부족합니다.",
  });

  items.push({
    key: "capacity",
    label: "예상 설치용량",
    status:
      data.solarMetrics.capacityKw > 0
        ? "reviewable"
        : "insufficient_data",
    description:
      data.solarMetrics.capacityKw > 0
        ? "입력 정보와 공개 데이터를 기준으로 1차 용량을 산정했습니다."
        : "용량 산정에 필요한 정보가 부족합니다.",
  });

  const regulatoryRows = data.layerARegulatoryAnalysis?.rows ?? [];
  const hasRegulatoryLimit = regulatoryRows.some((row) => row.level === "제한 가능성 높음");
  const hasRegulatoryReview = regulatoryRows.some((row) => row.level === "추가 검토 필요");
  items.push({
    key: "ordinance",
    label: "조례 검토",
    status: hasRegulatoryLimit
      ? "needs_review"
      : hasRegulatoryReview
        ? "needs_review"
        : regulatoryRows.length > 0
          ? "reviewable"
          : "insufficient_data",
    description: hasRegulatoryLimit
      ? "규제 제한 가능성이 있어 추가 검토가 필요합니다."
      : hasRegulatoryReview
        ? "용도지역·규제 정보 추가 확인이 필요합니다."
        : regulatoryRows.length > 0
          ? "공공데이터 기준 1차 규제 검토를 수행했습니다."
          : "규제 관련 공공데이터가 부족합니다.",
  });

  items.push({
    key: "grid",
    label: "계통연계 검토",
    status: hasDetailedGridData(data.gridInfo)
      ? "reviewable"
      : data.gridInfo.status === "available"
        ? "reviewable"
        : "needs_review",
    description: hasDetailedGridData(data.gridInfo)
      ? "공개 계통 데이터를 기준으로 1차 검토했습니다."
      : "한전 계통 접속 가능 여부는 관할 사업소 확인이 필요합니다.",
  });

  const setbackRows = data.setbackReview?.rows ?? [];
  const needsPermitReview = setbackRows.some(
    (row) =>
      row.judgment === "거리 검토 필요" ||
      row.judgment === "추가 검토 필요" ||
      row.judgment === "조례 확인 필요",
  );
  items.push({
    key: "permit",
    label: "인허가 검토",
    status: needsPermitReview ? "needs_review" : setbackRows.length > 0 ? "reviewable" : "needs_review",
    description: needsPermitReview
      ? "이격거리·인허가 기준 추가 확인이 필요합니다."
      : setbackRows.length > 0
        ? "공통 기준으로 1차 이격거리 검토를 수행했습니다."
        : "인허가 관련 정보 추가 확인이 필요합니다.",
  });

  items.push({
    key: "site-check",
    label: "현장 확인",
    status: "site_check",
    description: "음영, 구조, 진입 여건 등은 현장 확인 후 최종 판단됩니다.",
  });

  return items;
}

export function buildReviewOpinionLines(data: ResolvedSiteReview): string[] {
  const lines: string[] = [];

  if (data.solarMetrics.capacityKw > 0) {
    lines.push(
      `예상 설치용량(${data.capacity})은 현재 입력 정보와 공개 데이터를 기준으로 산정되었습니다.`,
    );
  } else {
    lines.push("설치용량은 현재 확보한 정보로는 산정하지 못했습니다. 추가 자료 확인이 필요합니다.");
  }

  const landArea = getFieldValue(data.landInfo, "면적");
  if (landArea && landArea !== "확인 필요") {
    lines.push("실제 배치 가능 면적은 음영, 구조, 진입 여건, 설비 간격에 따라 달라질 수 있습니다.");
  }

  lines.push("계통연계 및 인허가 여부는 관계기관 확인이 필요합니다.");
  lines.push("현장 확인 후 최종 설계가 확정됩니다.");

  return lines;
}
