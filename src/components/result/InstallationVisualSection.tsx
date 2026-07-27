"use client";

import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { resolveInstallVisual } from "@/data/installationVisuals";

export default function InstallationVisualSection() {
  const { metrics, capacity, installType } = useResultMetrics();
  const visual = resolveInstallVisual(installType);
  const usable = metrics.usableAreaSqm ?? metrics.roofUsableAreaSqm;

  return (
    <section id="install-visual" className="scroll-mt-28" aria-labelledby="install-visual-heading">
      <h2 id="install-visual-heading" className="text-[26px] font-extrabold text-navy sm:text-[28px]">
        예상 설치 형태
      </h2>
      <p className="mt-2 text-[15px] text-slate-600">설치 유형에 따른 일반적인 모습을 참고용으로 보여드립니다.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid lg:grid-cols-[1.4fr_1fr]">
        <div className="relative aspect-[16/9] bg-slate-100 lg:aspect-auto lg:min-h-[320px]">
          {/* SVG assets: native img avoids next/image SVG config */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={visual.src}
            alt={visual.alt}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-xs font-bold text-navy">
            설치 형태 예시
          </span>
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <p className="text-sm font-medium text-slate-500">예상 설치 형태</p>
          <p className="mt-1 text-2xl font-extrabold text-navy">{visual.label}</p>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
              <dt className="text-slate-500">예상 용량</dt>
              <dd className="font-bold text-slate-900">{capacity || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
              <dt className="text-slate-500">예상 모듈 수</dt>
              <dd className="font-bold text-slate-900">
                {metrics.moduleCount > 0 ? `${metrics.moduleCount.toLocaleString("ko-KR")}장` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">활용면적</dt>
              <dd className="font-bold text-slate-900">
                {usable != null && usable > 0 ? `${Math.round(usable).toLocaleString("ko-KR")}㎡` : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            실제 배치와 설치규모는 지붕 구조, 음영, 안전거리 및 현장 조건에 따라 달라질 수 있습니다.
          </p>
        </div>
      </div>
    </section>
  );
}
