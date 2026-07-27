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

      <div className="relative mx-auto max-w-[1320px] px-4 py-5 sm:px-6 sm:py-6 lg:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              입지검토 결과
            </span>

            <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-tight text-white sm:text-[32px] lg:text-[36px]">
              {address}
            </h1>
            {(jibunAddress !== address || buildingName) && (
              <p className="mt-2 text-sm text-slate-300">
                {jibunAddress}
                {buildingName ? ` · ${buildingName}` : ""}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300 sm:text-sm">
              <span>분석 기준일: {analyzedAt}</span>
              <span>참고 데이터: {formatReferenceDataMonth(analyzedAt)}</span>
              <span>추천 유형: {installTypeLabel}</span>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3 sm:max-w-md sm:flex-row lg:w-auto lg:max-w-none lg:flex-col">
            <PdfDownloadButton address={address} variant="hero" />
            <Link
              href="#consultation"
              className="btn-primary inline-flex h-12 items-center justify-center px-5 text-sm font-bold lg:min-w-[220px]"
            >
              무료 전문가 상담
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              다시 검색
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
