"use client";

import { useResultMetrics } from "@/components/result/ResultMetricsProvider";

export default function InstallationSizeSection() {
  const { metrics, capacity, installType } = useResultMetrics();

  const usable =
    metrics.usableAreaSqm ?? metrics.roofUsableAreaSqm ?? metrics.baseAreaSqm;
  const areaLabel = metrics.baseAreaLabel || "분석 면적";

  return (
    <section id="installation-size" className="scroll-mt-28" aria-labelledby="installation-size-heading">
      <h2 id="installation-size-heading" className="text-[26px] font-extrabold tracking-tight text-navy sm:text-[28px]">
        예상 설치 규모
      </h2>
      <p className="mt-2 text-[15px] text-slate-600">이 부지에 어느 정도 규모의 태양광이 가능한지 한눈에 확인합니다.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <p className="text-sm font-medium text-slate-500">예상 설치용량</p>
          <p className="mt-3 text-[40px] font-extrabold leading-none tracking-tight text-navy sm:text-[42px]">
            {capacity || "산정 불가"}
          </p>
          <p className="mt-3 text-sm text-slate-500">1차 산정 기준 · 현장 조건에 따라 달라질 수 있습니다.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">예상 모듈 수</p>
            <p className="mt-2 text-[22px] font-bold text-navy">
              {metrics.moduleCount > 0 ? `${metrics.moduleCount.toLocaleString("ko-KR")}장` : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">설치 형태</p>
            <p className="mt-2 text-[18px] font-bold leading-snug text-navy">{installType || "—"}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">{areaLabel}</p>
            <p className="mt-2 text-[22px] font-bold text-navy">
              {metrics.baseAreaSqm > 0
                ? `${Math.round(metrics.baseAreaSqm).toLocaleString("ko-KR")}㎡`
                : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">활용 가능 면적</p>
            <p className="mt-2 text-[22px] font-bold text-navy">
              {usable != null && usable > 0 ? `${Math.round(usable).toLocaleString("ko-KR")}㎡` : "—"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
