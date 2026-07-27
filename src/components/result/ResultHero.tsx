"use client";

import Link from "next/link";
import PdfDownloadButton from "@/components/result/PdfDownloadButton";
import { formatReferenceDataMonth } from "@/lib/result/heroDisplay";

interface ResultHeroProps {
  address: string;
  jibunAddress: string;
  buildingName?: string;
  analyzedAt: string;
  recommendation: string;
}

export default function ResultHero({
  address,
  jibunAddress,
  buildingName,
  analyzedAt,
  recommendation,
}: ResultHeroProps) {
  const installTypeLabel = recommendation.split("(")[0]?.trim() || recommendation;

  return (
    <div id="result-header" className="result-hero scroll-mt-24">
      <div className="result-hero-pattern pointer-events-none absolute inset-0" aria-hidden />
      <div className="result-hero-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto max-w-[1360px] px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-300">입지검토 결과</p>
            <h1 className="mt-1.5 text-[24px] font-bold leading-tight tracking-tight text-white sm:text-[30px] lg:text-[34px]">
              {address}
            </h1>
            {(jibunAddress !== address || buildingName) && (
              <p className="mt-1.5 text-sm text-slate-300">
                {jibunAddress}
                {buildingName ? ` · ${buildingName}` : ""}
              </p>
            )}
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300 sm:text-sm">
              <span>분석 기준일: {analyzedAt}</span>
              <span>참고 데이터: {formatReferenceDataMonth(analyzedAt)}</span>
              <span>추천 유형: {installTypeLabel}</span>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2.5 sm:max-w-md sm:flex-row lg:w-auto lg:max-w-none">
            <PdfDownloadButton address={address} variant="hero" />
            <Link
              href="#consultation"
              className="btn-primary inline-flex h-11 items-center justify-center px-5 text-sm font-bold lg:min-w-[200px]"
            >
              무료 전문가 상담
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
