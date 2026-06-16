"use client";

import { useState } from "react";
import AdminNav from "@/components/admin/AdminNav";
import {
  ORDINANCE_DISPLAY_LABELS,
  ORDINANCE_STATUS_LABELS,
  type OrdinanceRecordStatus,
  type SearchDashboardStats,
} from "@/types/ordinanceLearning";

interface AdminOrdinanceRow {
  slug: string;
  municipalityLabel: string;
  status: OrdinanceRecordStatus;
  sourceType: "static" | "ai_draft" | "manual";
  searchCount: number;
  lastSearchedAt?: string;
  reviewedAt?: string;
  currentVersion: number;
  isStatic: boolean;
}

interface AdminOrdinanceDashboardProps {
  rows: AdminOrdinanceRow[];
  stats: SearchDashboardStats;
}

function formatDateTime(iso?: string): string {
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

function StatusBadge({ status }: { status: OrdinanceRecordStatus }) {
  const styles: Record<OrdinanceRecordStatus, string> = {
    approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
    ai_pending: "bg-amber-50 text-amber-900 border-amber-200",
    generating: "bg-blue-50 text-blue-800 border-blue-200",
    review: "bg-violet-50 text-violet-800 border-violet-200",
    unregistered: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${styles[status]}`}>
      {ORDINANCE_STATUS_LABELS[status]}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card-premium p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function RegionList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: SearchDashboardStats["popularRegions"];
  emptyText: string;
}) {
  return (
    <div className="card-premium p-5">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {items.map((item, index) => (
            <li
              key={item.municipalityLabel}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
            >
              <span className="text-sm font-medium text-slate-900">
                {index + 1}. {item.municipalityLabel}
              </span>
              <span className="text-sm font-semibold text-navy">{item.searchCount}회</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function AdminOrdinanceDashboard({ rows, stats }: AdminOrdinanceDashboardProps) {
  const [busySlug, setBusySlug] = useState<string | null>(null);

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.reload();
  }

  async function handleApprove(slug: string) {
    setBusySlug(slug);
    try {
      await fetch(`/api/admin/ordinances/${encodeURIComponent(slug)}/approve`, { method: "POST" });
      window.location.reload();
    } finally {
      setBusySlug(null);
    }
  }

  async function handleReject(slug: string) {
    setBusySlug(slug);
    try {
      await fetch(`/api/admin/ordinances/${encodeURIComponent(slug)}/reject`, { method: "POST" });
      window.location.reload();
    } finally {
      setBusySlug(null);
    }
  }

  async function handleProcessQueue() {
    await fetch("/api/admin/ordinances/process-queue", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <AdminNav active="ordinances" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">조례 학습 관리</h1>
          <p className="mt-1 text-sm text-slate-600">
            지역별 조례 등록 상태, AI 생성 대기, 검색 통계를 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleProcessQueue}
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            AI 큐 처리
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            로그아웃
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="오늘 조회" value={stats.todayCount} />
        <StatCard label="이번주 조회" value={stats.weekCount} />
        <StatCard label="이번달 조회" value={stats.monthCount} />
        <StatCard label="상담 전환율" value={`${stats.consultationConversionRate}%`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <RegionList title="인기 검색 지역 TOP10" items={stats.popularRegions} emptyText="조회 이력 없음" />
        <RegionList
          title="조례 미등록 지역 TOP10"
          items={stats.unregisteredTopRegions}
          emptyText="미등록 인기 지역 없음"
        />
      </div>

      <div className="card-premium mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">지자체</th>
                <th className="px-4 py-3 font-semibold">검색 횟수</th>
                <th className="px-4 py-3 font-semibold">마지막 조회</th>
                <th className="px-4 py-3 font-semibold">버전</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    등록된 조례 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.slug} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.municipalityLabel}</p>
                      <p className="text-xs text-slate-500">{row.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.searchCount}회</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatDateTime(row.lastSearchedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">v{row.currentVersion || 1}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3">
                      {row.status === "review" ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busySlug === row.slug}
                            onClick={() => handleApprove(row.slug)}
                            className="rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy/90 disabled:opacity-50"
                          >
                            승인
                          </button>
                          <button
                            type="button"
                            disabled={busySlug === row.slug}
                            onClick={() => handleReject(row.slug)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            재생성
                          </button>
                        </div>
                      ) : row.isStatic ? (
                        <span className="text-xs text-slate-500">{ORDINANCE_DISPLAY_LABELS.verified}</span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
