import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getRedisClient } from "@/lib/searchHistory/redis";
import {
  ORDINANCE_INDEX_KEY,
  ORDINANCE_QUEUE_KEY,
  ordinanceLabelKey,
  ordinanceRecordKey,
} from "@/lib/ordinanceLearning/redisKeys";
import type { OrdinanceRecord, OrdinanceRecordStatus } from "@/types/ordinanceLearning";

const LOCAL_DIR = path.join(process.cwd(), "data", "ordinance-learning");
const LOCAL_INDEX_FILE = path.join(LOCAL_DIR, "_index.json");
const LOCAL_QUEUE_FILE = path.join(LOCAL_DIR, "_queue.json");

function shouldUseLocalStorage(): boolean {
  return process.env.NODE_ENV === "development" || process.env.ORDINANCE_JSON_STORAGE === "true";
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

async function writeLocalIndex(slugs: string[]): Promise<void> {
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(LOCAL_INDEX_FILE, JSON.stringify(slugs, null, 2), "utf-8");
}

async function readLocalQueue(): Promise<string[]> {
  try {
    const raw = await readFile(LOCAL_QUEUE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

async function writeLocalQueue(slugs: string[]): Promise<void> {
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(LOCAL_QUEUE_FILE, JSON.stringify(slugs, null, 2), "utf-8");
}

async function getLocalRecord(slug: string): Promise<OrdinanceRecord | null> {
  try {
    const raw = await readFile(path.join(LOCAL_DIR, `${slug}.json`), "utf-8");
    return JSON.parse(raw) as OrdinanceRecord;
  } catch {
    return null;
  }
}

async function saveLocalRecord(record: OrdinanceRecord): Promise<void> {
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, `${record.slug}.json`), JSON.stringify(record, null, 2), "utf-8");
  const index = await readLocalIndex();
  if (!index.includes(record.slug)) {
    await writeLocalIndex([record.slug, ...index]);
  }
}

export async function getOrdinanceRecord(slug: string): Promise<OrdinanceRecord | null> {
  if (shouldUseLocalStorage()) {
    return getLocalRecord(slug);
  }

  const redis = getRedisClient();
  if (!redis) return getLocalRecord(slug);
  return redis.get<OrdinanceRecord>(ordinanceRecordKey(slug));
}

export async function getOrdinanceRecordByLabel(
  municipalityLabel: string,
): Promise<OrdinanceRecord | null> {
  if (shouldUseLocalStorage()) {
    const slugs = await readLocalIndex();
    for (const slug of slugs) {
      const record = await getLocalRecord(slug);
      if (record?.municipalityLabel === municipalityLabel) return record;
    }
    return null;
  }

  const redis = getRedisClient();
  if (!redis) return null;

  const slug = await redis.get<string>(ordinanceLabelKey(municipalityLabel));
  if (!slug) return null;
  return redis.get<OrdinanceRecord>(ordinanceRecordKey(slug));
}

export async function saveOrdinanceRecord(record: OrdinanceRecord): Promise<boolean> {
  if (shouldUseLocalStorage()) {
    try {
      await saveLocalRecord(record);
      return true;
    } catch (error) {
      console.warn("[OrdinanceLearning] Local save failed:", error);
      return false;
    }
  }

  const redis = getRedisClient();
  if (!redis) {
    try {
      await saveLocalRecord(record);
      return true;
    } catch {
      return false;
    }
  }

  try {
    await redis.set(ordinanceRecordKey(record.slug), record);
    await redis.sadd(ORDINANCE_INDEX_KEY, record.slug);
    await redis.set(ordinanceLabelKey(record.municipalityLabel), record.slug);
    return true;
  } catch (error) {
    console.warn("[OrdinanceLearning] Redis save failed:", error);
    return false;
  }
}

export async function listOrdinanceRecords(): Promise<OrdinanceRecord[]> {
  if (shouldUseLocalStorage()) {
    const slugs = await readLocalIndex();
    const records = await Promise.all(slugs.map((slug) => getLocalRecord(slug)));
    return records.filter((record): record is OrdinanceRecord => record !== null);
  }

  const redis = getRedisClient();
  if (!redis) {
    const slugs = await readLocalIndex();
    const records = await Promise.all(slugs.map((slug) => getLocalRecord(slug)));
    return records.filter((record): record is OrdinanceRecord => record !== null);
  }

  const slugs = await redis.smembers<string[]>(ORDINANCE_INDEX_KEY);
  if (!slugs?.length) return [];

  const records = await Promise.all(
    slugs.map((slug) => redis.get<OrdinanceRecord>(ordinanceRecordKey(slug))),
  );
  return records.filter((record): record is OrdinanceRecord => record !== null);
}

export async function enqueueOrdinanceSlug(slug: string): Promise<void> {
  if (shouldUseLocalStorage()) {
    try {
      const queue = await readLocalQueue();
      if (!queue.includes(slug)) {
        await writeLocalQueue([...queue, slug]);
      }
    } catch (error) {
      console.warn("[OrdinanceLearning] Local queue enqueue failed:", error);
    }
    return;
  }

  const redis = getRedisClient();
  if (!redis) {
    try {
      const queue = await readLocalQueue();
      if (!queue.includes(slug)) {
        await writeLocalQueue([...queue, slug]);
      }
    } catch (error) {
      console.warn("[OrdinanceLearning] Local queue enqueue failed:", error);
    }
    return;
  }

  try {
    await redis.lpush(ORDINANCE_QUEUE_KEY, slug);
  } catch (error) {
    console.warn("[OrdinanceLearning] Redis queue enqueue failed:", error);
  }
}

export async function dequeueOrdinanceSlug(): Promise<string | null> {
  if (shouldUseLocalStorage()) {
    try {
      const queue = await readLocalQueue();
      if (!queue.length) return null;
      const [next, ...rest] = queue;
      await writeLocalQueue(rest);
      return next;
    } catch (error) {
      console.warn("[OrdinanceLearning] Local queue dequeue failed:", error);
      return null;
    }
  }

  const redis = getRedisClient();
  if (!redis) {
    try {
      const queue = await readLocalQueue();
      if (!queue.length) return null;
      const [next, ...rest] = queue;
      await writeLocalQueue(rest);
      return next;
    } catch (error) {
      console.warn("[OrdinanceLearning] Local queue dequeue failed:", error);
      return null;
    }
  }

  try {
    return await redis.rpop<string>(ORDINANCE_QUEUE_KEY);
  } catch (error) {
    console.warn("[OrdinanceLearning] Redis queue dequeue failed:", error);
    return null;
  }
}

export async function incrementOrdinanceSearchCount(
  slug: string,
  municipalityLabel: string,
  searchedAt: string,
): Promise<void> {
  let record = await getOrdinanceRecord(slug);
  if (!record) {
    record = {
      slug,
      municipalityLabel,
      status: "unregistered",
      sourceType: "ai_draft",
      searchCount: 0,
      currentVersion: 0,
      versions: [],
      createdAt: searchedAt,
      updatedAt: searchedAt,
    };
  }

  record.searchCount += 1;
  record.lastSearchedAt = searchedAt;
  record.updatedAt = searchedAt;
  await saveOrdinanceRecord(record);
}

export async function updateOrdinanceStatus(
  slug: string,
  status: OrdinanceRecordStatus,
): Promise<OrdinanceRecord | null> {
  const record = await getOrdinanceRecord(slug);
  if (!record) return null;

  record.status = status;
  record.updatedAt = new Date().toISOString();
  await saveOrdinanceRecord(record);
  return record;
}
