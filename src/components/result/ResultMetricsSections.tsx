"use client";

import GradeSection from "@/components/result/GradeSection";
import InstallTypeSelector from "@/components/result/InstallTypeSelector";
import CapacityAnalysisSection from "@/components/result/CapacityAnalysisSection";
import RevenueAnalysis from "@/components/result/RevenueAnalysis";
import HouseholdSavingsAnalysis from "@/components/result/HouseholdSavingsAnalysis";
import MonthlyGenerationChart from "@/components/result/MonthlyGenerationChart";
import SaveResultCTA from "@/components/result/SaveResultCTA";
import ConsultationForm from "@/components/result/ConsultationForm";
import PdfDownloadButton from "@/components/result/PdfDownloadButton";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import SectionHeader from "@/components/ui/SectionHeader";
import { disclaimer as solarDisclaimer } from "@/data/solarConfig";
import { isHouseholdInstallType } from "@/lib/solar/householdSavings";
import { formatRecWeightDisplay } from "@/lib/solar/formatRecWeight";
import { formatHouseholdMonthlySavings } from "@/lib/solar/householdSavings";

interface ResultSiteOverviewProps {
  recommendation: string;
  address: string;
}

export function ResultSiteOverview({ recommendation, address }: ResultSiteOverviewProps) {
  const { capacity, annualGeneration, annualRevenue, constructionCost, installType, metrics } =
    useResultMetrics();
  const isHousehold = isHouseholdInstallType(installType);
  const constructionExtra =
    installType === "토지형"
      ? solarDisclaimer.constructionLandExtra
      : solarDisclaimer.constructionBuildingExtra;

  return (
    <section id="site-overview" className="scroll-mt-24">
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
        <PdfDownloadButton address={address} />
      </div>
      <SectionHeader
        title="입지 분석 개요"
        description="추천 유형·설치용량·시공비 등 1차 입지검토 요약입니다."
        compact
      />
      <div className="mt-5 sm:mt-6">
        <GradeSection
        capacity={capacity}
        annualGeneration={annualGeneration}
        annualRevenue={annualRevenue}
        constructionCost={constructionCost}
        recommendation={recommendation}
        recWeight={formatRecWeightDisplay(metrics.recWeight)}
        isHousehold={isHousehold}
        thirdKpiLabel={isHousehold ? "월 예상 절감액" : undefined}
        thirdKpiValue={isHousehold ? formatHouseholdMonthlySavings(metrics.capacityKw) : undefined}
        />
      </div>
      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
        <p className="text-[11px] font-medium leading-snug text-slate-600 sm:text-xs">
          ⚠ {solarDisclaimer.construction}
        </p>
        <p className="mt-1 text-[11px] font-medium leading-snug text-slate-600 sm:text-xs">
          ※ {constructionExtra}
        </p>
      </div>
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

export function ResultRevenueSection({ showMountainRecNote = false }: { showMountainRecNote?: boolean }) {
  const { profitability, installType, metrics } = useResultMetrics();

  if (isHouseholdInstallType(installType)) {
    return <HouseholdSavingsAnalysis capacityKw={metrics.capacityKw} />;
  }

  return (
    <RevenueAnalysis profitability={profitability} showMountainRecNote={showMountainRecNote} />
  );
}

export function ResultSaveSection({ address }: { address: string }) {
  return <SaveResultCTA address={address} />;
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
