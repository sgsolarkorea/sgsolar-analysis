import { analyzeSolarSite } from "@/lib/api/analysis";
import {
  KakaoAddressNotFoundError,
  getKakaoErrorMessage,
} from "@/lib/api/kakaoErrors";
import { buildConsultationContext } from "@/lib/consultation/context";
import { GRADE_MESSAGES } from "@/types/siteReview";
import ResultHero from "@/components/result/ResultHero";
import GradeSection from "@/components/result/GradeSection";
import BusinessTypeSection from "@/components/result/BusinessTypeSection";
import InstallTypeSelector from "@/components/result/InstallTypeSelector";
import CapacityAnalysisSection from "@/components/result/CapacityAnalysisSection";
import AnalysisProgressPanel from "@/components/result/AnalysisProgressPanel";
import MapArea from "@/components/result/MapArea";
import DetailInfoSection from "@/components/result/DetailInfoSection";
import GridConnectionSection from "@/components/result/GridConnectionSection";
import OrdinanceReview from "@/components/result/OrdinanceReview";
import SuitabilityReview from "@/components/result/SuitabilityReview";
import RevenueAnalysis from "@/components/result/RevenueAnalysis";
import MonthlyGenerationChart from "@/components/result/MonthlyGenerationChart";
import InstallProcess from "@/components/result/InstallProcess";
import SimilarCases from "@/components/result/SimilarCases";
import TrustSection from "@/components/result/TrustSection";
import ConsultationForm from "@/components/result/ConsultationForm";
import AddressSearchError from "@/components/result/AddressSearchError";
import SectionHeader from "@/components/ui/SectionHeader";
import { MetricCard } from "@/components/ui/InfoCard";
import { GRID_DISCLAIMER, REVENUE_DISCLAIMER, REVENUE_WARNING } from "@/data/sampleData";
import { disclaimer as solarDisclaimer } from "@/data/solarConfig";

interface ResultPageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function ResultPage({ searchParams }: ResultPageProps) {
  const params = await searchParams;

  let data;
  try {
    data = await analyzeSolarSite(params.address ?? "");
  } catch (error) {
    const detail =
      error instanceof KakaoAddressNotFoundError
        ? KakaoAddressNotFoundError.userHint
        : undefined;

    return (
      <AddressSearchError message={getKakaoErrorMessage(error)} detail={detail} />
    );
  }

  const consultationContext = buildConsultationContext(data);

  return (
    <div className="pb-28 md:pb-20">
      <ResultHero
        address={data.address}
        jibunAddress={data.jibunAddress}
        lat={data.lat}
        lng={data.lng}
        buildingName={data.buildingName}
        zoneNo={data.zoneNo}
        analyzedAt={data.analyzedAt}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="lg:flex lg:gap-8 lg:py-6">
          <AnalysisProgressPanel />

          <div className="min-w-0 flex-1 space-y-10 sm:space-y-12">
            <GradeSection
              grade={data.grade}
              gradeMessage={GRADE_MESSAGES[data.grade]}
              capacity={data.capacity}
              annualGeneration={data.annualGeneration}
              annualRevenue={data.annualRevenue}
              constructionCost={data.constructionCost}
            />

            <InstallTypeSelector
              apiRecommendation={data.recommendation}
              landInfo={data.landInfo}
              buildingInfo={data.buildingInfo}
              initialMetrics={data.solarMetrics}
            />

            <CapacityAnalysisSection metrics={data.solarMetrics} />

            <BusinessTypeSection
              options={data.businessTypeOptions}
              recommendation={data.recommendedBusinessTypes}
            />

            <section>
              <SectionHeader title="입지 위치" description="카카오 API로 확인한 검토 대상 위치입니다." />
              <MapArea
                address={data.address}
                jibunAddress={data.jibunAddress}
                lat={data.lat}
                lng={data.lng}
              />
            </section>

            <section>
              <SectionHeader title="입지 분석 개요" />
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="추천 유형" value={data.recommendation} highlight />
                <MetricCard label="예상 시공비" value={data.constructionCost} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                ⚠ {solarDisclaimer.construction}
              </p>
            </section>

            <DetailInfoSection id="land-info" title="토지 정보" fields={data.landInfo} />
            <DetailInfoSection id="building-info" title="건축물 정보" fields={data.buildingInfo} />
            <GridConnectionSection gridInfo={data.gridInfo} disclaimer={GRID_DISCLAIMER} />
            <SuitabilityReview items={data.suitability} />
            <OrdinanceReview items={data.ordinanceInfo} />
            <RevenueAnalysis
              profitability={data.profitability}
              disclaimer={REVENUE_DISCLAIMER}
              revenueWarning={REVENUE_WARNING}
            />
            <MonthlyGenerationChart data={data.monthlyGeneration} />
            <InstallProcess />
            <SimilarCases cases={data.recommendedCases} />
            <TrustSection />
            <ConsultationForm
              defaultAddress={data.consultationDefaultAddress}
              analysisContext={consultationContext}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
