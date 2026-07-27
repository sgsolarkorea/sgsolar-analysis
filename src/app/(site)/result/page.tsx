import { Suspense } from "react";
import {
  ResultCapacitySection,
  ResultConsultationSection,
  ResultRevenueSection,
  ResultSaveSection,
  ResultSimilarCasesSection,
} from "@/components/result/ResultMetricsSections";
import ResultPdfCtaPanel from "@/components/result/ResultPdfCtaPanel";
import MobileResultActions from "@/components/result/MobileResultActions";
import SectionHeader from "@/components/ui/SectionHeader";
import { GRID_DISCLAIMER } from "@/data/sampleData";
import { resolveProgressSteps, type InstallTypeOption } from "@/data/resultUx";
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
import AnalysisProgressPanel from "@/components/result/AnalysisProgressPanel";
import ResultHero from "@/components/result/ResultHero";
import AnalysisOverview from "@/components/result/AnalysisOverview";
import RequiredChecks from "@/components/result/RequiredChecks";
import NextSteps from "@/components/result/NextSteps";
import BusinessVisual from "@/components/result/BusinessVisual";
import AddressSearchError from "@/components/result/AddressSearchError";
import { ResultMetricsProvider } from "@/components/result/ResultMetricsProvider";
import { getCachedAnalyzeSolarSite } from "@/lib/api/analysis";
import {
  KakaoAddressNotFoundError,
  getKakaoErrorMessage,
} from "@/lib/api/kakaoErrors";
import { buildReviewStatusItems } from "@/lib/result/buildReviewSummary";
import { formatRecWeightDisplay } from "@/lib/solar/formatRecWeight";
import { formatHouseholdMonthlySavings, isHouseholdInstallType } from "@/lib/solar/householdSavings";
import { REVENUE_WARNING } from "@/data/sampleData";

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
    // Prefer full if background enrich finished; otherwise use core for fast first paint
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

  const progressSteps = resolveProgressSteps(data.landInfo, data.buildingInfo);
  const primaryParcel = primaryParcelFromReview(data);
  const multiParcelEnabled = data.solarMetrics.installType === "토지형";
  const installTypeLabel =
    data.recommendation.split("(")[0]?.trim() || data.recommendation;
  const isHousehold = isHouseholdInstallType(data.solarMetrics.installType as InstallTypeOption);

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

        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
          <div className="lg:flex lg:gap-8 lg:py-6">
            <AnalysisProgressPanel steps={progressSteps} />

            <div className="min-w-0 flex-1 space-y-10 sm:space-y-12">
              {showMountainWarning && <MountainLandWarningBanner />}

              <section id="site-location" className="scroll-mt-24 mt-8 sm:mt-0">
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

              <AnalysisOverview
                capacity={data.capacity}
                annualGeneration={data.annualGeneration}
                annualRevenue={data.annualRevenue}
                constructionCost={data.constructionCost}
                recWeight={formatRecWeightDisplay(data.solarMetrics.recWeight)}
                analysisArea={analysisAreaLabel}
                installType={installTypeLabel}
                isHousehold={isHousehold}
                householdSavingsLabel="월 예상 절감액"
                householdSavingsValue={formatHouseholdMonthlySavings(data.solarMetrics.capacityKw)}
              />

              <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                ⚠ {REVENUE_WARNING}
              </p>

              <BusinessVisual />

              <RequiredChecks items={reviewStatusItems} />

              <NextSteps />

              <div id="detail-analysis" className="scroll-mt-24 space-y-8 border-t border-slate-200 pt-10">
                <h2 className="text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
                  상세 분석
                </h2>

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
                <ResultRevenueSection showMountainRecNote={showMountainWarning} />

                <GridConnectionSection
                  initialGridInfo={data.gridInfo}
                  address={data.address}
                  jibunAddress={data.jibunAddress}
                  lat={data.lat}
                  lng={data.lng}
                  disclaimer={GRID_DISCLAIMER}
                />
              </div>

              <ResultSimilarCasesSection />

              <ResultPdfCtaPanel address={data.address} />
              <ResultSaveSection address={data.address} />
              <ResultConsultationSection defaultAddress={data.consultationDefaultAddress} />
            </div>
          </div>
        </div>

        <MobileResultActions address={data.address} />
      </div>
    </ResultMetricsProvider>
  );
}
