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

export type RegionDistrictFeasibility = "가능" | "제한" | "추가 확인 필요";

export interface RegionDistrictRow {
  district: string;
  feasibility: RegionDistrictFeasibility;
  condition: string;
}

export interface RegionDistrictAnalysis {
  rows: RegionDistrictRow[];
  sourceNote?: string;
}
