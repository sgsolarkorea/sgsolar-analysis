import { isLeadOverdue, normalizeLeadRecord } from "@/lib/leads/leadRecordHelpers";
import {
  LEAD_TYPE_LABELS,
  leadTypeToScore,
  type LeadRecord,
  type LeadStatus,
  type LeadType,
} from "@/types/lead";

export interface LeadAdminKpi {
  total: number;
  newLeads: number;
  inConsultation: number;
  contracted: number;
  todayCount: number;
  last7DaysCount: number;
  todayFollowUpCount: number;
  overdueCount: number;
  consultationConversionRate: number;
  quoteConversionRate: number;
  contractConversionRate: number;
  hotLeads: number;
}

export interface LeadFunnelStep {
  id: string;
  label: string;
  count: number;
}

export interface LeadSourceStat {
  leadType: LeadType;
  label: string;
  count: number;
  ratioPercent: number;
}

export interface LeadDailyInflow {
  dateKey: string;
  label: string;
  count: number;
}

export interface LeadAdminStats {
  kpi: LeadAdminKpi;
  funnel: LeadFunnelStep[];
  sources: LeadSourceStat[];
  dailyInflow: LeadDailyInflow[];
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const LEAD_TYPES: LeadType[] = ["pdf_download", "consultation", "save_result"];

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

function conversionRate(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function formatDailyLabel(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${month}/${day}`;
}

function lastNKstDateKeys(days: number): string[] {
  const keys: string[] = [];
  const nowMs = Date.now();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    keys.push(toKstDateKey(new Date(nowMs - offset * 24 * 60 * 60 * 1000).toISOString()));
  }
  return keys;
}

export function computeLeadAdminStats(leads: LeadRecord[]): LeadAdminStats {
  const todayKey = todayKstDateKey();
  const normalized = leads.map(normalizeLeadRecord);
  const total = normalized.length;

  const consultationCount = normalized.filter((lead) => lead.leadType === "consultation").length;
  const quotedCount = normalized.filter((lead) => lead.status === "quoted").length;
  const contractedCount = normalized.filter((lead) => lead.status === "contracted").length;
  const pdfDownloadCount = normalized.filter((lead) => lead.leadType === "pdf_download").length;

  const kpi: LeadAdminKpi = {
    total,
    newLeads: normalized.filter((lead) => lead.status === "new").length,
    inConsultation: normalized.filter((lead) =>
      lead.status === "contacted" || lead.status === "quoted",
    ).length,
    contracted: contractedCount,
    todayCount: normalized.filter((lead) => toKstDateKey(lead.createdAt) === todayKey).length,
    last7DaysCount: normalized.filter((lead) => isWithinLastDays(lead.createdAt, 7)).length,
    todayFollowUpCount: normalized.filter(
      (lead) =>
        lead.nextFollowUpAt &&
        isActiveFollowUpStatus(lead.status) &&
        toKstDateKey(lead.nextFollowUpAt) === todayKey,
    ).length,
    overdueCount: normalized.filter((lead) => isLeadOverdue(lead)).length,
    consultationConversionRate: conversionRate(consultationCount, total),
    quoteConversionRate: conversionRate(quotedCount, total),
    contractConversionRate: conversionRate(contractedCount, total),
    hotLeads: normalized.filter((lead) => leadTypeToScore(lead.leadType) === "HOT").length,
  };

  const funnel: LeadFunnelStep[] = [
    { id: "pdf_download", label: "PDF 다운로드", count: pdfDownloadCount },
    { id: "consultation", label: "상담 신청", count: consultationCount },
    { id: "quoted", label: "견적 발행", count: quotedCount },
    { id: "contracted", label: "계약 완료", count: contractedCount },
  ];

  const sources: LeadSourceStat[] = LEAD_TYPES.map((leadType) => {
    const count = normalized.filter((lead) => lead.leadType === leadType).length;
    return {
      leadType,
      label: LEAD_TYPE_LABELS[leadType],
      count,
      ratioPercent: conversionRate(count, total),
    };
  });

  const inflowByDay = new Map<string, number>();
  for (const key of lastNKstDateKeys(7)) {
    inflowByDay.set(key, 0);
  }
  for (const lead of normalized) {
    const key = toKstDateKey(lead.createdAt);
    if (inflowByDay.has(key)) {
      inflowByDay.set(key, (inflowByDay.get(key) ?? 0) + 1);
    }
  }
  const dailyInflow: LeadDailyInflow[] = lastNKstDateKeys(7).map((dateKey) => ({
    dateKey,
    label: formatDailyLabel(dateKey),
    count: inflowByDay.get(dateKey) ?? 0,
  }));

  return { kpi, funnel, sources, dailyInflow };
}

export function computeLeadAdminKpi(leads: LeadRecord[]): LeadAdminKpi {
  return computeLeadAdminStats(leads).kpi;
}

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "quoted",
  "contracted",
  "hold",
  "rejected",
];
