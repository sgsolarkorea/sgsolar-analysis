"use client";

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

export default function AdminSearchHistoryTable({ entries }: AdminSearchHistoryTableProps) {
  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
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

      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">조회일시</th>
                <th className="px-4 py-3 font-semibold">주소</th>
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
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    저장된 조회 이력이 없습니다.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatSearchedAtKst(entry.searchedAt)}
                    </td>
                    <td className="min-w-[220px] px-4 py-3 text-slate-900">{entry.address}</td>
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
