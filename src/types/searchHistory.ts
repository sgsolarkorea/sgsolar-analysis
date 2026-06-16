import type { ParcelSnapshot } from "@/types/parcelReview";

export interface SearchHistoryEntry {
  id: string;
  /** ISO 8601 */
  searchedAt: string;
  address: string;
  jibunAddress: string;
  lat: number;
  lng: number;
  landCategory: string;
  zoning: string;
  landArea: string;
  buildingArea: string;
  installType: string;
  capacity: string;
  moduleCount: string;
  annualGeneration: string;
  annualRevenue: string;
  consultSubmitted: boolean;
  consultationId?: string;
  resultPageUrl?: string;
  /** 다중 필지 검토 */
  parcelCount?: number;
  totalLandArea?: string;
  parcels?: ParcelSnapshot[];
}

export interface SaveSearchHistoryResult {
  saved: boolean;
  entry: SearchHistoryEntry;
  storage: "redis" | "local" | "none";
}
