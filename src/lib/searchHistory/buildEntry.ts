import { randomUUID } from "crypto";
import {
  formatCapacityDisplay,
  formatGenerationDisplay,
  formatRevenueDisplay,
  getFieldValue,
} from "@/lib/solar/calculate";
import type { SearchHistoryEntry } from "@/types/searchHistory";
import type { ResolvedSiteReview } from "@/types/siteReview";

function formatModuleCountDisplay(count: number): string {
  if (count <= 0) return "확인 필요";
  return `약 ${count.toLocaleString("ko-KR")}장`;
}

export function buildSearchHistoryEntry(
  data: ResolvedSiteReview,
  searchAddress: string,
): SearchHistoryEntry {
  const address = searchAddress.trim() || data.address;
  const metrics = data.solarMetrics;
  const searchedAt = new Date().toISOString();
  const encodedAddress = encodeURIComponent(address);

  return {
    id: randomUUID(),
    searchedAt,
    address,
    jibunAddress: data.jibunAddress,
    lat: data.lat,
    lng: data.lng,
    landCategory: getFieldValue(data.landInfo, "지목"),
    zoning: getFieldValue(data.landInfo, "용도지역"),
    landArea: getFieldValue(data.landInfo, "면적"),
    buildingArea: getFieldValue(data.buildingInfo, "건축면적"),
    installType: metrics.installType,
    capacity: formatCapacityDisplay(metrics.capacityKw),
    moduleCount: formatModuleCountDisplay(metrics.moduleCount),
    annualGeneration: formatGenerationDisplay(metrics.annualGenerationKwh),
    annualRevenue: formatRevenueDisplay(metrics.totalRevenueWon),
    consultSubmitted: false,
    resultPageUrl: `/result?address=${encodedAddress}`,
  };
}

export function normalizeSearchAddress(address: string): string {
  return address.trim().replace(/\s+/g, " ").toLowerCase();
}
