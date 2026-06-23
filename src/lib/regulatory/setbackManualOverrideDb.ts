import manualOverrideData from "@/data/regulatory/setback-manual-overrides.json";
import setbackData from "@/data/regulatory/setback-regulations.json";
import { mergeParsedAddresses, parseKepcoAddress } from "@/lib/kepco/parseKepcoAddress";
import type {
  ManualOverrideDistances,
  SetbackManualOverrideEntry,
} from "@/types/regulatoryReview";
import type { SetbackDistanceKey, SetbackDistances } from "@/types/regulatoryReview";

const ENTRIES = manualOverrideData.entries as Record<string, SetbackManualOverrideEntry>;
const COMMON_DISTANCES = setbackData.commonFallback.distances as SetbackDistances;

export function regionKeyFromParts(sido: string | null, sigungu: string | null): string | null {
  if (!sido || !sigungu) return null;
  return `${sido}|${sigungu}`;
}

export function lookupManualOverrideByKey(regionKey: string): SetbackManualOverrideEntry | null {
  return ENTRIES[regionKey] ?? null;
}

export function lookupManualOverride(
  address: string,
  jibunAddress = "",
): SetbackManualOverrideEntry | null {
  const parsed = mergeParsedAddresses(
    parseKepcoAddress(address.trim()),
    parseKepcoAddress(jibunAddress.trim()),
  );
  const key = regionKeyFromParts(parsed.sido, parsed.sigungu);
  if (!key) return null;
  return lookupManualOverrideByKey(key);
}

export function listManualOverrideKeys(): string[] {
  return Object.keys(ENTRIES);
}

/** override에 명시된 숫자만 반환 (null/미입력 제외) */
export function getExplicitOverrideDistances(
  distances: ManualOverrideDistances | undefined,
): Partial<Record<SetbackDistanceKey, number>> {
  if (!distances) return {};

  const out: Partial<Record<SetbackDistanceKey, number>> = {};
  const residential = distances.residential ?? distances.building;
  if (typeof residential === "number") out.residential = residential;
  if (typeof distances.road === "number") out.road = distances.road;
  if (typeof distances.river === "number") out.river = distances.river;
  if (typeof distances.school === "number") out.school = distances.school;
  if (typeof distances.cultural === "number") out.cultural = distances.cultural;
  return out;
}

export function hasExplicitOverrideDistances(entry: SetbackManualOverrideEntry): boolean {
  return Object.keys(getExplicitOverrideDistances(entry.distances)).length > 0;
}

/**
 * GIS/setback 표준값: manual_verified는 명시값 + null 필드는 common fallback.
 * manual_pending(전부 null)은 common fallback 사용하되 production DB는 건너뜀.
 */
export function resolveDistancesFromManualOverride(
  entry: SetbackManualOverrideEntry,
): SetbackDistances {
  const explicit = getExplicitOverrideDistances(entry.distances);
  return {
    residential: explicit.residential ?? COMMON_DISTANCES.residential,
    road: explicit.road ?? COMMON_DISTANCES.road,
    river: explicit.river ?? COMMON_DISTANCES.river,
    school: explicit.school ?? COMMON_DISTANCES.school,
    cultural: explicit.cultural ?? COMMON_DISTANCES.cultural,
  };
}

export const MANUAL_OVERRIDE_VERIFIED_NOTICE_LINES = [
  "지자체 담당부서 확인 기준",
  "조례 기준 참고",
  "최종 인허가는 관할 지자체 검토 필요",
] as const;

export const MANUAL_OVERRIDE_PENDING_NOTICE =
  "전주시 담당부서 확인 예정 — 조례 수동 검토 대기 중입니다.";

export const SETBACK_MANUAL_OVERRIDE_STATS = {
  count: Object.keys(ENTRIES).length,
  version: manualOverrideData.meta.version,
};
