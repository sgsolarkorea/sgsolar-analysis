/** 다중 필지 검토 — 단일 필지 항목 */
export interface ParcelItem {
  id: string;
  address: string;
  jibunAddress: string;
  pnu: string;
  lat: number;
  lng: number;
  areaSqm: number;
  areaLabel: string;
  landCategory: string;
  zoning: string;
  isPrimary: boolean;
}

export interface ParcelReviewSummary {
  parcels: ParcelItem[];
  parcelCount: number;
  totalAreaSqm: number;
  totalAreaLabel: string;
}

/** 검색이력·상담·PDF용 스냅샷 */
export interface ParcelSnapshot {
  jibunAddress: string;
  address: string;
  pnu: string;
  areaLabel: string;
  areaSqm: number;
  landCategory: string;
  isPrimary: boolean;
}

export interface AdjacentParcelCandidate {
  pnu: string;
  jibunAddress: string;
  address: string;
  lat: number;
  lng: number;
  areaSqm: number;
  areaLabel: string;
  landCategory: string;
  zoning: string;
  distanceM?: number;
}
