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

/** Compact result header — map (FRAME 01) is the visual hero, not this band. */
export default function ResultHero({
  address,
  jibunAddress,
  buildingName,
  analyzedAt,
  recommendation,
}: ResultHeroProps) {
  const installTypeLabel = recommendation.split("(")[0]?.trim() || recommendation;

  return (
    <div id="result-header" className="scroll-mt-24 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">입지검토 결과</p>
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight tracking-tight text-navy sm:text-[32px] lg:text-[36px]">
            {address}
          </h1>
          {(jibunAddress !== address || buildingName) && (
            <p className="mt-1 truncate text-sm text-slate-500">
              {jibunAddress}
              {buildingName ? ` · ${buildingName}` : ""}
            </p>
          )}
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>분석 기준일 {analyzedAt}</span>
            <span>참고 데이터 {formatReferenceDataMonth(analyzedAt)}</span>
            <span>{installTypeLabel}</span>
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:max-w-md sm:flex-row lg:w-auto lg:max-w-none">
          <PdfDownloadButton address={address} variant="default" />
          <Link
            href="#frame-conversion"
            className="btn-primary inline-flex h-11 items-center justify-center px-5 text-sm font-bold lg:min-w-[180px]"
          >
            무료 전문가 상담
          </Link>
        </div>
      </div>
    </div>
  );
}
