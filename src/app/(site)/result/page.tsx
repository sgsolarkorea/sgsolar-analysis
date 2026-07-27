import {
  ResultCapacitySection,
  ResultConsultationSection,
  ResultSaveSection,
} from "@/components/result/ResultMetricsSections";
import ResultPdfCtaPanel from "@/components/result/ResultPdfCtaPanel";
import MobileResultActions from "@/components/result/MobileResultActions";
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
import ResultFrame from "@/components/result/ResultFrame";
import TechnicalFrame from "@/components/result/TechnicalFrame";
import PermitGateSection from "@/components/result/PermitGateSection";
import GenerationSection from "@/components/result/GenerationSection";
import MarketRevenueSection from "@/components/result/MarketRevenueSection";
import InvestmentAnalysisSection from "@/components/result/InvestmentAnalysisSection";
import RequiredChecks from "@/components/result/RequiredChecks";
import BusinessRoadmapSection from "@/components/result/BusinessRoadmapSection";
import SgSolarSupportSection from "@/components/result/SgSolarSupportSection";
import InstallLookbookSection from "@/components/result/InstallLookbookSection";
import DetailAnalysisAccordion from "@/components/result/DetailAnalysisAccordion";
import AddressSearchError from "@/components/result/AddressSearchError";
import { ResultMetricsProvider } from "@/components/result/ResultMetricsProvider";
import { getCachedAnalyzeSolarSite } from "@/lib/api/analysis";
import {
  KakaoAddressNotFoundError,
  getKakaoErrorMessage,
} from "@/lib/api/kakaoErrors";
import { buildReviewStatusItems } from "@/lib/result/buildReviewSummary";
import { Suspense } from "react";

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
    <div className="animate-pulse py-6">
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
  const hasBuilding =
    data.buildingInfo.some((f) => f.value && f.value !== "-" && f.value !== "정보 없음") ||
    Boolean(data.buildingName);

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

        {showMountainWarning ? (
          <div className="mx-auto max-w-[1360px] px-4 pt-6 sm:px-6">
            <MountainLandWarningBanner />
          </div>
        ) : null}

        {/* FRAME 01 — SITE */}
        <ResultFrame
          id="frame-site"
          eyebrow="Site"
          title="입지 위치"
          intro="입력하신 부지의 위치를 지도에서 확인하세요."
          className="result-frame-pad result-frame-pad--lg"
        >
          <MapArea
            address={data.address}
            jibunAddress={data.jibunAddress}
            lat={data.lat}
            lng={data.lng}
            installType={installTypeLabel}
            areaLabel={analysisAreaLabel}
            landCategory={getFieldValue(data.landInfo, "지목") || undefined}
            zoning={getFieldValue(data.landInfo, "용도지역") || undefined}
            buildingPresent={hasBuilding}
          />
        </ResultFrame>

        {/* FRAME 02 — TECHNICAL */}
        <ResultFrame
          id="frame-technical"
          eyebrow="Technical"
          title="설치 규모 · 형태"
          intro="얼마나 설치되고 어떤 모습인지 한눈에 확인합니다."
          tone="dark"
          className="result-frame-pad result-frame-pad--md"
        >
          <TechnicalFrame />
        </ResultFrame>

        {/* FRAME 03 — FEASIBILITY */}
        <ResultFrame
          id="frame-feasibility"
          eyebrow="Feasibility"
          title="사업 진행 핵심 검토"
          intro="계통·인허가·조례·현장조건 등 실제 사업에 걸리는 항목을 함께 봅니다."
          tone="dark"
          className="result-frame-pad result-frame-pad--md"
        >
          <PermitGateSection items={reviewStatusItems} />
          <div
            id="grid"
            className="mt-10 scroll-mt-28 border-t border-white/15 bg-white/95 px-5 py-6 text-navy sm:px-7 sm:py-8"
          >
            <GridConnectionSection
              initialGridInfo={data.gridInfo}
              address={data.address}
              jibunAddress={data.jibunAddress}
              lat={data.lat}
              lng={data.lng}
              disclaimer={GRID_DISCLAIMER}
            />
          </div>
        </ResultFrame>

        {/* FRAME 04 — ENERGY */}
        <ResultFrame
          id="frame-energy"
          eyebrow="Energy"
          title="예상 발전량"
          intro="지역 일사량 기준 연간·월별 예상 발전량입니다."
          className="result-frame-pad result-frame-pad--md"
        >
          <GenerationSection embedded />
        </ResultFrame>

        {/* FRAME 05 — BUSINESS */}
        <ResultFrame
          id="frame-business"
          eyebrow="Business"
          title="시장가격 · 투자수익"
          intro="1년 시장 스냅샷과 20년 장기 투자 시뮬레이션을 구분해 확인합니다."
          tone="default"
          className="result-frame-pad result-frame-pad--lg"
        >
          <MarketRevenueSection embedded />
          <InvestmentAnalysisSection />
        </ResultFrame>

        {/* FRAME 06 — ACTION */}
        <ResultFrame
          id="frame-action"
          eyebrow="Action"
          title="확인사항 · 진행 절차"
          intro="검토가 완료되면 실제 사업은 다음 절차로 진행됩니다."
          tone="muted"
          className="result-frame-pad result-frame-pad--md"
        >
          <RequiredChecks items={reviewStatusItems} />
          <div className="mt-10">
            <BusinessRoadmapSection />
          </div>
        </ResultFrame>

        {/* FRAME 07 — PROOF */}
        <ResultFrame
          id="frame-proof"
          eyebrow="Proof"
          title="설치 형태와 사업 역량"
          intro="현재 분석 설치유형을 중심으로 설치 형태 예시와 SG SOLAR 역량을 확인합니다."
          tone="default"
          className="result-frame-pad result-frame-pad--lg"
        >
          <InstallLookbookSection embedded />
          <div className="mt-14">
            <SgSolarSupportSection embedded />
          </div>
        </ResultFrame>

        {/* 분석 근거 (접힘) */}
        <div className="mx-auto max-w-[1360px] px-4 py-10 sm:px-6">
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
        </div>

        {/* FRAME 08 — CONVERSION */}
        <ResultFrame
          id="frame-conversion"
          eyebrow="Next Step"
          title="다음 단계"
          className="result-frame-pad result-frame-pad--compact"
        >
          <ResultPdfCtaPanel address={data.address} />
          <div className="mt-10 space-y-10">
            <ResultSaveSection address={data.address} />
            <ResultConsultationSection defaultAddress={data.consultationDefaultAddress} />
          </div>
        </ResultFrame>

        <MobileResultActions address={data.address} />
      </div>
    </ResultMetricsProvider>
  );
}
