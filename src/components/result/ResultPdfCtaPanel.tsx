"use client";

import Link from "next/link";
import PdfDownloadButton from "@/components/result/PdfDownloadButton";

export default function ResultPdfCtaPanel({ address }: { address: string }) {
  return (
    <section
      id="pdf-proposal"
      className="scroll-mt-24 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 sm:p-8"
    >
      <h2 className="text-xl font-extrabold tracking-tight text-navy sm:text-2xl">
        분석 결과를 제안서로 받아보세요
      </h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-base">
        입지 정보와 예상 설치용량, 발전량, 수익성 분석 내용을 PDF로 확인할 수 있습니다.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <PdfDownloadButton address={address} variant="panel" />
        <Link
          href="#consultation"
          className="btn-primary inline-flex h-12 items-center justify-center px-5 text-sm font-bold"
        >
          무료 컨설팅 상담 신청하기
        </Link>
      </div>
    </section>
  );
}
