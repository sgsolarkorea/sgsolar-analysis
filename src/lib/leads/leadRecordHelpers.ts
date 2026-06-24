import type { LeadRecord, LeadStatus } from "@/types/lead";

export const LEAD_NEXT_ACTION_OPTIONS = [
  "전화 예정",
  "견적 작성",
  "현장 확인",
  "한전 확인",
  "조례 확인",
  "보류",
] as const;

export type LeadNextAction = (typeof LEAD_NEXT_ACTION_OPTIONS)[number];

export const LEAD_CRM_DEFAULTS = {
  memo: "",
  nextAction: "",
  nextFollowUpAt: null,
  contactedAt: null,
  quotedAt: null,
  contractedAt: null,
  lostReason: null,
} as const satisfies Pick<
  LeadRecord,
  "memo" | "nextAction" | "nextFollowUpAt" | "contactedAt" | "quotedAt" | "contractedAt" | "lostReason"
>;

export interface LeadUpdateInput {
  status?: LeadStatus;
  memo?: string;
  nextAction?: string;
  nextFollowUpAt?: string | null;
  contactedAt?: string | null;
  quotedAt?: string | null;
  contractedAt?: string | null;
  lostReason?: string | null;
}

const CLOSED_STATUSES: LeadStatus[] = ["contracted", "rejected"];

/** Redis에 저장된 구 리드에 CRM 기본값을 적용합니다. */
export function normalizeLeadRecord(record: LeadRecord): LeadRecord {
  return {
    ...record,
    memo: record.memo ?? LEAD_CRM_DEFAULTS.memo,
    nextAction: record.nextAction ?? LEAD_CRM_DEFAULTS.nextAction,
    nextFollowUpAt: record.nextFollowUpAt ?? LEAD_CRM_DEFAULTS.nextFollowUpAt,
    contactedAt: record.contactedAt ?? LEAD_CRM_DEFAULTS.contactedAt,
    quotedAt: record.quotedAt ?? LEAD_CRM_DEFAULTS.quotedAt,
    contractedAt: record.contractedAt ?? LEAD_CRM_DEFAULTS.contractedAt,
    lostReason: record.lostReason ?? LEAD_CRM_DEFAULTS.lostReason,
  };
}

export function isLeadOverdue(lead: LeadRecord, nowMs = Date.now()): boolean {
  const normalized = normalizeLeadRecord(lead);
  if (CLOSED_STATUSES.includes(normalized.status)) return false;
  if (!normalized.nextFollowUpAt) return false;
  const followUpMs = Date.parse(normalized.nextFollowUpAt);
  return Number.isFinite(followUpMs) && followUpMs < nowMs;
}

export function applyStatusAutoTimestamps(
  existing: LeadRecord,
  updated: LeadRecord,
  statusChanged: boolean,
): LeadRecord {
  if (!statusChanged) return updated;

  const now = new Date().toISOString();
  const next = { ...updated };

  if (next.status === "contacted" && !next.contactedAt) {
    next.contactedAt = now;
  }
  if (next.status === "quoted" && !next.quotedAt) {
    next.quotedAt = now;
  }
  if (next.status === "contracted" && !next.contractedAt) {
    next.contractedAt = now;
  }

  return next;
}

export function mergeLeadUpdate(existing: LeadRecord, patch: LeadUpdateInput): LeadRecord {
  const base = normalizeLeadRecord(existing);
  const statusChanged = patch.status !== undefined && patch.status !== base.status;

  let updated: LeadRecord = {
    ...base,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.memo !== undefined ? { memo: patch.memo.trim() } : {}),
    ...(patch.nextAction !== undefined ? { nextAction: patch.nextAction.trim() } : {}),
    ...(patch.nextFollowUpAt !== undefined ? { nextFollowUpAt: patch.nextFollowUpAt } : {}),
    ...(patch.contactedAt !== undefined ? { contactedAt: patch.contactedAt } : {}),
    ...(patch.quotedAt !== undefined ? { quotedAt: patch.quotedAt } : {}),
    ...(patch.contractedAt !== undefined ? { contractedAt: patch.contractedAt } : {}),
    ...(patch.lostReason !== undefined
      ? { lostReason: typeof patch.lostReason === "string" ? patch.lostReason.trim() || null : patch.lostReason }
      : {}),
  };

  updated = applyStatusAutoTimestamps(base, updated, statusChanged);
  return updated;
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

export function formatFollowUpLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
