import { randomUUID } from "crypto";
import { getRedisClient } from "@/lib/searchHistory/redis";
import { LEADS_INDEX_KEY, leadEntryKey, leadTypeIndexKey } from "@/lib/leads/redisKeys";
import { LEAD_CRM_DEFAULTS } from "@/lib/leads/leadRecordHelpers";
import type { LeadUpdateInput } from "@/lib/leads/leadRecordHelpers";
import { mergeLeadUpdate, normalizeLeadRecord } from "@/lib/leads/leadRecordHelpers";
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
    ...LEAD_CRM_DEFAULTS,
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
    return entries.filter((entry): entry is LeadRecord => entry !== null).map(normalizeLeadRecord);
  }

  if (process.env.NODE_ENV === "development") {
    return devMemoryIndex
      .map((id) => devMemoryStore.get(id))
      .filter((entry): entry is LeadRecord => entry != null && entry.leadType === leadType)
      .slice(0, limit)
      .map(normalizeLeadRecord);
  }

  return [];
}

async function listRedisLeads(limit: number): Promise<LeadRecord[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  const ids = await redis.zrange<string[]>(LEADS_INDEX_KEY, 0, limit - 1, { rev: true });
  if (!ids.length) return [];
  const entries = await Promise.all(ids.map((id) => redis.get<LeadRecord>(leadEntryKey(id))));
  return entries.filter((entry): entry is LeadRecord => entry !== null).map(normalizeLeadRecord);
}

function listDevMemoryLeads(limit: number): LeadRecord[] {
  return devMemoryIndex
    .map((id) => devMemoryStore.get(id))
    .filter((entry): entry is LeadRecord => entry != null)
    .slice(0, limit)
    .map(normalizeLeadRecord);
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
    return entry ? normalizeLeadRecord(entry) : null;
  }

  if (process.env.NODE_ENV === "development") {
    const entry = devMemoryStore.get(id);
    return entry ? normalizeLeadRecord(entry) : null;
  }

  return null;
}

async function updateRedisLead(id: string, patch: LeadUpdateInput): Promise<LeadRecord | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  const existing = await redis.get<LeadRecord>(leadEntryKey(id));
  if (!existing) return null;

  const updated = mergeLeadUpdate(existing, patch);
  await redis.set(leadEntryKey(id), updated);
  return updated;
}

function updateDevMemoryLead(id: string, patch: LeadUpdateInput): LeadRecord | null {
  const existing = devMemoryStore.get(id);
  if (!existing) return null;

  const updated = mergeLeadUpdate(existing, patch);
  devMemoryStore.set(id, updated);
  return updated;
}

export async function updateLead(
  id: string,
  patch: LeadUpdateInput,
): Promise<{ updated: boolean; lead?: LeadRecord; storage: "redis" | "memory" | "none" }> {
  try {
    const updatedRedis = await updateRedisLead(id, patch);
    if (updatedRedis) {
      return { updated: true, lead: updatedRedis, storage: "redis" };
    }
  } catch (error) {
    console.warn("[Leads] Redis update failed:", error);
  }

  if (process.env.NODE_ENV === "development") {
    const updatedMemory = updateDevMemoryLead(id, patch);
    if (updatedMemory) {
      return { updated: true, lead: updatedMemory, storage: "memory" };
    }
  }

  return { updated: false, storage: "none" };
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<{ updated: boolean; lead?: LeadRecord; storage: "redis" | "memory" | "none" }> {
  return updateLead(id, { status });
}

async function deleteRedisLead(id: string, lead: LeadRecord): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  await redis.del(leadEntryKey(id));
  await redis.zrem(LEADS_INDEX_KEY, id);
  await redis.zrem(leadTypeIndexKey(lead.leadType), id);
  return true;
}

function deleteDevMemoryLead(id: string): boolean {
  if (!devMemoryStore.has(id)) return false;

  devMemoryStore.delete(id);
  const index = devMemoryIndex.indexOf(id);
  if (index >= 0) {
    devMemoryIndex.splice(index, 1);
  }
  return true;
}

export async function deleteLead(
  id: string,
): Promise<{ deleted: boolean; storage: "redis" | "memory" | "none" }> {
  const existing = await getLeadById(id);
  if (!existing) {
    return { deleted: false, storage: "none" };
  }

  try {
    if (getRedisClient()) {
      const deleted = await deleteRedisLead(id, existing);
      if (deleted) {
        return { deleted: true, storage: "redis" };
      }
    }
  } catch (error) {
    console.warn("[Leads] Redis delete failed:", error);
  }

  if (process.env.NODE_ENV === "development") {
    const deleted = deleteDevMemoryLead(id);
    if (deleted) {
      return { deleted: true, storage: "memory" };
    }
  }

  return { deleted: false, storage: "none" };
}
