import { REVENUE_WARNING } from "@/data/sampleData";
import { PremiumOverviewKpiCard } from "@/components/ui/InfoCard";

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

function CapacityIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function GenerationIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CostIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function RecIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
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
    <section>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PremiumOverviewKpiCard label="예상 설치용량" value={capacity} icon={<CapacityIcon />} />
        <PremiumOverviewKpiCard label="예상 발전량" value={annualGeneration} icon={<GenerationIcon />} />
        <PremiumOverviewKpiCard label={thirdLabel} value={thirdValue} icon={<RevenueIcon />} />
        <PremiumOverviewKpiCard label="예상 시공비" value={constructionCost} icon={<CostIcon />} />
        <PremiumOverviewKpiCard label="REC 가중치" value={recWeight} icon={<RecIcon />} />
      </div>

      <div className="mt-4 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50 px-4 py-3 text-center sm:px-5">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-[#0B1F3A]">추천유형</span>{" "}
          <span className="font-bold text-slate-900">{recommendation}</span>
        </p>
      </div>

      {!isHousehold && (
        <div className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 sm:px-5">
          <p className="text-xs font-medium leading-relaxed text-amber-900 sm:text-sm">
            ⚠ {REVENUE_WARNING}
          </p>
        </div>
      )}
    </section>
  );
}
