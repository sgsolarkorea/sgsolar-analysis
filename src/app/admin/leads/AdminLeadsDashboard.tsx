"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminNav from "@/components/admin/AdminNav";
import {
  buildLeadAlertMessage,
  showBrowserLeadNotification,
  useLeadIdTracker,
  useLeadNotificationPermissionOnMount,
} from "@/lib/leads/adminAlerts";
import type { LeadAdminKpi } from "@/lib/leads/adminMetrics";
import { computeLeadAdminKpi, LEAD_STATUSES } from "@/lib/leads/adminMetrics";
import { LEAD_ADMIN_POLL_INTERVAL_MS } from "@/lib/leads/adminPolling";
import {
  LEAD_SCORE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_TYPE_LABELS,
  leadTypeToScore,
  type LeadRecord,
  type LeadStatus,
  type LeadType,
} from "@/types/lead";

type LeadTypeFilter = "all" | LeadType;
type StatusFilter = "all" | LeadStatus;

const LEAD_TYPE_FILTERS: Array<{ id: LeadTypeFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "pdf_download", label: "PDF 다운로드" },
  { id: "consultation", label: "상담 신청" },
  { id: "save_result", label: "결과 저장" },
];

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "전체" },
  ...LEAD_STATUSES.map((status) => ({ id: status as StatusFilter, label: LEAD_STATUS_LABELS[status] })),
];

const LEAD_TYPE_STYLES: Record<LeadType, string> = {
  pdf_download: "bg-violet-50 text-violet-800 border-violet-200",
  consultation: "bg-rose-50 text-rose-800 border-rose-200",
  save_result: "bg-sky-50 text-sky-800 border-sky-200",
};

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-blue-50 text-blue-800 border-blue-200",
  contacted: "bg-amber-50 text-amber-900 border-amber-200",
  quoted: "bg-indigo-50 text-indigo-800 border-indigo-200",
  contracted: "bg-emerald-50 text-emerald-800 border-emerald-200",
  hold: "bg-slate-100 text-slate-700 border-slate-200",
  rejected: "bg-rose-50 text-rose-800 border-rose-200",
};

const SCORE_STYLES = {
  HOT: "bg-rose-100 text-rose-800 border-rose-200",
  WARM: "bg-amber-100 text-amber-900 border-amber-200",
  COLD: "bg-sky-100 text-sky-800 border-sky-200",
} as const;

function formatCreatedAtKst(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function formatCapacityKw(lead: LeadRecord): string {
  if (lead.estimatedCapacityKw != null && Number.isFinite(lead.estimatedCapacityKw)) {
    return `${lead.estimatedCapacityKw} kW`;
  }
  const fromContext = lead.analysisContext?.capacity?.trim();
  return fromContext || "—";
}

function newLeadRowClass(isNew: boolean, selected: boolean): string {
  if (isNew) {
    return "bg-emerald-50 ring-2 ring-inset ring-emerald-300";
  }
  if (selected) {
    return "bg-sky-50/60";
  }
  return "";
}
function displayValue(value: string | number | null | undefined, fallback = "—"): string {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function matchesSearch(lead: LeadRecord, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const haystack = [
    lead.name ?? "",
    lead.phone,
    lead.address,
    lead.email ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function matchesFilters(
  lead: LeadRecord,
  leadTypeFilter: LeadTypeFilter,
  statusFilter: StatusFilter,
  search: string,
): boolean {
  if (leadTypeFilter !== "all" && lead.leadType !== leadTypeFilter) return false;
  if (statusFilter !== "all" && lead.status !== statusFilter) return false;
  if (!matchesSearch(lead, search)) return false;
  return true;
}

function KpiCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-navy">{value.toLocaleString("ko-KR")}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function LeadTypeBadge({ leadType }: { leadType: LeadType }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${LEAD_TYPE_STYLES[leadType]}`}
    >
      {LEAD_TYPE_LABELS[leadType]}
    </span>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

function ScoreBadge({ leadType }: { leadType: LeadType }) {
  const score = leadTypeToScore(leadType);
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${SCORE_STYLES[score]}`}
    >
      {LEAD_SCORE_LABELS[score]}
    </span>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-navy text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function DetailPanel({
  lead,
  onClose,
  onStatusUpdated,
  onDeleted,
}: {
  lead: LeadRecord;
  onClose: () => void;
  onStatusUpdated: (updated: LeadRecord) => void;
  onDeleted: (id: string) => void;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setStatus(lead.status);
    setMessage("");
  }, [lead]);

  async function handleSaveStatus() {
    if (status === lead.status) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string; lead?: LeadRecord };
      if (!res.ok || !data.lead) {
        throw new Error(data.error ?? "상태 변경에 실패했습니다.");
      }
      onStatusUpdated(data.lead);
      setMessage("상태가 저장되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "상태 변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("이 리드를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.");
    if (!confirmed) return;

    setDeleting(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "리드 삭제에 실패했습니다.");
      }
      onDeleted(lead.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "리드 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">리드 상세</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{displayValue(lead.name, "이름 미입력")}</h2>
          <p className="text-sm text-slate-600">{lead.address}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          닫기
        </button>
      </div>

      <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-wrap items-center gap-2">
          <LeadTypeBadge leadType={lead.leadType} />
          <StatusBadge status={lead.status} />
          <ScoreBadge leadType={lead.leadType} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoBlock label="접수일시" value={formatCreatedAtKst(lead.createdAt)} />
          <InfoBlock label="연락처" value={lead.phone} />
          <InfoBlock label="이메일" value={displayValue(lead.email)} />
          <InfoBlock label="설치유형" value={displayValue(lead.installType)} />
          <InfoBlock
            label="예상용량(kW)"
            value={displayValue(
              lead.estimatedCapacityKw != null && Number.isFinite(lead.estimatedCapacityKw)
                ? lead.estimatedCapacityKw
                : lead.analysisContext?.capacity,
            )}
          />
          <InfoBlock label="source" value={lead.source} />
        </div>

        {lead.message && (
          <div>
            <p className="text-xs font-semibold text-slate-500">문의내용</p>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-3 text-sm leading-relaxed text-slate-700">
              {lead.message}
            </p>
          </div>
        )}

        {lead.resultUrl && (
          <LinkBlock label="결과 URL" href={lead.resultUrl} />
        )}
        {lead.pdfUrl && <LinkBlock label="PDF URL" href={lead.pdfUrl} />}

        <div className="rounded-xl border border-navy/15 bg-slate-50 p-4">
          <p className="text-sm font-bold text-navy">상태 변경</p>
          <p className="mt-1 text-xs text-slate-600">계약 전환 관리를 위해 리드 상태를 업데이트합니다.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {LEAD_STATUSES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  status === item
                    ? "bg-navy text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {LEAD_STATUS_LABELS[item]}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSaveStatus()}
              disabled={saving || status === lead.status}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "저장 중..." : "상태 저장"}
            </button>
            {message && (
              <p className={`text-xs font-medium ${message.includes("실패") ? "text-rose-700" : "text-emerald-700"}`}>
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-rose-200 bg-rose-50/40 p-4">
          <p className="text-sm font-bold text-rose-900">위험 구역</p>
          <p className="mt-1 text-xs leading-relaxed text-rose-800">
            테스트 리드나 중복·오입력 데이터를 삭제할 수 있습니다. 삭제된 리드는 복구할 수 없으니
            신중하게 진행해 주세요.
          </p>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting || saving}
            className="mt-4 rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "삭제 중..." : "리드 삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function LinkBlock({ label, href }: { label: string; href: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block break-all text-sm font-medium text-navy underline"
      >
        {href}
      </a>
    </div>
  );
}

export default function AdminLeadsDashboard() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [kpi, setKpi] = useState<LeadAdminKpi | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [leadTypeFilter, setLeadTypeFilter] = useState<LeadTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [newLeadIds, setNewLeadIds] = useState<Set<string>>(() => new Set());
  const [unreadNewCount, setUnreadNewCount] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<LeadRecord[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  const { detectNewLeads } = useLeadIdTracker();
  const highlightTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useLeadNotificationPermissionOnMount();

  const registerNewLeads = useCallback((freshLeads: LeadRecord[]) => {
    if (freshLeads.length === 0) return;

    setNewLeadIds((prev) => {
      const next = new Set(prev);
      for (const lead of freshLeads) next.add(lead.id);
      return next;
    });
    setUnreadNewCount((count) => count + freshLeads.length);
    setRecentAlerts((prev) => [...freshLeads, ...prev].slice(0, 5));

    for (const lead of freshLeads) {
      showBrowserLeadNotification(lead);
      const existing = highlightTimersRef.current.get(lead.id);
      if (existing) clearTimeout(existing);
      highlightTimersRef.current.set(
        lead.id,
        setTimeout(() => {
          setNewLeadIds((prev) => {
            const next = new Set(prev);
            next.delete(lead.id);
            return next;
          });
          highlightTimersRef.current.delete(lead.id);
        }, 5 * 60_000),
      );
    }
  }, []);

  const refreshLeads = useCallback(
    async (options?: { initial?: boolean }) => {
      const isInitial = options?.initial ?? false;
      if (isInitial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError("");
      try {
        const res = await fetch("/api/admin/leads", { cache: "no-store" });
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as { leads: LeadRecord[]; kpi: LeadAdminKpi };
        const freshLeads = detectNewLeads(data.leads);
        if (!isInitial) {
          registerNewLeads(freshLeads);
        }
        setLeads(data.leads);
        setKpi(data.kpi);
        setLastRefreshedAt(new Date().toISOString());
      } catch {
        setError("리드 데이터를 불러오지 못했습니다.");
      } finally {
        if (isInitial) setLoading(false);
        else setRefreshing(false);
      }
    },
    [detectNewLeads, registerNewLeads],
  );

  useEffect(() => {
    void refreshLeads({ initial: true });
    const interval = setInterval(() => {
      void refreshLeads();
    }, LEAD_ADMIN_POLL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      for (const timer of highlightTimersRef.current.values()) {
        clearTimeout(timer);
      }
      highlightTimersRef.current.clear();
    };
  }, [refreshLeads]);

  const filteredLeads = useMemo(
    () => leads.filter((lead) => matchesFilters(lead, leadTypeFilter, statusFilter, search)),
    [leads, leadTypeFilter, statusFilter, search],
  );

  const selectedLead =
    filteredLeads.find((lead) => lead.id === selectedId) ??
    leads.find((lead) => lead.id === selectedId) ??
    null;

  function dismissNewLeadAlerts() {
    setUnreadNewCount(0);
    setRecentAlerts([]);
  }

  function handleStatusUpdated(updated: LeadRecord) {
    const nextLeads = leads.map((lead) => (lead.id === updated.id ? updated : lead));
    setLeads(nextLeads);
    setKpi(computeLeadAdminKpi(nextLeads));
  }

  function handleLeadDeleted(id: string) {
    const nextLeads = leads.filter((lead) => lead.id !== id);
    setLeads(nextLeads);
    setKpi(computeLeadAdminKpi(nextLeads));
    setSelectedId(null);
    setNotice("리드가 삭제되었습니다.");
    setNewLeadIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <AdminNav active="leads" />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
        <strong>관리자 리드 대시보드</strong> · Step 7.4 실시간 polling({LEAD_ADMIN_POLL_INTERVAL_MS / 1000}
        초)으로 신규 리드를 자동 갱신합니다. 이메일 알림과 병행됩니다.
      </div>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-navy">리드 관리</h1>
            {unreadNewCount > 0 && (
              <span className="inline-flex animate-pulse items-center rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                NEW LEAD {unreadNewCount > 1 ? `+${unreadNewCount}` : ""}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            PDF 다운로드 · 상담 신청 · 결과 저장 전환 포인트에서 수집된 리드를 leadType·status별로 관리합니다.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {refreshing ? "갱신 중…" : "실시간 감시 중"}
            {lastRefreshedAt ? ` · 마지막 갱신 ${formatCreatedAtKst(lastRefreshedAt)}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshLeads()}
          disabled={refreshing || loading}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {refreshing ? "갱신 중…" : "지금 갱신"}
        </button>
      </div>

      {unreadNewCount > 0 && (
        <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-emerald-900">
              신규 리드 {unreadNewCount}건이 유입되었습니다.
            </p>
            <button
              type="button"
              onClick={dismissNewLeadAlerts}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              확인
            </button>
          </div>
          <ul className="mt-2 space-y-1.5">
            {recentAlerts.map((lead) => (
              <li key={lead.id} className="text-xs text-emerald-900">
                <ScoreBadge leadType={lead.leadType} /> {buildLeadAlertMessage(lead)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notice && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {notice}
        </p>
      )}

      {kpi && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="총 리드" value={kpi.total} />
          <KpiCard label="신규 리드" value={kpi.newLeads} hint={unreadNewCount > 0 ? `+${unreadNewCount} 실시간` : undefined} />
          <KpiCard label="상담중" value={kpi.inConsultation} hint="contacted + quoted" />
          <KpiCard label="계약 완료" value={kpi.contracted} />
          <KpiCard label="오늘 유입" value={kpi.todayCount} />
          <KpiCard label="최근 7일" value={kpi.last7DaysCount} />
        </div>
      )}

      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">leadType</p>
        <div className="flex flex-wrap gap-2">
          {LEAD_TYPE_FILTERS.map((filter) => (
            <FilterChip
              key={filter.id}
              active={leadTypeFilter === filter.id}
              label={filter.label}
              onClick={() => setLeadTypeFilter(filter.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">status</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <FilterChip
              key={filter.id}
              active={statusFilter === filter.id}
              label={filter.label}
              onClick={() => setStatusFilter(filter.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-4">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="이름 · 전화번호 · 주소 검색"
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-navy/20 focus:ring-2"
        />
      </div>

      {loading && <p className="mt-6 text-sm text-slate-500">불러오는 중…</p>}
      {error && <p className="mt-6 text-sm text-rose-600">{error}</p>}

      {!loading && !error && (
        <>
          <p className="mt-4 text-xs text-slate-500">
            {filteredLeads.length}건 표시 (전체 {leads.length}건)
          </p>

          <div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy text-white">
                <tr>
                  <th className="px-3 py-3 font-semibold">접수일시</th>
                  <th className="px-3 py-3 font-semibold">이름</th>
                  <th className="px-3 py-3 font-semibold">연락처</th>
                  <th className="px-3 py-3 font-semibold">주소</th>
                  <th className="px-3 py-3 font-semibold">우선순위</th>
                  <th className="px-3 py-3 font-semibold">용량</th>
                  <th className="px-3 py-3 font-semibold">leadType</th>
                  <th className="px-3 py-3 font-semibold">status</th>
                  <th className="px-3 py-3 font-semibold">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                      표시할 리드가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isNew = newLeadIds.has(lead.id);
                    return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-50 ${newLeadRowClass(isNew, selectedId === lead.id)}`}
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                        <div className="flex items-center gap-2">
                          {isNew && (
                            <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              NEW
                            </span>
                          )}
                          {formatCreatedAtKst(lead.createdAt)}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {displayValue(lead.name, "—")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700">{lead.phone}</td>
                      <td className="min-w-[220px] px-3 py-3 text-slate-700">{lead.address}</td>
                      <td className="px-3 py-3">
                        <ScoreBadge leadType={lead.leadType} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatCapacityKw(lead)}</td>
                      <td className="px-3 py-3">
                        <LeadTypeBadge leadType={lead.leadType} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedId(lead.id)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          상세
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 md:hidden">
            {filteredLeads.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                표시할 리드가 없습니다.
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isNew = newLeadIds.has(lead.id);
                return (
                <div
                  key={lead.id}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${
                    isNew ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {isNew && (
                          <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            NEW
                          </span>
                        )}
                        <p className="font-bold text-slate-900">{displayValue(lead.name, "이름 미입력")}</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{lead.phone}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatCreatedAtKst(lead.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <ScoreBadge leadType={lead.leadType} />
                      <StatusBadge status={lead.status} />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{lead.address}</p>
                  <p className="mt-1 text-xs text-slate-500">용량 {formatCapacityKw(lead)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <LeadTypeBadge leadType={lead.leadType} />
                    <button
                      type="button"
                      onClick={() => setSelectedId(lead.id)}
                      className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      상세
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>

          {selectedLead && (
            <div className="mt-6">
              <DetailPanel
                lead={selectedLead}
                onClose={() => setSelectedId(null)}
                onStatusUpdated={handleStatusUpdated}
                onDeleted={handleLeadDeleted}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
