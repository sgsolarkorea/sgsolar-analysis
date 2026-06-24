import { LEAD_STATUSES } from "@/lib/leads/adminMetrics";
import type { LeadUpdateInput } from "@/lib/leads/leadRecordHelpers";
import type { LeadStatus } from "@/types/lead";

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value;
}

function parseNullableIso(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

function parseStatus(value: unknown): LeadStatus | undefined {
  if (typeof value !== "string") return undefined;
  const status = value.trim() as LeadStatus;
  return LEAD_STATUSES.includes(status) ? status : undefined;
}

export function parseLeadAdminPatch(body: unknown): LeadUpdateInput | null {
  if (!body || typeof body !== "object") return null;

  const raw = body as Record<string, unknown>;
  const patch: LeadUpdateInput = {};

  const status = parseStatus(raw.status);
  if (raw.status !== undefined && status === undefined) return null;
  if (status !== undefined) patch.status = status;

  if ("memo" in raw) {
    const memo = parseOptionalString(raw.memo);
    if (memo === undefined) return null;
    patch.memo = memo;
  }

  if ("nextAction" in raw) {
    const nextAction = parseOptionalString(raw.nextAction);
    if (nextAction === undefined) return null;
    patch.nextAction = nextAction;
  }

  if ("nextFollowUpAt" in raw) {
    const nextFollowUpAt = parseNullableIso(raw.nextFollowUpAt);
    if (nextFollowUpAt === undefined) return null;
    patch.nextFollowUpAt = nextFollowUpAt;
  }

  if ("contactedAt" in raw) {
    const contactedAt = parseNullableIso(raw.contactedAt);
    if (contactedAt === undefined) return null;
    patch.contactedAt = contactedAt;
  }

  if ("quotedAt" in raw) {
    const quotedAt = parseNullableIso(raw.quotedAt);
    if (quotedAt === undefined) return null;
    patch.quotedAt = quotedAt;
  }

  if ("contractedAt" in raw) {
    const contractedAt = parseNullableIso(raw.contractedAt);
    if (contractedAt === undefined) return null;
    patch.contractedAt = contractedAt;
  }

  if ("lostReason" in raw) {
    const lostReason = parseOptionalString(raw.lostReason);
    if (lostReason === undefined) return null;
    patch.lostReason = lostReason.trim() || null;
  }

  if (Object.keys(patch).length === 0) return null;
  return patch;
}
