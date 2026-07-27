"use client";

import Link from "next/link";
import PdfDownloadButton from "@/components/result/PdfDownloadButton";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";

/** FRAME 08 — decision moment, not another card. */
export default function ResultPdfCtaPanel({ address }: { address: string }) {
  const { capacity, installType } = useResultMetrics();

  return (
    <div
      id="pdf-proposal"
      className="scroll-mt-24 bg-navy px-5 py-10 text-white sm:px-8 sm:py-12 lg:px-10"
    >
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-sky-300">분석 완료</p>
          <h3 className="mt-3 text-[28px] font-extrabold tracking-tight sm:text-[34px]">
            분석 결과를 바탕으로
            <br className="hidden sm:block" />
            실제 설치 가능성을 검토해보세요.
          </h3>
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-[14px] text-slate-300">
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
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
          <PdfDownloadButton address={address} variant="panel" />
          <Link
            href="#consultation"
            className="inline-flex h-12 items-center justify-center border border-white/30 bg-transparent px-5 text-sm font-bold text-white hover:bg-white/10"
          >
            무료 전문가 상담
          </Link>
        </div>
      </div>
    </div>
  );
}
