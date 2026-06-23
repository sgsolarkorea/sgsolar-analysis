export interface LandInfoDetail {
  landCategory: string;
  area: string;
  zoning: string;
  zoningSecondary?: string;
  landUseSituation?: string;
  officialLandPrice?: string;
  priceReferenceYear?: string;
  priceReferenceDate?: string;
  ownershipType?: string;
  regionDistrictSummary?: string;
  dataSource: "api" | "unavailable";
}

export type RegionDistrictFeasibility =
  | "가능"
  | "제한"
  | "추가 확인 필요"
  | "확인 완료"
  | "기본 확인";

export interface RegionDistrictRow {
  district: string;
  feasibility: RegionDistrictFeasibility;
  condition: string;
}

export interface RegionDistrictAnalysis {
  rows: RegionDistrictRow[];
  sourceNote?: string;
  /** VWorld GIS 조회 시각 (ISO) */
  collectedAt?: string;
  dataSource?: string;
}

export type LayerARegulatoryLevel =
  | "제한 가능성 높음"
  | "추가 검토 필요"
  | "기본 확인"
  | "해당 없음";

export interface LayerARegulatoryRow {
  item: string;
  matchedZone?: string;
  level: LayerARegulatoryLevel;
  summary: string;
}

export interface LayerARegulatoryAnalysis {
  rows: LayerARegulatoryRow[];
  sourceNote?: string;
  collectedAt?: string;
}
