import type { MonthlyGeneration } from "@/types/siteReview";
import SectionHeader from "@/components/ui/SectionHeader";

interface MonthlyGenerationChartProps {
  data: MonthlyGeneration[];
  annualTotalKwh?: number;
}

export default function MonthlyGenerationChart({
  data,
  annualTotalKwh,
}: MonthlyGenerationChartProps) {
  const maxKwh = Math.max(...data.map((d) => d.kwh), 1);
  const computedTotal = data.reduce((sum, item) => sum + item.kwh, 0);
  const annualKwh = annualTotalKwh ?? computedTotal;

  return (
    <section id="generation" className="scroll-mt-24">
      <SectionHeader
        title="예상 발전량"
        description="계절별 일사량 변동을 반영한 월별·연간 발전량 예측입니다."
      />
      <div className="card-premium p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-4">
          <p className="text-sm text-slate-600">연간 예상 발전량</p>
          <p className="text-lg font-bold text-navy">
            {annualKwh.toLocaleString("ko-KR")} kWh/년
          </p>
        </div>

        <div className="flex items-end justify-between gap-1 sm:gap-2">
          {data.map((d) => (
            <div key={d.month} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-semibold leading-tight text-slate-800 sm:text-xs">
                {d.kwh.toLocaleString("ko-KR")}
              </span>
              <div
                className="w-full rounded-t bg-navy"
                style={{ height: `${Math.max((d.kwh / maxKwh) * 130, 10)}px` }}
                title={`${d.month}: ${d.kwh.toLocaleString("ko-KR")} kWh`}
              />
              <span className="text-[10px] text-slate-600 sm:text-xs">
                {d.month.replace("월", "")}월
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          단위: kWh · 막대 위 숫자는 월별 예상 발전량 · 월별 합계{" "}
          {computedTotal.toLocaleString("ko-KR")} kWh = 연간{" "}
          {annualKwh.toLocaleString("ko-KR")} kWh
        </p>
      </div>
    </section>
  );
}
