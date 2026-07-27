"use client";

import { useState } from "react";
import PdfDownloadButton from "@/components/result/PdfDownloadButton";
import ResultConsultationModal from "@/components/result/ResultConsultationModal";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { company } from "@/data/sampleData";

/** FRAME 08 — conversion moment; forms open in modal/sheet. */
export default function ResultPdfCtaPanel({ address }: { address: string }) {
  const { capacity, installType, consultationContext } = useResultMetrics();
  const [consultOpen, setConsultOpen] = useState(false);

  return (
    <>
      <div
        id="pdf-proposal"
        className="scroll-mt-24 rounded-[22px] bg-navy px-5 py-10 text-white sm:px-8 sm:py-12 lg:px-10"
      >
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-sky-300">분석 완료</p>
        <h3 className="mt-3 text-[28px] font-extrabold tracking-tight sm:text-[34px]">
          다음 단계로 이어가세요
        </h3>

        <dl className="mt-6 space-y-3 text-[14px] text-slate-300">
          <div>
            <dt className="text-slate-400">주소</dt>
            <dd className="mt-0.5 font-semibold text-white">{address}</dd>
          </div>
          {capacity ? (
            <div>
              <dt className="text-slate-400">예상 설치용량</dt>
              <dd className="mt-0.5 font-semibold text-white">{capacity}</dd>
            </div>
          ) : null}
          {installType ? (
            <div>
              <dt className="text-slate-400">설치형태</dt>
              <dd className="mt-0.5 font-semibold text-white">{installType}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <PdfDownloadButton address={address} variant="panel" />
          <button
            type="button"
            onClick={() => setConsultOpen(true)}
            className="inline-flex h-[56px] items-center justify-center rounded-xl border border-white/35 bg-transparent px-6 text-sm font-bold text-white hover:bg-white/10"
          >
            무료 전문가 상담
          </button>
        </div>

        <p className="mt-6 text-[15px] font-semibold text-sky-200">
          전화 상담{" "}
          <a href={`tel:${company.phone.replace(/-/g, "")}`} className="text-white underline-offset-2 hover:underline">
            {company.phone}
          </a>
        </p>
      </div>

      <ResultConsultationModal
        open={consultOpen}
        onClose={() => setConsultOpen(false)}
        defaultAddress={address}
        analysisContext={consultationContext}
      />
    </>
  );
}
