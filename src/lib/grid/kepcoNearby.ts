import { searchAddressByKakao } from "@/lib/api/kakao";
import {
  haversineDistanceKm,
  NEARBY_SEARCH_RADII_KM,
} from "@/lib/grid/geo";
import type { KepcoDispersedGenerationItem } from "@/lib/grid/kepcoApi";
import type { ParsedKepcoAddress } from "@/lib/grid/kepcoAddress";

const MAX_GEOCODE_ITEMS = 80;
const GEOCODE_BATCH_SIZE = 20;
const GEOCODE_CONCURRENCY = 6;

export interface NearbyKepcoMatch {
  item: KepcoDispersedGenerationItem;
  distanceKm: number;
  referenceAddress: string;
}

function buildItemJibunAddress(
  parsed: ParsedKepcoAddress,
  item: KepcoDispersedGenerationItem,
): string | null {
  const lidong = item.addrLidong?.trim();
  const li = item.addrLi?.trim();
  const jibun = item.addrJibun?.trim();
  if (!lidong && !li && !jibun) return null;

  const parts = [parsed.sido, parsed.sigungu];
  if (lidong) parts.push(lidong);
  if (li) parts.push(li);
  if (jibun) parts.push(jibun);
  return parts.join(" ");
}

function itemDedupeKey(item: KepcoDispersedGenerationItem): string {
  return [
    item.substCd ?? item.substNm ?? "",
    item.mtrNo ?? "",
    item.dlCd ?? item.dlNm ?? "",
    item.addrLidong ?? "",
    item.addrLi ?? "",
    item.addrJibun ?? "",
  ].join("|");
}

function adminProximityScore(
  item: KepcoDispersedGenerationItem,
  target: { addrLidong: string; addrLi: string },
): number {
  let score = 0;
  const lidong = item.addrLidong?.trim();
  const li = item.addrLi?.trim();
  if (li && target.addrLi && li === target.addrLi) score += 40;
  if (lidong && target.addrLidong && lidong === target.addrLidong) score += 30;
  return score;
}

async function geocodeAddress(
  address: string,
  cache: Map<string, { lat: number; lng: number } | null>,
): Promise<{ lat: number; lng: number } | null> {
  if (cache.has(address)) return cache.get(address) ?? null;

  try {
    const result = await searchAddressByKakao(address);
    const coords = { lat: result.lat, lng: result.lng };
    cache.set(address, coords);
    return coords;
  } catch {
    cache.set(address, null);
    return null;
  }
}

async function geocodeBatch(
  addresses: string[],
  cache: Map<string, { lat: number; lng: number } | null>,
): Promise<void> {
  const pending = addresses.filter((addr) => !cache.has(addr));
  for (let i = 0; i < pending.length; i += GEOCODE_CONCURRENCY) {
    const chunk = pending.slice(i, i + GEOCODE_CONCURRENCY);
    await Promise.all(chunk.map((addr) => geocodeAddress(addr, cache)));
  }
}

function pickClosestWithinRadius(
  candidates: Array<{ item: KepcoDispersedGenerationItem; distanceKm: number; referenceAddress: string }>,
  maxRadiusKm: number,
): NearbyKepcoMatch | null {
  let best: NearbyKepcoMatch | null = null;
  for (const candidate of candidates) {
    if (candidate.distanceKm > maxRadiusKm) continue;
    if (!best || candidate.distanceKm < best.distanceKm) {
      best = candidate;
    }
  }
  return best;
}

/**
 * 시군구 전체 KEPCO 데이터에서 좌표 기반 근접 계통 탐색.
 * KEPCO API는 좌표 파라미터가 없어 Kakao 지오코딩 보조가 필요합니다.
 */
export async function findNearbyKepcoItem(input: {
  siteLat: number;
  siteLng: number;
  parsed: ParsedKepcoAddress;
  items: KepcoDispersedGenerationItem[];
  target: { addrLidong: string; addrLi: string; addrJibun: string };
}): Promise<NearbyKepcoMatch | null> {
  const { siteLat, siteLng, parsed, items, target } = input;
  if (!items.length) return null;

  const seen = new Set<string>();
  const uniqueItems: KepcoDispersedGenerationItem[] = [];
  for (const item of items) {
    const key = itemDedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueItems.push(item);
  }

  const ranked = uniqueItems
    .map((item) => ({
      item,
      adminScore: adminProximityScore(item, target),
      referenceAddress: buildItemJibunAddress(parsed, item),
    }))
    .filter((entry) => entry.referenceAddress)
    .sort((a, b) => b.adminScore - a.adminScore)
    .slice(0, MAX_GEOCODE_ITEMS);

  if (!ranked.length) return null;

  const geocodeCache = new Map<string, { lat: number; lng: number } | null>();
  const allWithDistance: Array<{
    item: KepcoDispersedGenerationItem;
    distanceKm: number;
    referenceAddress: string;
  }> = [];

  for (let offset = 0; offset < ranked.length; offset += GEOCODE_BATCH_SIZE) {
    const batch = ranked.slice(offset, offset + GEOCODE_BATCH_SIZE);
    await geocodeBatch(
      batch.map((entry) => entry.referenceAddress!),
      geocodeCache,
    );

    for (const entry of batch) {
      const coords = geocodeCache.get(entry.referenceAddress!);
      if (!coords) continue;
      allWithDistance.push({
        item: entry.item,
        referenceAddress: entry.referenceAddress!,
        distanceKm: haversineDistanceKm(siteLat, siteLng, coords.lat, coords.lng),
      });
    }

    for (const radiusKm of NEARBY_SEARCH_RADII_KM) {
      const match = pickClosestWithinRadius(allWithDistance, radiusKm);
      if (match) return match;
    }
  }

  return null;
}

export function isDirectKepcoMatch(
  items: KepcoDispersedGenerationItem[],
  target: { addrLidong: string; addrLi: string; addrJibun: string },
): boolean {
  if (!items.length) return false;

  let bestScore = 0;
  for (const item of items) {
    let score = 0;
    const jibun = item.addrJibun?.trim();
    const li = item.addrLi?.trim();
    const lidong = item.addrLidong?.trim();

    if (jibun && target.addrJibun && jibun === target.addrJibun) score += 100;
    if (li && target.addrLi && li === target.addrLi) score += 40;
    if (lidong && target.addrLidong && lidong === target.addrLidong) score += 30;

    if (score > bestScore) bestScore = score;
  }

  return bestScore >= 30;
}
