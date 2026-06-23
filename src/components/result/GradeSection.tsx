import { REVENUE_WARNING } from "@/data/sampleData";
import { KpiCard } from "@/components/ui/InfoCard";

interface GradeSectionProps {
  capacity: string;
  annualGeneration: string;
  annualRevenue: string;
  constructionCost: string;
  recommendation: string;
  recWeight: string;
  isHousehold?: boolean;
  thirdKpiLabel?: string;
  thirdKpiValue?: string;
}

export default function GradeSection({
  capacity,
  annualGeneration,
  annualRevenue,
  constructionCost,
  recommendation,
  recWeight,
  isHousehold = false,
  thirdKpiLabel,
  thirdKpiValue,
}: GradeSectionProps) {
  const thirdLabel = thirdKpiLabel ?? (isHousehold ? "월 예상 절감액" : "예상 연매출");
  const thirdValue = thirdKpiValue ?? annualRevenue;

  return (
    <section className="-mt-2 sm:-mt-3">
      <div className="card-premium overflow-hidden ring-1 ring-navy/10">
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-5">
          <KpiCard label="예상 설치용량" value={capacity} emphasis />
          <KpiCard label="예상 발전량" value={annualGeneration} emphasis />
          <KpiCard label={thirdLabel} value={thirdValue} emphasis />
          <KpiCard label="예상 시공비" value={constructionCost} emphasis />
          <KpiCard label="REC 가중치" value={recWeight} emphasis />
          <div className="col-span-2 flex flex-col items-center justify-center bg-white px-2.5 py-2 text-center sm:col-span-5 sm:flex-row sm:gap-2 sm:py-2">
            <span className="text-[10px] font-semibold text-slate-500 sm:text-[11px]">추천유형</span>
            <span className="mt-px text-[11px] font-semibold leading-snug text-slate-900 sm:mt-0 sm:text-xs">
              {recommendation}
            </span>
          </div>
        </div>

        {!isHousehold && (
          <div className="border-t border-amber-200 bg-amber-50 px-2.5 py-1.5 sm:px-3">
            <p className="text-[11px] font-medium leading-snug text-amber-900 sm:text-xs">
              ⚠ {REVENUE_WARNING}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
