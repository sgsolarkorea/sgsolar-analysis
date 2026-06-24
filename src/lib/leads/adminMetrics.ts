import { isLeadOverdue, normalizeLeadRecord } from "@/lib/leads/leadRecordHelpers";
import type { LeadRecord, LeadStatus } from "@/types/lead";

export interface LeadAdminKpi {
  total: number;
  newLeads: number;
  inConsultation: number;
  contracted: number;
  todayCount: number;
  last7DaysCount: number;
  todayFollowUpCount: number;
  overdueCount: number;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKstDateKey(iso: string): string {
  const kst = new Date(Date.parse(iso) + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayKstDateKey(): string {
  return toKstDateKey(new Date().toISOString());
}

function isWithinLastDays(iso: string, days: number): boolean {
  const created = Date.parse(iso);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return Number.isFinite(created) && created >= cutoff;
}

function isActiveFollowUpStatus(status: LeadStatus): boolean {
  return status !== "contracted" && status !== "rejected";
}

export function computeLeadAdminKpi(leads: LeadRecord[]): LeadAdminKpi {
  const todayKey = todayKstDateKey();
  const normalized = leads.map(normalizeLeadRecord);

  return {
    total: normalized.length,
    newLeads: normalized.filter((lead) => lead.status === "new").length,
    inConsultation: normalized.filter((lead) =>
      lead.status === "contacted" || lead.status === "quoted",
    ).length,
    contracted: normalized.filter((lead) => lead.status === "contracted").length,
    todayCount: normalized.filter((lead) => toKstDateKey(lead.createdAt) === todayKey).length,
    last7DaysCount: normalized.filter((lead) => isWithinLastDays(lead.createdAt, 7)).length,
    todayFollowUpCount: normalized.filter(
      (lead) =>
        lead.nextFollowUpAt &&
        isActiveFollowUpStatus(lead.status) &&
        toKstDateKey(lead.nextFollowUpAt) === todayKey,
    ).length,
    overdueCount: normalized.filter((lead) => isLeadOverdue(lead)).length,
  };
}

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "quoted",
  "contracted",
  "hold",
  "rejected",
];
