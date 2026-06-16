import { analyzeSolarSite } from "@/lib/api/analysis";
import {
  KakaoAddressNotFoundError,
  getKakaoErrorMessage,
} from "@/lib/api/kakaoErrors";
import ResultHero from "@/components/result/ResultHero";
import AnalysisProgressPanel from "@/components/result/AnalysisProgressPanel";
import MapArea from "@/components/result/MapArea";
import LandInfoCardSection from "@/components/result/LandInfoCardSection";
import RegionDistrictSection from "@/components/result/RegionDistrictSection";
import DetailInfoSection from "@/components/result/DetailInfoSection";
import GridConnectionSection from "@/components/result/GridConnectionSection";
import SetbackReviewSection from "@/components/result/SetbackReviewSection";
import LocalOrdinanceSection from "@/components/result/LocalOrdinanceSection";
import SimilarCases from "@/components/result/SimilarCases";
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
import { resolveProgressSteps, type InstallTypeOption } from "@/data/resultUx";
import { resolveRegulatoryReview } from "@/lib/regulatory/resolveRegulatoryReview";
import { resolveOrdinanceForAddress } from "@/lib/ordinanceLearning/registry";
import { recordSearchHistory } from "@/lib/searchHistory/record";
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
    landArea: getFieldValue(data.landInfo, "면적"),
    buildingArea: getFieldValue(data.buildingInfo, "건축면적"),
  };

  const progressSteps = resolveProgressSteps(data.landInfo, data.buildingInfo);
  const regulatory = resolveRegulatoryReview({
    address: data.address,
    installType: data.solarMetrics.installType,
  });
  const ordinanceResult = await resolveOrdinanceForAddress(data.address);

  const searchHistory = await recordSearchHistory(data, params.address ?? data.address);

  return (
    <div className="pb-28 md:pb-20">
      <ResultHero
        address={data.address}
        jibunAddress={data.jibunAddress}
        buildingName={data.buildingName}
        analyzedAt={data.analyzedAt}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="lg:flex lg:gap-8 lg:py-6">
          <AnalysisProgressPanel steps={progressSteps} />

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
              <section id="site-location" className="scroll-mt-24 mt-8 sm:mt-0">
                <SectionHeader
                  title="입지 위치"
                  description="입력하신 주소의 위치를 지도에서 확인할 수 있습니다."
                />
                <MapArea
                  address={data.address}
                  jibunAddress={data.jibunAddress}
                  lat={data.lat}
                  lng={data.lng}
                />
              </section>

              <ResultSiteOverview recommendation={data.recommendation} />

              <LandInfoCardSection detail={data.landInfoDetail} />
              <RegionDistrictSection analysis={data.regionDistrictAnalysis} />

              <DetailInfoSection
                id="building-info"
                title="건축물 정보"
                fields={data.buildingInfo}
              />

              <SetbackReviewSection review={regulatory.setbackReview} />
              <LocalOrdinanceSection review={ordinanceResult.data} meta={ordinanceResult.meta} />

              <ResultCapacitySection recommendation={data.recommendation} />
              <ResultGenerationSection />
              <ResultRevenueSection />

              <GridConnectionSection gridInfo={data.gridInfo} disclaimer={GRID_DISCLAIMER} />

              <SimilarCases cases={data.recommendedCases} />

              <ResultConsultationSection
                defaultAddress={data.consultationDefaultAddress}
                searchHistoryId={searchHistory.id}
              />
            </div>
          </ResultMetricsProvider>
        </div>
      </div>
    </div>
  );
}
