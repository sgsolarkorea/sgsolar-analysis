import setbackData from "@/data/regulatory/setback-regulations.json";
import { mergeParsedAddresses, parseKepcoAddress } from "@/lib/kepco/parseKepcoAddress";
import {
  lookupManualOverrideByKey,
  resolveDistancesFromManualOverride,
} from "@/lib/regulatory/setbackManualOverrideDb";
import type {
  ResolvedSetbackRegulation,
  SetbackDistanceKey,
  SetbackManualOverrideEntry,
  SetbackRegulationConfidence,
  SetbackRegulationEntry,
} from "@/types/regulatoryReview";

type RawEntry = SetbackRegulationEntry;

const ENTRIES = setbackData.entries as Record<string, RawEntry>;
const COMMON = setbackData.commonFallback;

export const SETBACK_DISTANCE_KEYS: SetbackDistanceKey[] = [
  "residential",
  "road",
  "river",
  "school",
  "cultural",
];

/** GIS 검토 항목 key → DB distances key */
export const SETBACK_TARGET_DISTANCE_KEY: Record<string, SetbackDistanceKey> = {
  building: "residential",
  road: "road",
  river: "river",
  school: "school",
  cultural: "cultural",
};

function regionLookupKey(sido: string | null, sigungu: string | null): string | null {
  if (!sido || !sigungu) return null;
  return `${sido}|${sigungu}`;
}

function toResolved(entry: RawEntry, isFallback: boolean): ResolvedSetbackRegulation {
  return {
    municipalityLabel: entry.municipalityLabel,
    sido: entry.sido,
    sigungu: entry.sigungu,
    source: entry.source,
    lastUpdated: entry.lastUpdated ?? COMMON.lastUpdated,
    confidence: entry.confidence,
    distances: { ...entry.distances },
    isFallback,
  };
}

function toResolvedFromManual(entry: SetbackManualOverrideEntry): ResolvedSetbackRegulation {
  const isPending = entry.reviewStatus === "manual_pending";
  return {
    municipalityLabel: entry.municipalityLabel,
    sido: entry.sido,
    sigungu: entry.sigungu,
    source: isPending ? `${entry.source} (담당부서 확인 예정)` : entry.source,
    lastUpdated: entry.verifiedAt ?? COMMON.lastUpdated,
    confidence: entry.confidence,
    distances: resolveDistancesFromManualOverride(entry),
    isFallback: isPending,
    isManualOverride: true,
    manualReviewStatus: entry.reviewStatus,
    sourceUrl: entry.sourceUrl,
    manualOverrideNotes: entry.notes,
  };
}

function fallbackRegulation(municipalityLabel?: string): ResolvedSetbackRegulation {
  return {
    municipalityLabel: municipalityLabel ?? "해당 지자체",
    sido: null,
    sigungu: null,
    source: COMMON.source,
    lastUpdated: COMMON.lastUpdated,
    confidence: COMMON.confidence as SetbackRegulationConfidence,
    distances: { ...COMMON.distances },
    isFallback: true,
  };
}

export function lookupSetbackRegulation(
  address: string,
  jibunAddress = "",
): ResolvedSetbackRegulation {
  const parsed = mergeParsedAddresses(
    parseKepcoAddress(address.trim()),
    parseKepcoAddress(jibunAddress.trim()),
  );

  const key = regionLookupKey(parsed.sido, parsed.sigungu);
  if (key) {
    const manual = lookupManualOverrideByKey(key);
    if (manual) {
      return toResolvedFromManual(manual);
    }
    if (ENTRIES[key]) {
      return toResolved(ENTRIES[key], false);
    }
  }

  const label = parsed.sigungu ?? parsed.sido ?? undefined;
  return fallbackRegulation(label);
}

export function formatSetbackStandardM(meters: number): string {
  return `${meters}m`;
}

export function buildSetbackStandardNotice(regulation: ResolvedSetbackRegulation): string {
  if (regulation.isManualOverride) {
    if (regulation.manualReviewStatus === "manual_verified") {
      return `${regulation.municipalityLabel} · 지자체 담당부서 확인 기준 · 조례 기준 참고 · 최종 인허가는 관할 지자체 검토 필요`;
    }
    return `${regulation.municipalityLabel} · 지자체 담당부서 확인 예정 · 조례 수동 검토 대기 (공통 참고 기준 적용 중)`;
  }

  if (regulation.isFallback) {
    return "공통 기준 적용 중 (지자체 조례 DB 미반영)";
  }

  if (regulation.confidence === "needs_verification") {
    return `${regulation.municipalityLabel} · 공통 참고 기준 적용 중 · 지자체 조례 확인 필요 (조례 확인 권장)`;
  }

  if (regulation.confidence === "ordinance_based") {
    return `조례 기준 참고: ${regulation.source} · 지자체·현장 확인 필요`;
  }

  return `조례 기준 참고: ${regulation.source} · 지자체·현장 확인 필요`;
}

export function buildSetbackStandardColumnLabel(regulation: ResolvedSetbackRegulation): string {
  if (regulation.isManualOverride && regulation.manualReviewStatus === "manual_verified") {
    return "수동 검토 기준";
  }
  if (regulation.isFallback || regulation.confidence === "needs_verification") {
    return "공통 참고 기준";
  }
  return "조례 참고 기준";
}

export const SETBACK_REGULATION_STATS = {
  registeredMunicipalities: Object.keys(ENTRIES).length,
  version: setbackData.meta.version,
};
