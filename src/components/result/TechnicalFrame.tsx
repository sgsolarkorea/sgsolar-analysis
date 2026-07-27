"use client";

import Image from "next/image";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { resolveInstallVisualSet } from "@/data/installationVisuals";

/** FRAME 02 — 38/62 navy editorial, photo drives layout. */
export default function TechnicalFrame() {
  const { metrics, capacity, installType } = useResultMetrics();
  const usable = metrics.usableAreaSqm ?? metrics.roofUsableAreaSqm ?? metrics.baseAreaSqm;
  const { technical: visual } = resolveInstallVisualSet(installType);

  return (
    <div className="overflow-hidden bg-gradient-to-br from-[#07182f] via-[#0b1d3a] to-[#12315d] px-5 py-8 text-white sm:px-8 sm:py-10">
      <div className="grid items-stretch gap-8 lg:grid-cols-[0.38fr_0.62fr] lg:gap-10">
        <div className="flex flex-col justify-center">
          <p className="text-[13px] font-semibold text-sky-200/90">예상 시스템 규모</p>
          <p className="mt-2 text-[58px] font-extrabold leading-none tracking-tight text-white sm:text-[72px]">
            {capacity ? capacity.replace(/\s*kW/i, "") : "—"}
            <span className="ml-2 text-[28px] font-bold text-sky-100 sm:text-[32px]">kW</span>
          </p>

          <div className="mt-10 border-t border-white/20 pt-8">
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-[13px] text-sky-200/90">예상 모듈</p>
                <p className="mt-1 text-[22px] font-bold text-white sm:text-[24px]">
                  {metrics.moduleCount > 0 ? `${metrics.moduleCount.toLocaleString("ko-KR")}장` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[13px] text-sky-200/90">활용면적</p>
                <p className="mt-1 text-[22px] font-bold text-white sm:text-[24px]">
                  {usable != null && usable > 0 ? `${Math.round(usable).toLocaleString("ko-KR")}㎡` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[13px] text-sky-200/90">설치형태</p>
                <p className="mt-1 text-[22px] font-bold text-white sm:text-[24px]">
                  {installType || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative min-h-[300px] overflow-hidden rounded-[22px] bg-slate-900 sm:min-h-[400px] lg:min-h-[480px]">
          <Image
            src={visual.src}
            alt={visual.alt}
            fill
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 62vw"
            priority
          />
          <div className="absolute bottom-4 right-4 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-md">
            설치 형태 예시
          </div>
        </div>
      </div>
    </div>
  );
}
