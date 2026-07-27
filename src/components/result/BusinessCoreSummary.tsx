"use client";

import { useResultMetrics } from "@/components/result/ResultMetricsProvider";

/**
 * Capacity-primary installation size — not equal KPI cards.
 */
export default function BusinessCoreSummary() {
  const { metrics, capacity, installType } = useResultMetrics();
  const usable = metrics.usableAreaSqm ?? metrics.roofUsableAreaSqm ?? metrics.baseAreaSqm;

  return (
    <section id="business-summary" className="scroll-mt-28" aria-labelledby="install-size-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Install Scale</p>
          <h2 id="install-size-heading" className="mt-2 text-[28px] font-extrabold tracking-tight text-navy sm:text-[32px]">
            예상 설치 규모
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
            이 부지에서 1차 검토 가능한 설치용량입니다. 발전량·수익은 아래 섹션에서 이어집니다.
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">자체 산정</span>
      </div>

      <div className="mt-10 border-b border-slate-200 pb-8">
        <p className="text-sm font-medium text-slate-500">예상 설치용량</p>
        <p className="mt-3 text-[44px] font-extrabold leading-none tracking-tight text-navy sm:text-[52px]">
          {capacity || "—"}
        </p>
        <p className="mt-3 text-[15px] font-semibold text-sky-800">{installType || "설치형태 확인 중"}</p>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
        <div>
          <dt className="text-sm text-slate-500">예상 모듈 수</dt>
          <dd className="mt-1 text-xl font-bold text-slate-900">
            {metrics.moduleCount > 0 ? `${metrics.moduleCount.toLocaleString("ko-KR")}장` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">활용 면적</dt>
          <dd className="mt-1 text-xl font-bold text-slate-900">
            {usable != null && usable > 0 ? `${Math.round(usable).toLocaleString("ko-KR")}㎡` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">분석 면적</dt>
          <dd className="mt-1 text-xl font-bold text-slate-900">
            {metrics.baseAreaSqm > 0 ? `${Math.round(metrics.baseAreaSqm).toLocaleString("ko-KR")}㎡` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">설치 형태</dt>
          <dd className="mt-1 text-xl font-bold text-slate-900">{installType || "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
