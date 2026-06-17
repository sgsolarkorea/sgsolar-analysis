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
    <section className="-mt-3 sm:-mt-4">
      <div className="card-premium overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-3">
          <KpiCard label="예상 설치용량" value={capacity} />
          <KpiCard label="예상 발전량" value={annualGeneration} />
          <KpiCard label={thirdLabel} value={thirdValue} />
          <KpiCard label="예상 시공비" value={constructionCost} />
          <KpiCard label="추천유형" value={recommendation} />
          <KpiCard label="REC 가중치" value={recWeight} />
        </div>

        {!isHousehold && (
          <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 sm:px-6">
            <p className="text-sm font-medium leading-relaxed text-amber-900">⚠ {REVENUE_WARNING}</p>
          </div>
        )}
      </div>
    </section>
  );
}
