"use client";

import { useState } from "react";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { parcelToSnapshot } from "@/lib/parcels/aggregate";
import { formatParcelShortLabel } from "@/lib/parcels/format";

interface PdfDownloadButtonProps {
  address: string;
}

export default function PdfDownloadButton({ address }: PdfDownloadButtonProps) {
  const { parcels, parcelSummary } = useResultMetrics();
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const hasMultiParcel = parcels.length > 1;
      const res = hasMultiParcel
        ? await fetch("/api/report/pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address,
              parcels: parcels.map(parcelToSnapshot),
            }),
          })
        : await fetch(`/api/report/pdf?${new URLSearchParams({ address }).toString()}`);

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const detail = body && typeof body.error === "string" ? body.error : null;
        throw new Error(detail ?? "PDF 생성에 실패했습니다.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? "sgsolar-site-review.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : "PDF 다운로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const parcelHint =
    parcels.length > 1
      ? ` · ${parcelSummary.parcelCount}필지 (${parcels.map((p) => formatParcelShortLabel(p.jibunAddress)).join(", ")})`
      : "";

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-400 bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-600 disabled:opacity-60"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {loading ? "PDF 생성 중..." : `PDF 제안서 다운로드${parcelHint}`}
    </button>
  );
}
