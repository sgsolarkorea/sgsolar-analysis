import { randomUUID } from "crypto";
import { getRedisClient } from "@/lib/searchHistory/redis";
import { LEADS_INDEX_KEY, leadEntryKey, leadTypeIndexKey } from "@/lib/leads/redisKeys";
import type { LeadRecord, LeadRequestBody, LeadStatus } from "@/types/lead";
import { leadTypeToSource } from "@/types/lead";

const devMemoryStore = new Map<string, LeadRecord>();
const devMemoryIndex: string[] = [];

export function createLeadRecord(input: LeadRequestBody): LeadRecord {
  const createdAt = new Date().toISOString();
  return {
    id: randomUUID(),
    createdAt,
    leadType: input.leadType,
    status: "new",
    source: leadTypeToSource(input.leadType),
    phone: input.phone.trim(),
    address: input.address.trim(),
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
    ...(input.email?.trim() ? { email: input.email.trim() } : {}),
    ...(input.installType?.trim() ? { installType: input.installType.trim() } : {}),
    ...(input.estimatedCapacityKw != null && Number.isFinite(input.estimatedCapacityKw)
      ? { estimatedCapacityKw: input.estimatedCapacityKw }
      : {}),
    ...(input.resultUrl?.trim() ? { resultUrl: input.resultUrl.trim() } : {}),
    ...(input.pdfUrl?.trim() ? { pdfUrl: input.pdfUrl.trim() } : {}),
    ...(input.message?.trim() ? { message: input.message.trim() } : {}),
    ...(input.searchHistoryId?.trim() ? { searchHistoryId: input.searchHistoryId.trim() } : {}),
    ...(input.analysisContext ? { analysisContext: input.analysisContext } : {}),
  };
}

async function saveRedisLead(record: LeadRecord): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  const score = Date.parse(record.createdAt);
  await redis.set(leadEntryKey(record.id), record);
  await redis.zadd(LEADS_INDEX_KEY, { score, member: record.id });
  await redis.zadd(leadTypeIndexKey(record.leadType), { score, member: record.id });
  return true;
}

function saveDevMemoryLead(record: LeadRecord): boolean {
  devMemoryStore.set(record.id, record);
  if (!devMemoryIndex.includes(record.id)) {
    devMemoryIndex.unshift(record.id);
  }
  return true;
}

export async function saveLead(record: LeadRecord): Promise<{ saved: boolean; storage: "redis" | "memory" | "none" }> {
  try {
    const savedRedis = await saveRedisLead(record);
    if (savedRedis) {
      return { saved: true, storage: "redis" };
    }
  } catch (error) {
    console.warn("[Leads] Redis save failed:", error);
  }

  if (process.env.NODE_ENV === "development") {
    const savedMemory = saveDevMemoryLead(record);
    if (savedMemory) {
      console.info("[Leads] Saved to in-memory store (dev fallback)");
      return { saved: true, storage: "memory" };
    }
  }

  return { saved: false, storage: "none" };
}

export async function listLeadsByType(leadType: string, limit = 100): Promise<LeadRecord[]> {
  const redis = getRedisClient();
  if (redis) {
    const ids = await redis.zrange<string[]>(leadTypeIndexKey(leadType), 0, limit - 1, { rev: true });
    if (!ids.length) return [];
    const entries = await Promise.all(ids.map((id) => redis.get<LeadRecord>(leadEntryKey(id))));
    return entries.filter((entry): entry is LeadRecord => entry !== null);
  }

  if (process.env.NODE_ENV === "development") {
    return devMemoryIndex
      .map((id) => devMemoryStore.get(id))
      .filter((entry): entry is LeadRecord => entry != null && entry.leadType === leadType)
      .slice(0, limit);
  }

  return [];
}

async function listRedisLeads(limit: number): Promise<LeadRecord[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  const ids = await redis.zrange<string[]>(LEADS_INDEX_KEY, 0, limit - 1, { rev: true });
  if (!ids.length) return [];
  const entries = await Promise.all(ids.map((id) => redis.get<LeadRecord>(leadEntryKey(id))));
  return entries.filter((entry): entry is LeadRecord => entry !== null);
}

function listDevMemoryLeads(limit: number): LeadRecord[] {
  return devMemoryIndex
    .map((id) => devMemoryStore.get(id))
    .filter((entry): entry is LeadRecord => entry != null)
    .slice(0, limit);
}

export async function listAllLeads(limit = 1000): Promise<LeadRecord[]> {
  try {
    const redisLeads = await listRedisLeads(limit);
    if (redisLeads.length > 0 || getRedisClient()) {
      return redisLeads;
    }
  } catch (error) {
    console.warn("[Leads] Redis list failed:", error);
  }

  if (process.env.NODE_ENV === "development") {
    return listDevMemoryLeads(limit);
  }

  return [];
}

export async function getLeadById(id: string): Promise<LeadRecord | null> {
  const redis = getRedisClient();
  if (redis) {
    const entry = await redis.get<LeadRecord>(leadEntryKey(id));
    return entry ?? null;
  }

  if (process.env.NODE_ENV === "development") {
    return devMemoryStore.get(id) ?? null;
  }

  return null;
}

async function updateRedisLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<LeadRecord | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  const existing = await redis.get<LeadRecord>(leadEntryKey(id));
  if (!existing) return null;

  const updated: LeadRecord = { ...existing, status };
  await redis.set(leadEntryKey(id), updated);
  return updated;
}

function updateDevMemoryLeadStatus(id: string, status: LeadStatus): LeadRecord | null {
  const existing = devMemoryStore.get(id);
  if (!existing) return null;

  const updated: LeadRecord = { ...existing, status };
  devMemoryStore.set(id, updated);
  return updated;
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<{ updated: boolean; lead?: LeadRecord; storage: "redis" | "memory" | "none" }> {
  try {
    const updatedRedis = await updateRedisLeadStatus(id, status);
    if (updatedRedis) {
      return { updated: true, lead: updatedRedis, storage: "redis" };
    }
  } catch (error) {
    console.warn("[Leads] Redis status update failed:", error);
  }

  if (process.env.NODE_ENV === "development") {
    const updatedMemory = updateDevMemoryLeadStatus(id, status);
    if (updatedMemory) {
      return { updated: true, lead: updatedMemory, storage: "memory" };
    }
  }

  return { updated: false, storage: "none" };
}
