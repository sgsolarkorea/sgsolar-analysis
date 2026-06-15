import type { MonthlyGeneration } from "@/types/siteReview";
import SectionHeader from "@/components/ui/SectionHeader";

interface MonthlyGenerationChartProps {
  data: MonthlyGeneration[];
  annualTotalKwh?: number;
}

function formatMonthKwh(kwh: number): string {
  if (kwh >= 1000) {
    return `${(kwh / 1000).toFixed(1)}k`;
  }
  return String(kwh);
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
      <div className="card-premium overflow-hidden p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-4">
          <p className="text-sm text-slate-600">연간 예상 발전량</p>
          <p className="text-lg font-bold text-navy">
            {annualKwh.toLocaleString("ko-KR")} kWh/년
          </p>
        </div>

        <div className="min-w-0 overflow-hidden">
          <div className="grid grid-cols-12 gap-0.5 sm:gap-1">
            {data.map((d) => (
              <div
                key={d.month}
                className="flex min-w-0 flex-col items-center gap-1 sm:gap-2"
                title={`${d.month}: ${d.kwh.toLocaleString("ko-KR")} kWh`}
              >
                <span className="hidden w-full truncate text-center text-[10px] font-semibold text-slate-800 sm:block sm:text-xs">
                  {d.kwh.toLocaleString("ko-KR")}
                </span>
                <span className="w-full truncate text-center text-[9px] font-medium text-slate-700 sm:hidden">
                  {formatMonthKwh(d.kwh)}
                </span>
                <div className="flex h-[100px] w-full items-end sm:h-[130px]">
                  <div
                    className="w-full min-w-0 rounded-t bg-navy"
                    style={{
                      height: `${Math.max((d.kwh / maxKwh) * 100, 8)}%`,
                    }}
                  />
                </div>
                <span className="w-full truncate text-center text-[9px] text-slate-600 sm:text-xs">
                  {d.month.replace("월", "")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 break-words text-xs leading-relaxed text-slate-500">
          단위: kWh · 막대 위 숫자는 월별 예상 발전량 · 월별 합계{" "}
          {computedTotal.toLocaleString("ko-KR")} kWh = 연간{" "}
          {annualKwh.toLocaleString("ko-KR")} kWh
        </p>
      </div>
    </section>
  );
}
