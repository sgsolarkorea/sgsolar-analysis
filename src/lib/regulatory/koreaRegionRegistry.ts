import regionData from "@/data/regulatory/korea-region-registry.json";
import sourceRegistryData from "@/data/regulatory/regulation-source-registry.json";
import type {
  RegulationSourceEntry,
  SetbackReviewStatus,
} from "@/types/regulatoryReview";

export interface KoreaRegionEntry {
  sido: string;
  sigungu: string;
  key: string;
  lookupLevel: "gu" | "sigungu";
}

export interface RegulationSourceRegistryEntry {
  municipalityLabel: string;
  sido: string;
  sigungu: string;
  sources: RegulationSourceEntry[];
  linkedSetbackReviewStatus?: SetbackReviewStatus;
}

const REGIONS = regionData.regions as KoreaRegionEntry[];
const SOURCE_ENTRIES = sourceRegistryData.entries as Record<string, RegulationSourceRegistryEntry>;

export function lookupRegionKey(sido: string, sigungu: string): string {
  return `${sido}|${sigungu}`;
}

export function findRegion(sido: string, sigungu: string): KoreaRegionEntry | undefined {
  const key = lookupRegionKey(sido, sigungu);
  return REGIONS.find((region) => region.key === key);
}

export function findRegulationSources(sido: string, sigungu: string): RegulationSourceRegistryEntry | undefined {
  return SOURCE_ENTRIES[lookupRegionKey(sido, sigungu)];
}

export const KOREA_REGION_STATS = {
  regionCount: regionData.meta.regionCount,
  sidoCount: regionData.meta.sidoCount,
  version: regionData.meta.version,
};

export const REGULATION_SOURCE_STATS = {
  entryCount: sourceRegistryData.meta.entryCount,
  version: sourceRegistryData.meta.version,
};
