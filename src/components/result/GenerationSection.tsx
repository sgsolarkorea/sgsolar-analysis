"use client";

import type { MonthlyGeneration } from "@/types/siteReview";
import { yearlyGenerationPerKw } from "@/data/solarConfig";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";

function formatMonthKwh(kwh: number): string {
  if (kwh >= 1000) return `${(kwh / 1000).toFixed(1)}k`;
  return String(kwh);
}

function Chart({
  data,
  annualKwh,
  capacityKw,
}: {
  data: MonthlyGeneration[];
  annualKwh: number;
  capacityKw: number;
}) {
  const maxKwh = Math.max(...data.map((d) => d.kwh), 1);
  const peak = data.reduce((best, item) => (item.kwh > best.kwh ? item : best), data[0]);
  const monthlyAvg = Math.round(annualKwh / 12);

  return (
    <section id="generation" className="scroll-mt-28" aria-labelledby="generation-heading">
      <h2 id="generation-heading" className="text-[26px] font-extrabold text-navy sm:text-[28px]">
        예상 발전량
      </h2>
      <p className="mt-2 text-[15px] text-slate-600">지역 일사량 기준 연간·월별 예상 발전량입니다.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">연간 예상 발전량</p>
          <p className="mt-2 text-[36px] font-extrabold tracking-tight text-navy">
            {annualKwh.toLocaleString("ko-KR")}
            <span className="ml-1 text-lg font-semibold text-slate-500">kWh/년</span>
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-6">
          <p className="text-sm text-slate-500">월평균</p>
          <p className="mt-2 text-[32px] font-extrabold text-navy">
            {monthlyAvg.toLocaleString("ko-KR")}
            <span className="ml-1 text-lg font-semibold text-slate-500">kWh</span>
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900">월별 예상 발전량</h3>
          <p className="text-xs text-slate-500">단위: kWh</p>
        </div>
        <div
          className="grid grid-cols-12 gap-1 sm:gap-1.5"
          role="img"
          aria-label={`월별 예상 발전량 차트. 연간 ${annualKwh.toLocaleString("ko-KR")} kWh`}
        >
          {data.map((d) => {
            const height = Math.max(8, Math.round((d.kwh / maxKwh) * 140));
            const isPeak = d.month === peak?.month;
            return (
              <div key={d.month} className="flex min-w-0 flex-col items-center gap-1" title={`${d.month}: ${d.kwh.toLocaleString("ko-KR")} kWh`}>
                <span className="hidden text-[10px] font-semibold text-slate-700 sm:block">
                  {formatMonthKwh(d.kwh)}
                </span>
                <div className="flex h-[140px] w-full items-end">
                  <div
                    className={`w-full rounded-t-md ${isPeak ? "bg-sky-500" : "bg-navy"}`}
                    style={{ height }}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-500 sm:text-xs">{d.month.replace("월", "")}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          예상 발전량은 1kW당 연간 {yearlyGenerationPerKw.toLocaleString("ko-KR")} kWh 기준입니다.
          {capacityKw > 0
            ? ` (예: ${capacityKw.toLocaleString("ko-KR")} kW × ${yearlyGenerationPerKw.toLocaleString("ko-KR")} ≈ ${annualKwh.toLocaleString("ko-KR")} kWh/년)`
            : ""}
        </p>
      </div>
    </section>
  );
}

export default function GenerationSection() {
  const { monthlyGeneration, metrics } = useResultMetrics();
  if (!monthlyGeneration?.length) return null;
  return (
    <Chart
      data={monthlyGeneration}
      annualKwh={metrics.annualGenerationKwh}
      capacityKw={metrics.capacityKw}
    />
  );
}
