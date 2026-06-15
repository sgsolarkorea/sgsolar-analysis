import type { Grade } from "@/types/siteReview";
import { REVENUE_WARNING } from "@/data/sampleData";
import GradeBadge from "@/components/ui/GradeBadge";
import { KpiCard } from "@/components/ui/InfoCard";

interface GradeSectionProps {
  grade: Grade;
  gradeMessage: string;
  capacity: string;
  annualGeneration: string;
  annualRevenue: string;
  constructionCost: string;
}

export default function GradeSection({
  grade,
  gradeMessage,
  capacity,
  annualGeneration,
  annualRevenue,
  constructionCost,
}: GradeSectionProps) {
  return (
    <section className="-mt-3 sm:-mt-4">
      <div className="card-premium overflow-hidden">
        <div className="flex items-start gap-4 p-5 sm:p-6">
          <GradeBadge grade={grade} size="xl" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              종합등급
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{grade}등급</p>
            <p className="mt-2 text-sm font-medium text-slate-800">{gradeMessage}</p>
            <p className="mt-1 text-xs text-slate-500">
              ※ 본 등급은 1차 검토 결과이며, 설치 확정을 의미하지 않습니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 border-t border-slate-200 sm:grid-cols-4 sm:divide-y-0">
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
