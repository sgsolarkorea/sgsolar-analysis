"use client";

import type { MonthlyGeneration } from "@/types/siteReview";
import { yearlyGenerationPerKw } from "@/data/solarConfig";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Generation</p>
          <h2 id="generation-heading" className="mt-2 text-[28px] font-extrabold text-navy sm:text-[32px]">
            예상 발전량
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
            지역 일사량 기준 연간·월별 예상 발전량입니다.
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">자체 산정</span>
      </div>

      <div className="mt-8 grid gap-8 border-b border-slate-200 pb-8 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-sm text-slate-500">연간 예상 발전량</p>
          <p className="mt-2 text-[40px] font-extrabold tracking-tight text-navy sm:text-[48px]">
            {annualKwh.toLocaleString("ko-KR")}
            <span className="ml-1 text-lg font-semibold text-slate-500">kWh/년</span>
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-500">월평균</p>
          <p className="mt-2 text-[32px] font-extrabold text-navy">
            {monthlyAvg.toLocaleString("ko-KR")}
            <span className="ml-1 text-base font-semibold text-slate-500">kWh</span>
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-500">최대 발전 예상월</p>
          <p className="mt-2 text-[32px] font-extrabold text-sky-700">{peak?.month || "—"}</p>
          <p className="mt-1 text-sm text-slate-500">
            {peak ? `${peak.kwh.toLocaleString("ko-KR")} kWh` : ""}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-bold text-slate-900">월별 예상 발전량</h3>
          <p className="text-sm text-slate-500">단위: kWh</p>
        </div>
        <div
          className="grid grid-cols-12 gap-1.5 sm:gap-2"
          role="img"
          aria-label={`월별 예상 발전량 차트. 연간 ${annualKwh.toLocaleString("ko-KR")} kWh`}
        >
          {data.map((d) => {
            const height = Math.max(10, Math.round((d.kwh / maxKwh) * 168));
            const isPeak = d.month === peak?.month;
            return (
              <div
                key={d.month}
                className="group flex min-w-0 flex-col items-center gap-1.5"
                title={`${d.month}: ${d.kwh.toLocaleString("ko-KR")} kWh`}
              >
                <span className="invisible text-[11px] font-semibold text-slate-700 group-hover:visible sm:visible">
                  {d.kwh >= 1000 ? `${(d.kwh / 1000).toFixed(1)}k` : d.kwh}
                </span>
                <div className="flex h-[168px] w-full items-end">
                  <div
                    className={`w-full rounded-t ${isPeak ? "bg-sky-500" : "bg-navy"}`}
                    style={{ height, transition: "height 250ms ease" }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-500">{d.month.replace("월", "")}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-500">
          예상 발전량은 1kW당 연간 {yearlyGenerationPerKw.toLocaleString("ko-KR")} kWh 기준입니다.
          {capacityKw > 0
            ? ` (${capacityKw.toLocaleString("ko-KR")} kW × ${yearlyGenerationPerKw.toLocaleString("ko-KR")} ≈ ${annualKwh.toLocaleString("ko-KR")} kWh/년)`
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
