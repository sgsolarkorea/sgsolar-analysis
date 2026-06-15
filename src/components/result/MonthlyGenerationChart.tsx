import type { MonthlyGeneration } from "@/types/siteReview";
import SectionHeader from "@/components/ui/SectionHeader";

interface MonthlyGenerationChartProps {
  data: MonthlyGeneration[];
}

export default function MonthlyGenerationChart({ data }: MonthlyGenerationChartProps) {
  const maxKwh = Math.max(...data.map((d) => d.kwh));

  return (
    <section>
      <SectionHeader
        title="월별 예상 발전량"
        description="계절별 일사량 변동을 반영한 월별 발전량 예측입니다."
      />
      <div className="card-premium p-5 sm:p-6">
        <div className="flex items-end justify-between gap-1 sm:gap-2">
          {data.map((d) => (
            <div key={d.month} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-800 sm:text-xs">
                {(d.kwh / 1000).toFixed(1)}
              </span>
              <div
                className="w-full rounded-t bg-navy"
                style={{ height: `${Math.max((d.kwh / maxKwh) * 130, 10)}px` }}
                title={`${d.month}: ${d.kwh.toLocaleString()} kWh`}
              />
              <span className="text-[10px] text-slate-600 sm:text-xs">
                {d.month.replace("월", "")}월
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">단위: MWh · 1차 검토 기준</p>
      </div>
    </section>
  );
}
