"use client";

import type { MonthlyGeneration } from "@/types/siteReview";
import { yearlyGenerationPerKw } from "@/data/solarConfig";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";

function Chart({
  data,
  annualKwh,
  capacityKw,
  embedded = false,
}: {
  data: MonthlyGeneration[];
  annualKwh: number;
  capacityKw: number;
  embedded?: boolean;
}) {
  const maxKwh = Math.max(...data.map((d) => d.kwh), 1);
  const peak = data.reduce((best, item) => (item.kwh > best.kwh ? item : best), data[0]);
  const monthlyAvg = Math.round(annualKwh / 12);
  const avgPct = Math.min(100, Math.max(0, (monthlyAvg / maxKwh) * 100));

  return (
    <div id="generation">
      {!embedded ? (
        <h2 className="text-[28px] font-extrabold text-navy sm:text-[32px]">예상 발전량</h2>
      ) : null}

      <div className="relative mt-4 bg-white px-3 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
        <div className="relative grid h-[280px] grid-cols-12 items-end gap-1.5 sm:h-[320px] sm:gap-2.5">
          <div
            className="pointer-events-none absolute inset-x-0 z-[1] border-t border-dashed border-sky-400/70"
            style={{ bottom: `${avgPct}%` }}
            aria-hidden
          />
          {data.map((d) => {
            const heightPct = Math.max(6, (d.kwh / maxKwh) * 100);
            const isPeak = d.month === peak?.month;
            return (
              <div
                key={d.month}
                className="group relative z-0 flex h-full min-w-0 flex-col justify-end"
                title={`${d.month}: ${d.kwh.toLocaleString("ko-KR")} kWh`}
              >
                <span className="absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-slate-600 group-hover:block">
                  {d.kwh.toLocaleString("ko-KR")}
                </span>
                <div
                  className={`w-full ${isPeak ? "bg-sky-500" : "bg-navy"}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-12 gap-1.5 sm:gap-2">
          {data.map((d) => (
            <span key={`lbl-${d.month}`} className="text-center text-[12px] font-medium text-slate-500">
              {d.month.replace("월", "")}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-end gap-x-12 gap-y-6 pt-2">
        <div>
          <p className="text-[13px] text-slate-500">예상 연간 발전량</p>
          <p className="mt-1 text-[48px] font-extrabold tracking-tight text-navy sm:text-[58px]">
            {annualKwh.toLocaleString("ko-KR")}
            <span className="ml-1 text-[16px] font-semibold text-slate-500">kWh</span>
          </p>
        </div>
        <div>
          <p className="text-[13px] text-slate-500">월평균</p>
          <p className="mt-1 text-[30px] font-extrabold text-navy">
            {monthlyAvg.toLocaleString("ko-KR")}
            <span className="ml-1 text-[14px] font-semibold text-slate-500">kWh</span>
          </p>
        </div>
        <div>
          <p className="text-[13px] text-slate-500">최대 발전 예상월</p>
          <p className="mt-1 text-[32px] font-extrabold text-sky-700">{peak?.month || "—"}</p>
        </div>
      </div>

      {peak?.month ? (
        <p className="mt-5 text-[15px] text-slate-600">예상 발전량은 {peak.month}에 가장 높습니다.</p>
      ) : null}
      <p className="mt-2 text-[13px] text-slate-500">
        월별 발전량은 기상조건 및 실제 설비조건에 따라 달라질 수 있습니다.
        {capacityKw > 0 ? ` (기준 ${yearlyGenerationPerKw.toLocaleString("ko-KR")} kWh/kW·년)` : ""}
      </p>
    </div>
  );
}

export default function GenerationSection({ embedded = false }: { embedded?: boolean }) {
  const { monthlyGeneration, metrics } = useResultMetrics();
  if (!monthlyGeneration?.length) return null;
  return (
    <Chart
      data={monthlyGeneration}
      annualKwh={metrics.annualGenerationKwh}
      capacityKw={metrics.capacityKw}
      embedded={embedded}
    />
  );
}
