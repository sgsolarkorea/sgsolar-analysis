"use client";

import { GRADE_MESSAGES } from "@/types/siteReview";
import GradeSection from "@/components/result/GradeSection";
import InstallTypeSelector from "@/components/result/InstallTypeSelector";
import CapacityAnalysisSection from "@/components/result/CapacityAnalysisSection";
import RevenueAnalysis from "@/components/result/RevenueAnalysis";
import MonthlyGenerationChart from "@/components/result/MonthlyGenerationChart";
import ConsultationForm from "@/components/result/ConsultationForm";
import PdfDownloadButton from "@/components/result/PdfDownloadButton";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import SectionHeader from "@/components/ui/SectionHeader";
import { MetricCard } from "@/components/ui/InfoCard";
import { REVENUE_DISCLAIMER, REVENUE_WARNING } from "@/data/sampleData";
import { disclaimer as solarDisclaimer } from "@/data/solarConfig";
import { deriveGradeFromCapacity } from "@/lib/solar/grade";

interface ResultSiteOverviewProps {
  recommendation: string;
  address: string;
}

export function ResultSiteOverview({ recommendation, address }: ResultSiteOverviewProps) {
  const { capacity, annualGeneration, annualRevenue, constructionCost, metrics } =
    useResultMetrics();
  const grade = deriveGradeFromCapacity(metrics.capacityKw);

  return (
    <section id="site-overview" className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <PdfDownloadButton address={address} />
      </div>
      <SectionHeader title="입지 분석 개요" />
      <GradeSection
        grade={grade}
        gradeMessage={GRADE_MESSAGES[grade]}
        capacity={capacity}
        annualGeneration={annualGeneration}
        annualRevenue={annualRevenue}
        constructionCost={constructionCost}
      />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <MetricCard label="추천 유형" value={recommendation} highlight />
        <MetricCard label="예상 시공비" value={constructionCost} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        ⚠ {solarDisclaimer.construction}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        ⚠ {solarDisclaimer.constructionExtra}
      </p>
    </section>
  );
}

interface ResultCapacitySectionProps {
  recommendation: string;
}

export function ResultCapacitySection({ recommendation }: ResultCapacitySectionProps) {
  const { metrics } = useResultMetrics();

  return (
    <section id="capacity-analysis" className="scroll-mt-24 space-y-8">
      <InstallTypeSelector apiRecommendation={recommendation} />
      <CapacityAnalysisSection metrics={metrics} embedded />
    </section>
  );
}

export function ResultGenerationSection() {
  const { monthlyGeneration, metrics } = useResultMetrics();

  return (
    <MonthlyGenerationChart
      data={monthlyGeneration}
      annualTotalKwh={metrics.annualGenerationKwh}
      capacityKw={metrics.capacityKw}
    />
  );
}

export function ResultRevenueSection() {
  const { profitability } = useResultMetrics();

  return (
    <RevenueAnalysis
      profitability={profitability}
      disclaimer={REVENUE_DISCLAIMER}
      revenueWarning={REVENUE_WARNING}
    />
  );
}

export function ResultConsultationSection({
  defaultAddress,
  searchHistoryId,
}: {
  defaultAddress: string;
  searchHistoryId?: string;
}) {
  const { consultationContext } = useResultMetrics();

  return (
    <ConsultationForm
      defaultAddress={defaultAddress}
      analysisContext={consultationContext}
      searchHistoryId={searchHistoryId}
    />
  );
}
