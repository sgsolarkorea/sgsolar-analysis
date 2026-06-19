import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import path from "path";
import { getRedisClient } from "@/lib/searchHistory/redis";
import type { GridAdminRecord } from "@/types/gridConnection";

const LOCAL_DIR = path.join(process.cwd(), "data", "grid");
const LOCAL_INDEX_FILE = path.join(LOCAL_DIR, "_index.json");
const SEED_FILE = path.join(LOCAL_DIR, "seed.json");

export const GRID_DATA_INDEX_KEY = "grid-data:index";
export const gridDataRecordKey = (id: string) => `grid-data:record:${id}`;

function shouldUseLocalStorage(): boolean {
  return process.env.NODE_ENV === "development" || process.env.GRID_DATA_JSON_STORAGE === "true";
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

async function readLocalRecord(id: string): Promise<GridAdminRecord | null> {
  try {
    const raw = await readFile(path.join(LOCAL_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw) as GridAdminRecord;
  } catch {
    return null;
  }
}

async function writeLocalRecord(record: GridAdminRecord): Promise<void> {
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, `${record.id}.json`), JSON.stringify(record, null, 2), "utf-8");
  const index = await readLocalIndex();
  if (!index.includes(record.id)) {
    await writeLocalIndex([record.id, ...index]);
  }
}

async function loadSeedRecords(): Promise<GridAdminRecord[]> {
  try {
    const raw = await readFile(SEED_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as GridAdminRecord[]) : [];
  } catch {
    return [];
  }
}

async function listLocalRecords(): Promise<GridAdminRecord[]> {
  const seeds = await loadSeedRecords();
  const index = await readLocalIndex();
  const custom = await Promise.all(index.map((id) => readLocalRecord(id)));
  const merged = new Map<string, GridAdminRecord>();
  for (const record of seeds) {
    merged.set(record.id, record);
  }
  for (const record of custom) {
    if (record) merged.set(record.id, record);
  }
  return [...merged.values()];
}

async function listRedisRecords(): Promise<GridAdminRecord[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  const ids = await redis.smembers<string[]>(GRID_DATA_INDEX_KEY);
  if (!ids?.length) return [];

  const records = await Promise.all(
    ids.map((id) => redis.get<GridAdminRecord>(gridDataRecordKey(id))),
  );
  return records.filter((r): r is GridAdminRecord => r != null);
}

export async function listGridAdminRecords(): Promise<GridAdminRecord[]> {
  if (shouldUseLocalStorage()) {
    return listLocalRecords();
  }

  const redisRecords = await listRedisRecords();
  if (redisRecords.length) return redisRecords;

  // Production: seed.json 미사용 — 실데이터 오해 방지
  if (process.env.NODE_ENV === "production") {
    return [];
  }

  return loadSeedRecords();
}

export async function saveGridAdminRecord(record: GridAdminRecord): Promise<boolean> {
  const payload = { ...record, updatedAt: new Date().toISOString() };

  if (shouldUseLocalStorage()) {
    try {
      await writeLocalRecord(payload);
      return true;
    } catch (error) {
      console.warn("[GridData] Local save failed:", error);
      return false;
    }
  }

  const redis = getRedisClient();
  if (!redis) {
    try {
      await writeLocalRecord(payload);
      return true;
    } catch {
      return false;
    }
  }

  try {
    await redis.set(gridDataRecordKey(payload.id), payload);
    await redis.sadd(GRID_DATA_INDEX_KEY, payload.id);
    return true;
  } catch (error) {
    console.warn("[GridData] Redis save failed:", error);
    return false;
  }
}

export async function deleteGridAdminRecord(id: string): Promise<boolean> {
  if (shouldUseLocalStorage()) {
    try {
      const index = (await readLocalIndex()).filter((item) => item !== id);
      await writeLocalIndex(index);
      const files = await readdir(LOCAL_DIR).catch(() => [] as string[]);
      const target = files.find((f) => f === `${id}.json`);
      if (target) {
        await writeFile(path.join(LOCAL_DIR, target), "", "utf-8");
      }
      return true;
    } catch {
      return false;
    }
  }

  const redis = getRedisClient();
  if (!redis) return false;

  try {
    await redis.del(gridDataRecordKey(id));
    await redis.srem(GRID_DATA_INDEX_KEY, id);
    return true;
  } catch {
    return false;
  }
}

export function matchGridAdminRecord(
  records: GridAdminRecord[],
  address: string,
  jibunAddress: string,
): GridAdminRecord | null {
  const haystack = `${address} ${jibunAddress}`.toLowerCase();
  let best: GridAdminRecord | null = null;
  let bestScore = 0;

  for (const record of records) {
    const matched = record.regionKeywords.filter((kw) => haystack.includes(kw.toLowerCase()));
    if (matched.length === record.regionKeywords.length && matched.length > bestScore) {
      best = record;
      bestScore = matched.length;
    }
  }

  if (best) return best;

  for (const record of records) {
    const score = record.regionKeywords.filter((kw) => haystack.includes(kw.toLowerCase())).length;
    if (score > bestScore) {
      best = record;
      bestScore = score;
    }
  }

  return bestScore >= 1 ? best : null;
}
