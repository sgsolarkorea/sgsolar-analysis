"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { formatManualOverrideJsonSnippet } from "@/lib/regulatory/generateManualOverridePreview";
import type { ParsedDistanceSet } from "@/types/regulatoryReview";
import type {
  RegulatoryReviewAdminMeta,
  RegulatoryReviewAdminRow,
  RegulatoryReviewAdminStatus,
} from "@/types/regulatoryReviewAdmin";

type StatusFilter = "all" | "manual_review" | RegulatoryReviewAdminStatus;
type ConfidenceFilter = "all" | "high" | "medium" | "low" | "none";
type LinkFilter = "all" | "has" | "missing";

const STATUS_STYLES: Record<RegulatoryReviewAdminStatus, string> = {
  후보: "bg-sky-50 text-sky-800 border-sky-200",
  "수동 검토": "bg-amber-50 text-amber-900 border-amber-200",
  "수동 승인 완료": "bg-emerald-50 text-emerald-800 border-emerald-200",
  보류: "bg-slate-100 text-slate-700 border-slate-200",
  제외: "bg-rose-50 text-rose-800 border-rose-200",
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-800",
  medium: "bg-blue-50 text-blue-800",
  low: "bg-amber-50 text-amber-900",
  none: "bg-slate-100 text-slate-600",
};

const DISTANCE_FIELDS: Array<{ key: keyof ParsedDistanceSet; label: string; hideByDefault?: boolean }> =
  [
    { key: "building", label: "건축물" },
    { key: "residential", label: "주거지" },
    { key: "road", label: "도로" },
    { key: "river", label: "하천" },
    { key: "cultural", label: "문화재" },
    { key: "school", label: "학교", hideByDefault: true },
  ];

function shouldShowSchool(row: RegulatoryReviewAdminRow): boolean {
  if (row.extractedDistances.school != null) return true;
  return (row.candidate.manualReviewCandidates ?? []).some(
    (item) => item.category === "school" && item.reason !== "non_solar_facility_permit_rule",
  );
}

function matchesFilters(
  row: RegulatoryReviewAdminRow,
  statusFilter: StatusFilter,
  confidenceFilter: ConfidenceFilter,
  linkFilter: LinkFilter,
  regionSearch: string,
): boolean {
  if (statusFilter === "manual_review") {
    if (!row.requiresManualReview && row.reviewStatus !== "수동 검토") return false;
  } else if (statusFilter !== "all" && row.reviewStatus !== statusFilter) {
    return false;
  }

  if (confidenceFilter !== "all" && row.parserConfidence !== confidenceFilter) return false;

  if (linkFilter === "has" && !row.hasSourceUrl) return false;
  if (linkFilter === "missing" && row.hasSourceUrl) return false;

  if (regionSearch.trim()) {
    const q = regionSearch.trim().toLowerCase();
    const haystack = `${row.municipalityLabel} ${row.sido} ${row.sigungu} ${row.regionKey} ${row.ordinanceName}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}

function DetailPanel({
  row,
  onClose,
}: {
  row: RegulatoryReviewAdminRow;
  onClose: () => void;
}) {
  const [previewMode, setPreviewMode] = useState<"manual_verified" | "manual_pending">("manual_verified");
  const [copyMessage, setCopyMessage] = useState("");
  const showSchool = shouldShowSchool(row);
  const previewJson = useMemo(
    () => formatManualOverrideJsonSnippet(row, previewMode),
    [row, previewMode],
  );

  async function copyPreview() {
    try {
      await navigator.clipboard.writeText(previewJson);
      setCopyMessage("복사되었습니다.");
    } catch {
      setCopyMessage("복사에 실패했습니다.");
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">상세 검수</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{row.municipalityLabel}</h2>
          <p className="text-sm text-slate-600">{row.ordinanceName}</p>
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
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoBlock label="상태" value={row.reviewStatus} />
          <InfoBlock label="confidence" value={row.parserConfidence} />
          <InfoBlock label="추출 방식" value={row.distanceExtractionMethod} />
          <InfoBlock label="조문명" value={row.articleTitle} />
        </div>

        {row.sourceUrl ? (
          <div>
            <p className="text-xs font-semibold text-slate-500">원문 링크</p>
            <a
              href={row.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block break-all text-sm font-medium text-navy underline"
            >
              {row.sourceUrl}
            </a>
          </div>
        ) : (
          <p className="text-sm text-slate-500">원문 링크 없음</p>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">추출 거리값</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DISTANCE_FIELDS.filter((field) => !field.hideByDefault || showSchool).map((field) => (
              <div
                key={field.key}
                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="text-slate-500">{field.label}</span>
                <span className="ml-2 font-semibold text-slate-900">
                  {row.extractedDistances[field.key] != null
                    ? `${row.extractedDistances[field.key]}m`
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {row.recommendedSummary.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">추천 요약</p>
            <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
              {row.recommendedSummary.map((line) => (
                <li key={line} className="rounded-lg bg-slate-50 px-3 py-2">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {row.candidate.matchedText.length > 0 && (
          <CollapsibleBlock title="matchedText" items={row.candidate.matchedText} />
        )}

        {row.candidate.appendixMatchedText && row.candidate.appendixMatchedText.length > 0 && (
          <CollapsibleBlock title="appendixMatchedText" items={row.candidate.appendixMatchedText} />
        )}

        {row.candidate.excludedSections && row.candidate.excludedSections.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">excludedSections</p>
            <ul className="space-y-2 text-xs text-slate-600">
              {row.candidate.excludedSections.map((section, index) => (
                <li key={`${section.title}-${index}`} className="rounded-lg border border-slate-100 px-3 py-2">
                  <strong>{section.title}</strong>
                  {section.reason ? ` · ${section.reason}` : ""}
                  {section.distanceM != null ? ` · ${section.distanceM}m` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {row.candidate.manualReviewCandidates && row.candidate.manualReviewCandidates.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">manualReviewCandidates</p>
            <ul className="space-y-2 text-xs text-slate-600">
              {row.candidate.manualReviewCandidates.map((item, index) => (
                <li key={`${item.category}-${index}`} className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
                  <strong>{item.label ?? item.category}</strong> · {item.distanceM}m · {item.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {row.productionEntry && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
            <strong className="text-slate-800">production setback-regulations 참고</strong>
            <p className="mt-1">출처: {row.productionEntry.source}</p>
            <p>confidence: {row.productionEntry.confidence}</p>
          </div>
        )}

        {row.notes && (
          <div>
            <p className="text-xs font-semibold text-slate-500">notes</p>
            <p className="mt-1 text-sm text-slate-700">{row.notes}</p>
          </div>
        )}

        <div className="rounded-xl border border-navy/15 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-navy">manual override JSON 생성</p>
              <p className="mt-1 text-xs text-slate-600">
                setback-manual-overrides.json에 붙여넣을 항목 미리보기입니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode("manual_verified")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  previewMode === "manual_verified"
                    ? "bg-navy text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                승인
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("manual_pending")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  previewMode === "manual_pending"
                    ? "bg-amber-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                보류
              </button>
              <button
                type="button"
                onClick={() => void copyPreview()}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                JSON 복사
              </button>
            </div>
          </div>
          {copyMessage && <p className="mt-2 text-xs font-medium text-emerald-700">{copyMessage}</p>}
          <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-[11px] leading-relaxed text-slate-800">
            {previewJson}
          </pre>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function CollapsibleBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-slate-500">{title}</p>
      <ul className="max-h-48 space-y-2 overflow-auto text-xs text-slate-600">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="rounded-lg border border-slate-100 px-3 py-2 leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminRegulatoryReviewDashboard() {
  const [meta, setMeta] = useState<RegulatoryReviewAdminMeta | null>(null);
  const [rows, setRows] = useState<RegulatoryReviewAdminRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");
  const [linkFilter, setLinkFilter] = useState<LinkFilter>("all");
  const [regionSearch, setRegionSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/regulatory-review");
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { meta: RegulatoryReviewAdminMeta; rows: RegulatoryReviewAdminRow[] };
      setMeta(data.meta);
      setRows(data.rows);
    } catch {
      setError("조례 후보 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        matchesFilters(row, statusFilter, confidenceFilter, linkFilter, regionSearch),
      ),
    [rows, statusFilter, confidenceFilter, linkFilter, regionSearch],
  );

  const selectedRow = filteredRows.find((row) => row.regionKey === selectedKey) ??
    rows.find((row) => row.regionKey === selectedKey) ??
    null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <AdminNav active="regulatory-review" />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
        <strong>관리자 검수용 화면</strong> · 본 화면은 조례 후보 검수용입니다. 검증되지 않은 후보는
        결과페이지 기준값으로 자동 반영되지 않습니다.
      </div>

      <div className="mt-6">
        <h1 className="text-2xl font-bold text-navy">조례 후보 검수</h1>
        <p className="mt-2 text-sm text-slate-600">
          parsed_candidates · manual override · source registry · setback-regulations 데이터를 함께
          조회합니다.
        </p>
        {meta && (
          <p className="mt-2 text-xs text-slate-500">
            후보 {meta.candidateCount} · manual override {meta.manualOverrideCount} · production{" "}
            {meta.productionCount} · registry {meta.registryCount}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label="전체" />
        <FilterChip
          active={statusFilter === "manual_review"}
          onClick={() => setStatusFilter("manual_review")}
          label="수동 검토 필요"
        />
        {(["high", "medium", "low"] as const).map((level) => (
          <FilterChip
            key={level}
            active={confidenceFilter === level}
            onClick={() => setConfidenceFilter(confidenceFilter === level ? "all" : level)}
            label={level}
          />
        ))}
        <FilterChip
          active={linkFilter === "has"}
          onClick={() => setLinkFilter(linkFilter === "has" ? "all" : "has")}
          label="원문 링크 있음"
        />
        <FilterChip
          active={linkFilter === "missing"}
          onClick={() => setLinkFilter(linkFilter === "missing" ? "all" : "missing")}
          label="원문 링크 없음"
        />
      </div>

      <div className="mt-3">
        <input
          type="search"
          value={regionSearch}
          onChange={(event) => setRegionSearch(event.target.value)}
          placeholder="지역 검색 (예: 서산, 전주, 논산)"
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-navy/20 focus:ring-2"
        />
      </div>

      {loading && <p className="mt-6 text-sm text-slate-500">불러오는 중…</p>}
      {error && <p className="mt-6 text-sm text-rose-600">{error}</p>}

      {!loading && !error && (
        <>
          <p className="mt-4 text-xs text-slate-500">
            {filteredRows.length}건 표시 (전체 {rows.length}건)
          </p>

          <div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy text-white">
                <tr>
                  <th className="px-3 py-3 font-semibold">지역</th>
                  <th className="px-3 py-3 font-semibold">상태</th>
                  <th className="px-3 py-3 font-semibold">조례명</th>
                  <th className="px-3 py-3 font-semibold">추출값</th>
                  <th className="px-3 py-3 font-semibold">검토</th>
                  <th className="px-3 py-3 font-semibold">원문</th>
                  <th className="px-3 py-3 font-semibold">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr
                    key={row.regionKey}
                    className={`hover:bg-slate-50 ${selectedKey === row.regionKey ? "bg-sky-50/60" : ""}`}
                  >
                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold text-slate-900">{row.municipalityLabel}</div>
                      <div className="text-xs text-slate-500">{row.regionKey}</div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <StatusBadge status={row.reviewStatus} />
                      <div className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${CONFIDENCE_STYLES[row.parserConfidence] ?? CONFIDENCE_STYLES.none}`}>
                        {row.parserConfidence}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-medium text-slate-900">{row.ordinanceName}</div>
                      <div className="text-xs text-slate-500">{row.articleTitle}</div>
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-slate-700">{row.distanceSummary}</td>
                    <td className="px-3 py-3 align-top text-xs">
                      {row.requiresManualReview ? (
                        <span className="font-semibold text-amber-700">필요</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {row.hasSourceUrl ? (
                        <a
                          href={row.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-navy underline"
                        >
                          원문 보기
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">없음</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => setSelectedKey(row.regionKey)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        상세
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 md:hidden">
            {filteredRows.map((row) => (
              <div key={row.regionKey} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{row.municipalityLabel}</p>
                    <p className="mt-1 text-sm text-slate-700">{row.ordinanceName}</p>
                  </div>
                  <StatusBadge status={row.reviewStatus} />
                </div>
                <p className="mt-2 text-xs text-slate-600">{row.distanceSummary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.hasSourceUrl && (
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy"
                    >
                      원문 보기
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedKey(row.regionKey)}
                    className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    상세
                  </button>
                </div>
              </div>
            ))}
          </div>

          {selectedRow && (
            <div className="mt-6">
              <DetailPanel row={selectedRow} onClose={() => setSelectedKey(null)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: RegulatoryReviewAdminStatus }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-navy text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
