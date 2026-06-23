import { unstable_cache } from "next/cache";
import { getRedisClient } from "@/lib/searchHistory/redis";
import type { SiteIntelBundle } from "@/types/siteIntel";

const SITE_INTEL_PREFIX = "site-intel:";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

type MemoryEntry = { value: SiteIntelBundle; expiresAt: number };

const memoryCache = new Map<string, MemoryEntry>();

export function siteIntelCacheKey(pnu: string): string {
  return `${SITE_INTEL_PREFIX}${pnu}`;
}

function readMemoryCache(pnu: string): SiteIntelBundle | null {
  const entry = memoryCache.get(siteIntelCacheKey(pnu));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(siteIntelCacheKey(pnu));
    return null;
  }
  return entry.value;
}

function writeMemoryCache(pnu: string, bundle: SiteIntelBundle, ttlSeconds: number): void {
  memoryCache.set(siteIntelCacheKey(pnu), {
    value: bundle,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function getSiteIntelCache(pnu: string): Promise<SiteIntelBundle | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await redis.get<SiteIntelBundle>(siteIntelCacheKey(pnu));
      if (cached) return cached;
    } catch (error) {
      console.warn("[SiteIntelCache] Redis read failed:", error);
    }
  }

  return readMemoryCache(pnu);
}

export async function setSiteIntelCache(
  pnu: string,
  bundle: SiteIntelBundle,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(siteIntelCacheKey(pnu), bundle, { ex: ttlSeconds });
      return;
    } catch (error) {
      console.warn("[SiteIntelCache] Redis write failed:", error);
    }
  }

  writeMemoryCache(pnu, bundle, ttlSeconds);
}

/** Next.js RSC/SSR용 unstable_cache 래퍼 (Step 2+ analyze 연동 시 사용) */
export function createCachedSiteIntelResolver(
  pnu: string,
  resolver: () => Promise<SiteIntelBundle>,
): Promise<SiteIntelBundle> {
  return unstable_cache(resolver, ["site-intel", pnu], {
    revalidate: DEFAULT_TTL_SECONDS,
  })();
}
