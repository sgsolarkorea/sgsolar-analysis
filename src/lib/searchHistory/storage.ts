import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { SearchHistoryEntry, SaveSearchHistoryResult } from "@/types/searchHistory";
import type { ResolvedSiteReview } from "@/types/siteReview";
import { buildSearchHistoryEntry, normalizeSearchAddress } from "@/lib/searchHistory/buildEntry";
import {
  getRedisClient,
  SEARCH_HISTORY_INDEX_KEY,
  searchHistoryAddressKey,
  searchHistoryEntryKey,
} from "@/lib/searchHistory/redis";

const LOCAL_DIR = path.join(process.cwd(), "data", "search-history");
const LOCAL_INDEX_FILE = path.join(LOCAL_DIR, "_index.json");

function shouldUseLocalStorage(): boolean {
  return process.env.NODE_ENV === "development" || process.env.SEARCH_HISTORY_JSON_STORAGE === "true";
}

async function readLocalIndex(): Promise<string[]> {
  try {
    const raw = await readFile(LOCAL_INDEX_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

async function writeLocalIndex(ids: string[]): Promise<void> {
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(LOCAL_INDEX_FILE, JSON.stringify(ids, null, 2), "utf-8");
}

async function saveLocalEntry(entry: SearchHistoryEntry): Promise<void> {
  await mkdir(LOCAL_DIR, { recursive: true });
  const safeTimestamp = entry.searchedAt.replace(/[:.]/g, "-");
  const filename = `${safeTimestamp}_${entry.id}.json`;
  await writeFile(path.join(LOCAL_DIR, filename), JSON.stringify(entry, null, 2), "utf-8");

  const index = await readLocalIndex();
  if (!index.includes(entry.id)) {
    await writeLocalIndex([entry.id, ...index]);
  }

  const addressKey = normalizeSearchAddress(entry.address);
  await writeFile(
    path.join(LOCAL_DIR, `_address_${addressKey.replace(/[^\w-]/g, "_")}.txt`),
    entry.id,
    "utf-8",
  );
}

async function saveRedisEntry(entry: SearchHistoryEntry): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  const score = Date.parse(entry.searchedAt);
  await redis.set(searchHistoryEntryKey(entry.id), entry);
  await redis.zadd(SEARCH_HISTORY_INDEX_KEY, { score, member: entry.id });
  await redis.set(searchHistoryAddressKey(normalizeSearchAddress(entry.address)), entry.id);
  return true;
}

export async function saveSearchHistoryEntry(
  data: ResolvedSiteReview,
  searchAddress: string,
): Promise<SaveSearchHistoryResult> {
  const entry = buildSearchHistoryEntry(data, searchAddress);

  if (shouldUseLocalStorage()) {
    try {
      await saveLocalEntry(entry);
      return { saved: true, entry, storage: "local" };
    } catch (error) {
      console.warn("[SearchHistory] Local storage failed:", error);
      return { saved: false, entry, storage: "none" };
    }
  }

  try {
    const saved = await saveRedisEntry(entry);
    if (saved) {
      return { saved: true, entry, storage: "redis" };
    }
  } catch (error) {
    console.warn("[SearchHistory] Redis storage failed:", error);
  }

  return { saved: false, entry, storage: "none" };
}

async function getLocalEntry(id: string): Promise<SearchHistoryEntry | null> {
  const files = await readdir(LOCAL_DIR).catch(() => [] as string[]);
  const match = files.find((file) => file.endsWith(`_${id}.json`));
  if (!match) return null;
  const raw = await readFile(path.join(LOCAL_DIR, match), "utf-8");
  return JSON.parse(raw) as SearchHistoryEntry;
}

async function updateLocalEntry(entry: SearchHistoryEntry): Promise<boolean> {
  const files = await readdir(LOCAL_DIR).catch(() => [] as string[]);
  const match = files.find((file) => file.endsWith(`_${entry.id}.json`));
  if (!match) return false;
  await writeFile(path.join(LOCAL_DIR, match), JSON.stringify(entry, null, 2), "utf-8");
  return true;
}

async function findLocalByAddress(address: string): Promise<SearchHistoryEntry | null> {
  const normalized = normalizeSearchAddress(address);
  const markerFile = path.join(LOCAL_DIR, `_address_${normalized.replace(/[^\w-]/g, "_")}.txt`);
  try {
    const id = (await readFile(markerFile, "utf-8")).trim();
    if (!id) return null;
    return getLocalEntry(id);
  } catch {
    const ids = await readLocalIndex();
    for (const id of ids.slice(0, 50)) {
      const entry = await getLocalEntry(id);
      if (entry && normalizeSearchAddress(entry.address) === normalized) {
        return entry;
      }
    }
    return null;
  }
}

export async function getSearchHistoryEntry(id: string): Promise<SearchHistoryEntry | null> {
  if (shouldUseLocalStorage()) {
    return getLocalEntry(id);
  }

  const redis = getRedisClient();
  if (!redis) return null;
  return redis.get<SearchHistoryEntry>(searchHistoryEntryKey(id));
}

export async function findRecentSearchHistoryByAddress(
  address: string,
): Promise<SearchHistoryEntry | null> {
  const normalized = normalizeSearchAddress(address);
  if (!normalized) return null;

  if (shouldUseLocalStorage()) {
    return findLocalByAddress(address);
  }

  const redis = getRedisClient();
  if (!redis) return null;

  const id = await redis.get<string>(searchHistoryAddressKey(normalized));
  if (!id) return null;
  return redis.get<SearchHistoryEntry>(searchHistoryEntryKey(id));
}

export async function linkSearchHistoryToConsultation(input: {
  searchHistoryId?: string;
  consultationId: string;
  address: string;
}): Promise<boolean> {
  let entry: SearchHistoryEntry | null = null;

  if (input.searchHistoryId) {
    entry = await getSearchHistoryEntry(input.searchHistoryId);
  }
  if (!entry) {
    entry = await findRecentSearchHistoryByAddress(input.address);
  }
  if (!entry || entry.consultSubmitted) {
    return false;
  }

  const updated: SearchHistoryEntry = {
    ...entry,
    consultSubmitted: true,
    consultationId: input.consultationId,
  };

  if (shouldUseLocalStorage()) {
    return updateLocalEntry(updated);
  }

  const redis = getRedisClient();
  if (!redis) return false;

  await redis.set(searchHistoryEntryKey(updated.id), updated);
  return true;
}

export async function listSearchHistory(limit = 500): Promise<SearchHistoryEntry[]> {
  if (shouldUseLocalStorage()) {
    const ids = (await readLocalIndex()).slice(0, limit);
    const entries = await Promise.all(ids.map((id) => getLocalEntry(id)));
    return entries.filter((entry): entry is SearchHistoryEntry => entry !== null);
  }

  const redis = getRedisClient();
  if (!redis) return [];

  const ids = await redis.zrange<string[]>(SEARCH_HISTORY_INDEX_KEY, 0, limit - 1, { rev: true });
  if (!ids.length) return [];

  const entries = await Promise.all(
    ids.map((id) => redis.get<SearchHistoryEntry>(searchHistoryEntryKey(id))),
  );
  return entries.filter((entry): entry is SearchHistoryEntry => entry !== null);
}
