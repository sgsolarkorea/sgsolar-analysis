"use client";

import { useState } from "react";
import LeadCaptureModal from "@/components/result/LeadCaptureModal";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { buildPdfApiUrl } from "@/lib/leads/downloadPdf";
import { parcelToSnapshot } from "@/lib/parcels/aggregate";

interface SaveResultCTAProps {
  address: string;
}

export default function SaveResultCTA({ address }: SaveResultCTAProps) {
  const { metrics, installType, parcels } = useResultMetrics();
  const [modalOpen, setModalOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasMultiParcel = parcels.length > 1;

  return (
    <section id="save-result" className="scroll-mt-24">
      <div className="rounded-xl border border-navy/15 bg-gradient-to-br from-sky-50/80 via-white to-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">분석 결과 저장</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          연락처를 남기시면 이 분석 결과를 저장해 두고, 담당자가 추가 안내를 드릴 수 있습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex h-11 items-center rounded-lg bg-navy px-4 text-sm font-semibold text-white hover:bg-navy/90"
          >
            분석 결과 저장하기
          </button>
          {saved && (
            <span className="inline-flex h-11 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-800">
              저장 요청이 접수되었습니다.
            </span>
          )}
        </div>
      </div>

      <LeadCaptureModal
        open={modalOpen}
        variant="save_result"
        title="분석 결과 저장"
        description="연락처를 입력하시면 분석 결과 링크를 저장하고 담당자가 확인 후 안내드립니다."
        address={address}
        installType={installType}
        estimatedCapacityKw={metrics.capacityKw}
        pdfUrl={buildPdfApiUrl(address, hasMultiParcel)}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setSaved(true);
        }}
      />
    </section>
  );
}
