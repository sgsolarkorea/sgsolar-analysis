import { REVENUE_WARNING } from "@/data/sampleData";
import { KpiCard } from "@/components/ui/InfoCard";
import { formatHouseholdMonthlySavings } from "@/lib/solar/householdSavings";

interface GradeSectionProps {
  capacity: string;
  annualGeneration: string;
  annualRevenue: string;
  constructionCost: string;
  isHousehold?: boolean;
  capacityKw?: number;
}

export default function GradeSection({
  capacity,
  annualGeneration,
  annualRevenue,
  constructionCost,
  isHousehold = false,
  capacityKw = 0,
}: GradeSectionProps) {
  const thirdKpi = isHousehold
    ? { label: "월 예상 절감액", value: formatHouseholdMonthlySavings(capacityKw) }
    : { label: "예상 연매출", value: annualRevenue };

  return (
    <section className="-mt-3 sm:-mt-4">
      <div className="card-premium overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-4 sm:divide-y-0">
          <KpiCard label="예상 설치용량" value={capacity} />
          <KpiCard label="예상 발전량" value={annualGeneration} />
          <KpiCard label={thirdKpi.label} value={thirdKpi.value} />
          <KpiCard label="예상 시공비" value={constructionCost} />
        </div>

        {!isHousehold && (
          <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 sm:px-6">
            <p className="text-xs leading-relaxed text-amber-900 sm:text-sm">⚠ {REVENUE_WARNING}</p>
          </div>
        )}
      </div>
    </section>
  );
}
