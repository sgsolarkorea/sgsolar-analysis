"use client";

import Link from "next/link";
import PdfDownloadButton from "@/components/result/PdfDownloadButton";

export default function ResultPdfCtaPanel({ address }: { address: string }) {
  return (
    <div id="pdf-proposal" className="scroll-mt-24 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div>
        <h3 className="text-xl font-extrabold tracking-tight text-navy sm:text-2xl">
          결과를 더 자세히 확인하세요
        </h3>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600 sm:text-base">
          입지·용량·발전량·시장수익·투자 시뮬레이션을 PDF로 정리하거나, 전문가와 함께 다음 단계를
          검토할 수 있습니다.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
        <PdfDownloadButton address={address} variant="panel" />
        <Link
          href="#consultation"
          className="btn-primary inline-flex h-12 items-center justify-center px-5 text-sm font-bold"
        >
          무료 전문가 상담
        </Link>
      </div>
    </div>
  );
}
