import { REVENUE_WARNING } from "@/data/sampleData";
import { KpiCard } from "@/components/ui/InfoCard";

interface GradeSectionProps {
  capacity: string;
  annualGeneration: string;
  annualRevenue: string;
  constructionCost: string;
}

export default function GradeSection({
  capacity,
  annualGeneration,
  annualRevenue,
  constructionCost,
}: GradeSectionProps) {
  return (
    <section className="-mt-3 sm:-mt-4">
      <div className="card-premium overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-4 sm:divide-y-0">
          <KpiCard label="예상 설치용량" value={capacity} />
          <KpiCard label="예상 발전량" value={annualGeneration} />
          <KpiCard label="예상 연매출" value={annualRevenue} />
          <KpiCard label="예상 시공비" value={constructionCost} />
        </div>

        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 sm:px-6">
          <p className="text-xs leading-relaxed text-amber-900 sm:text-sm">⚠ {REVENUE_WARNING}</p>
        </div>
      </div>
    </section>
  );
}
