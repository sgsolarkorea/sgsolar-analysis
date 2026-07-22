"use client";

import { useState } from "react";
import LeadCaptureModal from "@/components/result/LeadCaptureModal";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { buildPdfApiUrl, downloadResultPdf } from "@/lib/leads/downloadPdf";
import { parcelToSnapshot } from "@/lib/parcels/aggregate";
import { formatParcelShortLabel } from "@/lib/parcels/format";

interface PdfDownloadButtonProps {
  address: string;
  variant?: "default" | "hero" | "panel" | "mobile";
  showParcelHint?: boolean;
}

export default function PdfDownloadButton({
  address,
  variant = "default",
  showParcelHint = false,
}: PdfDownloadButtonProps) {
  const { parcels, parcelSummary, metrics, installType } = useResultMetrics();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const parcelSnapshots = parcels.map(parcelToSnapshot);
  const hasMultiParcel = parcels.length > 1;

  async function runPdfDownload() {
    setLoading(true);
    try {
      await downloadResultPdf(address, parcelSnapshots);
    } catch (error) {
      alert(error instanceof Error ? error.message : "PDF 다운로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const parcelHint =
    showParcelHint && parcels.length > 1
      ? ` · ${parcelSummary.parcelCount}필지 (${parcels.map((p) => formatParcelShortLabel(p.jibunAddress)).join(", ")})`
      : "";

  const label = loading ? "제안서 생성 중" : `PDF 제안서 다운로드${parcelHint}`;

  const className =
    variant === "hero"
      ? "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15 disabled:opacity-60"
      : variant === "panel"
        ? "btn-outline inline-flex h-12 items-center justify-center gap-2 px-5 text-sm font-bold disabled:opacity-60"
        : variant === "mobile"
          ? "btn-outline inline-flex h-11 w-full items-center justify-center gap-2 px-4 text-sm font-bold disabled:opacity-60"
          : "btn-outline inline-flex h-11 items-center justify-center gap-2 px-4 text-sm font-semibold disabled:opacity-60";

  return (
    <>
      <button type="button" onClick={() => setModalOpen(true)} disabled={loading} className={className}>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {label}
      </button>

      <LeadCaptureModal
        open={modalOpen}
        variant="pdf_download"
        title="PDF 보고서 발급"
        description="PDF 보고서 발급을 위해 연락처를 입력해주세요. 담당자가 검토 후 추가 상담도 도와드립니다."
        address={address}
        installType={installType}
        estimatedCapacityKw={metrics.capacityKw}
        pdfUrl={buildPdfApiUrl(address, hasMultiParcel)}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          void runPdfDownload();
        }}
      />
    </>
  );
}
