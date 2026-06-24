"use client";

import { useMemo, useState } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { formatParcelShortLabel } from "@/lib/parcels/format";
import type { SearchHistoryEntry } from "@/types/searchHistory";

function formatSearchedAtKst(iso: string): string {
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

interface AdminSearchHistoryTableProps {
  entries: SearchHistoryEntry[];
}

export default function AdminSearchHistoryTable({ entries: initialEntries }: AdminSearchHistoryTableProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [notice, setNotice] = useState("");

  const visibleIds = useMemo(() => entries.map((entry) => entry.id), [entries]);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.reload();
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `선택한 조회 이력 ${ids.length}건을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.`,
      )
    ) {
      return;
    }

    setBulkDeleting(true);
    setNotice("");
    try {
      const res = await fetch("/api/admin/search-history/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = (await res.json()) as {
        error?: string;
        deleted?: number;
        failed?: string[];
      };
      if (!res.ok) {
        throw new Error(data.error ?? "선택 삭제에 실패했습니다.");
      }

      const failed = data.failed ?? [];
      const deletedCount = data.deleted ?? 0;
      const failedSet = new Set(failed);
      const deletedSet = new Set(ids.filter((id) => !failedSet.has(id)));

      setEntries((prev) => prev.filter((entry) => !deletedSet.has(entry.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of deletedSet) next.delete(id);
        return next;
      });

      const failedMessage = failed.length > 0 ? ` 실패 ${failed.length}건` : "";
      setNotice(`조회 이력 ${deletedCount}건이 삭제되었습니다.${failedMessage}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "선택 삭제에 실패했습니다.");
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <AdminNav active="search-history" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">입지검토 조회 이력</h1>
          <p className="mt-1 text-sm text-slate-600">
            상담신청 이전 단계의 주소 검색·분석 조회 기록입니다. (총 {entries.length}건)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/search-history/csv"
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            CSV 다운로드
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            로그아웃
          </button>
        </div>
      </div>

      {notice && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {notice}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAllVisible}
            disabled={entries.length === 0 || bulkDeleting}
            className="h-4 w-4 rounded border-slate-300 text-navy focus:ring-navy/30"
          />
          현재 목록 전체 선택
        </label>
        <span className="text-xs text-slate-500">
          {selectedIds.size > 0 ? `${selectedIds.size}건 선택됨` : "선택된 항목 없음"}
        </span>
        <button
          type="button"
          onClick={() => void handleBulkDelete()}
          disabled={selectedIds.size === 0 || bulkDeleting}
          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {bulkDeleting ? "삭제 중..." : "선택 삭제"}
        </button>
      </div>

      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="w-10 px-4 py-3">
                  <span className="sr-only">선택</span>
                </th>
                <th className="px-4 py-3 font-semibold">조회일시</th>
                <th className="px-4 py-3 font-semibold">주소</th>
                <th className="px-4 py-3 font-semibold">필지</th>
                <th className="px-4 py-3 font-semibold">지목</th>
                <th className="px-4 py-3 font-semibold">용도지역</th>
                <th className="px-4 py-3 font-semibold">설치유형</th>
                <th className="px-4 py-3 font-semibold">예상 설치용량</th>
                <th className="px-4 py-3 font-semibold">예상 연매출</th>
                <th className="px-4 py-3 font-semibold">상담신청</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                    저장된 조회 이력이 없습니다.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(entry.id)}
                        onChange={() => toggleSelection(entry.id)}
                        disabled={bulkDeleting}
                        className="h-4 w-4 rounded border-slate-300 text-navy focus:ring-navy/30"
                        aria-label={`${entry.address} 선택`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatSearchedAtKst(entry.searchedAt)}
                    </td>
                    <td className="min-w-[220px] px-4 py-3 text-slate-900">{entry.address}</td>
                    <td className="min-w-[160px] px-4 py-3 text-slate-700">
                      {entry.parcelCount && entry.parcelCount > 1 ? (
                        <div>
                          <p className="font-semibold text-navy">{entry.parcelCount}필지</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {entry.totalLandArea ?? entry.landArea}
                          </p>
                          {entry.parcels?.slice(0, 3).map((parcel) => (
                            <p key={parcel.pnu} className="text-xs text-slate-600">
                              {formatParcelShortLabel(parcel.jibunAddress)} {parcel.areaLabel}
                            </p>
                          ))}
                        </div>
                      ) : (
                        "1필지"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{entry.landCategory}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.zoning}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.installType}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{entry.capacity}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{entry.annualRevenue}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          entry.consultSubmitted
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {entry.consultSubmitted ? "완료" : "미신청"}
                      </span>
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
