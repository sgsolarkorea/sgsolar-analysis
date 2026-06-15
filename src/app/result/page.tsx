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
            {/* 2. 입지 위치 */}
            <section id="site-location" className="scroll-mt-24">
              <SectionHeader title="입지 위치" description="카카오 API로 확인한 검토 대상 위치입니다." />
              <MapArea
                address={data.address}
                jibunAddress={data.jibunAddress}
                lat={data.lat}
                lng={data.lng}
              />
            </section>

            {/* 3. 입지 분석 개요 */}
            <section id="site-overview" className="scroll-mt-24">
              <SectionHeader title="입지 분석 개요" />
              <GradeSection
                grade={data.grade}
                gradeMessage={GRADE_MESSAGES[data.grade]}
                capacity={data.capacity}
                annualGeneration={data.annualGeneration}
                annualRevenue={data.annualRevenue}
                constructionCost={data.constructionCost}
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <MetricCard label="추천 유형" value={data.recommendation} highlight />
                <MetricCard label="예상 시공비" value={data.constructionCost} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                ⚠ {solarDisclaimer.construction}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                ⚠ {solarDisclaimer.constructionExtra}
              </p>
            </section>

            {/* 4. 토지 정보 */}
            <DetailInfoSection id="land-info" title="토지 정보" fields={data.landInfo} />

            {/* 5. 건축물 정보 */}
            <DetailInfoSection id="building-info" title="건축물 정보" fields={data.buildingInfo} />

            <InstallTypeSelector
              apiRecommendation={data.recommendation}
              landInfo={data.landInfo}
              buildingInfo={data.buildingInfo}
              initialMetrics={data.solarMetrics}
            />

            {/* 6. 설치용량 분석 */}
            <CapacityAnalysisSection metrics={data.solarMetrics} />

            {/* 7. 예상 발전량 */}
            <MonthlyGenerationChart
              data={data.monthlyGeneration}
              annualTotalKwh={data.solarMetrics.annualGenerationKwh}
            />

            {/* 8. 수익성 분석 */}
            <RevenueAnalysis
              profitability={data.profitability}
              disclaimer={REVENUE_DISCLAIMER}
              revenueWarning={REVENUE_WARNING}
            />

            {/* 9. 계통 연계 */}
            <GridConnectionSection gridInfo={data.gridInfo} disclaimer={GRID_DISCLAIMER} />

            <BusinessTypeSection
              options={data.businessTypeOptions}
              recommendation={data.recommendedBusinessTypes}
            />
            <SuitabilityReview items={data.suitability} />
            <OrdinanceReview items={data.ordinanceInfo} />
            <InstallProcess />

            {/* 10. 유사 시공사례 */}
            <SimilarCases cases={data.recommendedCases} />

            <TrustSection />

            {/* 11. 상담 신청 */}
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
