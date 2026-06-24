"use client";

import { useState } from "react";
import LeadCaptureModal from "@/components/result/LeadCaptureModal";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { buildPdfApiUrl, downloadResultPdf } from "@/lib/leads/downloadPdf";
import { parcelToSnapshot } from "@/lib/parcels/aggregate";
import { formatParcelShortLabel } from "@/lib/parcels/format";

interface PdfDownloadButtonProps {
  address: string;
}

export default function PdfDownloadButton({ address }: PdfDownloadButtonProps) {
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
    parcels.length > 1
      ? ` · ${parcelSummary.parcelCount}필지 (${parcels.map((p) => formatParcelShortLabel(p.jibunAddress)).join(", ")})`
      : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
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
