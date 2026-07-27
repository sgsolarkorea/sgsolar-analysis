import { Suspense } from "react";
import {
  ResultCapacitySection,
  ResultConsultationSection,
  ResultSaveSection,
  ResultSimilarCasesSection,
} from "@/components/result/ResultMetricsSections";
import ResultPdfCtaPanel from "@/components/result/ResultPdfCtaPanel";
import MobileResultActions from "@/components/result/MobileResultActions";
import SectionHeader from "@/components/ui/SectionHeader";
import { GRID_DISCLAIMER } from "@/data/sampleData";
import { type InstallTypeOption } from "@/data/resultUx";
import { resolveOrdinanceForAddress } from "@/lib/ordinanceLearning/registry";
import { resolveOrdinanceDisplay } from "@/lib/regulatory/resolveOrdinanceDisplay";
import { resolveOrdinanceInfoList } from "@/lib/regulatory/resolveOrdinanceInfoList";
import { recordSearchHistory } from "@/lib/searchHistory/record";
import { getFieldValue } from "@/lib/solar/calculate";
import { primaryParcelFromReview } from "@/lib/api/parcelLookup";
import MountainLandWarningBanner from "@/components/result/MountainLandWarningBanner";
import MultiParcelSection from "@/components/result/MultiParcelSection";
import { isMountainOrForestSite } from "@/lib/site/mountainLand";
import SetbackReviewSection from "@/components/result/SetbackReviewSection";
import LocalOrdinanceSection from "@/components/result/LocalOrdinanceSection";
import GridConnectionSection from "@/components/result/GridConnectionSection";
import DetailInfoSection from "@/components/result/DetailInfoSection";
import RegulatoryAnalysisSection from "@/components/result/RegulatoryAnalysisSection";
import RegionDistrictSection from "@/components/result/RegionDistrictSection";
import LandInfoCardSection from "@/components/result/LandInfoCardSection";
import MapArea from "@/components/result/MapArea";
import ResultHero from "@/components/result/ResultHero";
import ResultStickyNav from "@/components/result/ResultStickyNav";
import InstallationSizeSection from "@/components/result/InstallationSizeSection";
import GridGatePanel from "@/components/result/GridGatePanel";
import GenerationSection from "@/components/result/GenerationSection";
import MarketRevenueSection from "@/components/result/MarketRevenueSection";
import InstallationVisualSection from "@/components/result/InstallationVisualSection";
import RequiredChecks from "@/components/result/RequiredChecks";
import BusinessRoadmapSection from "@/components/result/BusinessRoadmapSection";
import SgSolarSupportSection from "@/components/result/SgSolarSupportSection";
import DetailAnalysisAccordion from "@/components/result/DetailAnalysisAccordion";
import AddressSearchError from "@/components/result/AddressSearchError";
import { ResultMetricsProvider } from "@/components/result/ResultMetricsProvider";
import { getCachedAnalyzeSolarSite } from "@/lib/api/analysis";
import {
  KakaoAddressNotFoundError,
  getKakaoErrorMessage,
} from "@/lib/api/kakaoErrors";
import { buildReviewStatusItems } from "@/lib/result/buildReviewSummary";

interface ResultPageProps {
  searchParams: Promise<{ address?: string }>;
}

export const dynamic = "force-dynamic";

async function DeferredOrdinanceSection({
  address,
  jibunAddress,
  setbackReview,
}: {
  address: string;
  jibunAddress: string;
  setbackReview: Awaited<ReturnType<typeof getCachedAnalyzeSolarSite>>["setbackReview"];
}) {
  const ordinanceResult = await resolveOrdinanceForAddress(address);
  const ordinanceDisplay = resolveOrdinanceDisplay(address, jibunAddress, ordinanceResult.data);
  const ordinanceInfo = resolveOrdinanceInfoList(
    address,
    jibunAddress,
    ordinanceDisplay,
    ordinanceResult.data,
  );

  return (
    <>
      <LocalOrdinanceSection
        display={ordinanceDisplay}
        meta={ordinanceResult.meta}
        ordinanceInfo={ordinanceInfo}
      />
      <SetbackReviewSection review={setbackReview} displayPolicy={ordinanceDisplay.policy} />
    </>
  );
}

function OrdinanceSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
      <div className="h-5 w-40 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-full max-w-md rounded bg-slate-100" />
      <div className="mt-6 h-28 rounded-xl bg-slate-100" />
    </div>
  );
}

export default async function ResultPage({ searchParams }: ResultPageProps) {
  const params = await searchParams;

  let data;
  try {
    data = await getCachedAnalyzeSolarSite(params.address ?? "", { phase: "core" });
  } catch (error) {
    const detail =
      error instanceof KakaoAddressNotFoundError
        ? KakaoAddressNotFoundError.userHint
        : undefined;

    return (
      <AddressSearchError message={getKakaoErrorMessage(error)} detail={detail} />
    );
  }

  void recordSearchHistory(data, params.address ?? data.address);

  const consultationBase = {
    jibunAddress: data.jibunAddress,
    landCategory: getFieldValue(data.landInfo, "지목"),
    zoning: getFieldValue(data.landInfo, "용도지역"),
    landArea: getFieldValue(data.landInfo, "면적"),
    buildingArea: getFieldValue(data.buildingInfo, "건축면적"),
  };

  const primaryParcel = primaryParcelFromReview(data);
  const multiParcelEnabled = data.solarMetrics.installType === "토지형";
  const installTypeLabel =
    data.recommendation.split("(")[0]?.trim() || data.recommendation;

  const showMountainWarning = isMountainOrForestSite(
    data.address,
    data.jibunAddress,
    getFieldValue(data.landInfo, "지목"),
  );

  const reviewStatusItems = buildReviewStatusItems(data);
  const analysisAreaLabel =
    data.solarMetrics.baseAreaSqm > 0
      ? `${Math.round(data.solarMetrics.baseAreaSqm).toLocaleString("ko-KR")}㎡`
      : undefined;

  return (
    <ResultMetricsProvider
      landInfo={data.landInfo}
      buildingInfo={data.buildingInfo}
      initialInstallType={data.solarMetrics.installType as InstallTypeOption}
      initialMetrics={data.solarMetrics}
      initialProfitability={data.profitability}
      initialMonthlyGeneration={data.monthlyGeneration}
      initialPrimaryParcel={primaryParcel}
      initialRecommendedCases={data.recommendedCases}
      siteAddress={data.address}
      siteJibunAddress={data.jibunAddress}
      multiParcelEnabled={multiParcelEnabled}
      consultationBase={consultationBase}
      siteGeometryBundle={data.siteGeometryBundle}
    >
      <div className="pb-28 md:pb-16">
        <ResultHero
          address={data.address}
          jibunAddress={data.jibunAddress}
          buildingName={data.buildingName}
          analyzedAt={data.analyzedAt}
          recommendation={data.recommendation}
        />

        <ResultStickyNav />

        <div className="mx-auto max-w-[1320px] space-y-12 px-4 py-8 sm:space-y-14 sm:px-6 sm:py-10">
          {showMountainWarning && <MountainLandWarningBanner />}

          <section id="site-location" className="scroll-mt-28">
            <SectionHeader
              title="입지 위치"
              description="입력하신 주소의 위치를 지도에서 먼저 확인하세요."
            />
            <MapArea
              address={data.address}
              jibunAddress={data.jibunAddress}
              lat={data.lat}
              lng={data.lng}
              installType={installTypeLabel}
              areaLabel={analysisAreaLabel}
              landCategory={getFieldValue(data.landInfo, "지목") || undefined}
              zoning={getFieldValue(data.landInfo, "용도지역") || undefined}
            />
          </section>

          <div className="rounded-3xl bg-slate-50/80 px-4 py-8 sm:px-6">
            <InstallationSizeSection />
          </div>

          <GridGatePanel>
            <GridConnectionSection
              initialGridInfo={data.gridInfo}
              address={data.address}
              jibunAddress={data.jibunAddress}
              lat={data.lat}
              lng={data.lng}
              disclaimer={GRID_DISCLAIMER}
            />
          </GridGatePanel>

          <GenerationSection />

          <div className="rounded-3xl bg-gradient-to-b from-slate-50 to-white px-4 py-8 sm:px-6">
            <MarketRevenueSection />
          </div>

          <InstallationVisualSection />

          <RequiredChecks items={reviewStatusItems} />

          <BusinessRoadmapSection />

          <DetailAnalysisAccordion>
            <MultiParcelSection />
            <LandInfoCardSection detail={data.landInfoDetail} />
            <RegionDistrictSection analysis={data.regionDistrictAnalysis} />
            <RegulatoryAnalysisSection analysis={data.layerARegulatoryAnalysis} />

            <DetailInfoSection
              id="building-info"
              title="건축물 정보"
              fields={data.buildingInfo}
            />

            <Suspense fallback={<OrdinanceSkeleton />}>
              <DeferredOrdinanceSection
                address={data.address}
                jibunAddress={data.jibunAddress}
                setbackReview={data.setbackReview}
              />
            </Suspense>

            <ResultCapacitySection recommendation={data.recommendation} />
          </DetailAnalysisAccordion>

          <SgSolarSupportSection />

          <ResultSimilarCasesSection />

          <ResultPdfCtaPanel address={data.address} />
          <ResultSaveSection address={data.address} />
          <ResultConsultationSection defaultAddress={data.consultationDefaultAddress} />
        </div>

        <MobileResultActions address={data.address} />
      </div>
    </ResultMetricsProvider>
  );
}
