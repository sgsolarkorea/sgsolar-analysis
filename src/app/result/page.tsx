import { analyzeSolarSite } from "@/lib/api/analysis";
import {
  KakaoAddressNotFoundError,
  getKakaoErrorMessage,
} from "@/lib/api/kakaoErrors";
import ResultHero from "@/components/result/ResultHero";
import AnalysisProgressPanel from "@/components/result/AnalysisProgressPanel";
import MapArea from "@/components/result/MapArea";
import DetailInfoSection from "@/components/result/DetailInfoSection";
import GridConnectionSection from "@/components/result/GridConnectionSection";
import OrdinanceReview from "@/components/result/OrdinanceReview";
import SuitabilityReview from "@/components/result/SuitabilityReview";
import BusinessTypeSection from "@/components/result/BusinessTypeSection";
import InstallProcess from "@/components/result/InstallProcess";
import SimilarCases from "@/components/result/SimilarCases";
import TrustSection from "@/components/result/TrustSection";
import AddressSearchError from "@/components/result/AddressSearchError";
import { ResultMetricsProvider } from "@/components/result/ResultMetricsProvider";
import {
  ResultCapacitySection,
  ResultConsultationSection,
  ResultGenerationSection,
  ResultRevenueSection,
  ResultSiteOverview,
} from "@/components/result/ResultMetricsSections";
import SectionHeader from "@/components/ui/SectionHeader";
import { GRID_DISCLAIMER } from "@/data/sampleData";
import type { InstallTypeOption } from "@/data/resultUx";
import { getFieldValue } from "@/lib/solar/calculate";

interface ResultPageProps {
  searchParams: Promise<{ address?: string }>;
}

export const dynamic = "force-dynamic";

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

  const consultationBase = {
    jibunAddress: data.jibunAddress,
    landCategory: getFieldValue(data.landInfo, "지목"),
    zoning: getFieldValue(data.landInfo, "용도지역"),
    buildingArea: getFieldValue(data.buildingInfo, "건축면적"),
  };

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

          <ResultMetricsProvider
            landInfo={data.landInfo}
            buildingInfo={data.buildingInfo}
            initialInstallType={data.solarMetrics.installType as InstallTypeOption}
            initialMetrics={data.solarMetrics}
            initialProfitability={data.profitability}
            initialMonthlyGeneration={data.monthlyGeneration}
            consultationBase={consultationBase}
          >
            <div className="min-w-0 flex-1 space-y-10 sm:space-y-12">
              <section id="site-location" className="scroll-mt-24">
                <SectionHeader
                  title="입지 위치"
                  description="카카오 API로 확인한 검토 대상 위치입니다."
                />
                <MapArea
                  address={data.address}
                  jibunAddress={data.jibunAddress}
                  lat={data.lat}
                  lng={data.lng}
                />
              </section>

              <ResultSiteOverview recommendation={data.recommendation} />

              <DetailInfoSection id="land-info" title="토지 정보" fields={data.landInfo} />
              <DetailInfoSection id="building-info" title="건축물 정보" fields={data.buildingInfo} />

              <ResultCapacitySection recommendation={data.recommendation} />
              <ResultGenerationSection />
              <ResultRevenueSection />

              <GridConnectionSection gridInfo={data.gridInfo} disclaimer={GRID_DISCLAIMER} />

              <BusinessTypeSection
                options={data.businessTypeOptions}
                recommendation={data.recommendedBusinessTypes}
              />
              <SuitabilityReview items={data.suitability} />
              <OrdinanceReview items={data.ordinanceInfo} />
              <InstallProcess />

              <SimilarCases cases={data.recommendedCases} />
              <TrustSection />
              <ResultConsultationSection defaultAddress={data.consultationDefaultAddress} />
            </div>
          </ResultMetricsProvider>
        </div>
      </div>
    </div>
  );
}
