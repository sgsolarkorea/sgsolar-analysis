import type { SolarMetrics } from "@/types/siteReview";
import SectionHeader from "@/components/ui/SectionHeader";
import { formatUnifiedCapacityKw } from "@/lib/solar/capacityResolution";

interface CapacityAnalysisSectionProps {
  metrics: SolarMetrics;
  embedded?: boolean;
}

export default function CapacityAnalysisSection({
  metrics,
  embedded = false,
}: CapacityAnalysisSectionProps) {
  const Wrapper = embedded ? "div" : "section";
  const wrapperProps = embedded
    ? {}
    : { id: "capacity-analysis" as const, className: "scroll-mt-24" };

  const moduleCountLabel =
    metrics.moduleCount > 0
      ? `${metrics.moduleCount.toLocaleString("ko-KR")}장`
      : "확인 필요";

  const isLand = metrics.capacityBasis === "land" || metrics.installType === "토지형";

  return (
    <Wrapper {...wrapperProps}>
      <SectionHeader
        title="설치용량 산정"
        description={`${metrics.modulePowerW}W 모듈 기준 1차 설치용량 검토입니다.`}
      />
      <div className="card-premium divide-y divide-slate-100">
        <div className="flex flex-col gap-1 bg-navy-light/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-slate-500">예상 설치용량</span>
          <span className="text-base font-bold text-navy">
            {formatUnifiedCapacityKw(metrics.capacityKw)}
          </span>
        </div>
        <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-slate-500">적용 모듈</span>
          <span className="text-sm font-semibold text-slate-900">
            {metrics.modulePowerW}W 기준
          </span>
        </div>
        <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-slate-500">예상 모듈 수량</span>
          <span className="text-sm font-semibold text-slate-900">{moduleCountLabel}</span>
        </div>
        <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-slate-500">기준면적 ({metrics.baseAreaLabel})</span>
          <span className="text-sm font-semibold text-slate-900">
            {metrics.baseAreaSqm > 0
              ? `${metrics.baseAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡`
              : "확인 필요"}
          </span>
        </div>
        {isLand && metrics.usableAreaSqm != null && metrics.usableAreaSqm > 0 && (
          <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-500">usableArea (setback 후)</span>
            <span className="text-sm font-semibold text-slate-900">
              {metrics.usableAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡
            </span>
          </div>
        )}
        {!isLand && metrics.landAreaSqm != null && metrics.landAreaSqm > 0 && (
          <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-500">대지면적 (참고)</span>
            <span className="text-sm font-semibold text-slate-900">
              {metrics.landAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡
            </span>
          </div>
        )}
        {!isLand && metrics.usedBuildingCount != null && metrics.usedBuildingCount > 0 && (
          <>
            <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-500">감지 건물 수</span>
              <span className="text-sm font-semibold text-slate-900">
                {(metrics.detectedBuildingCount ?? metrics.usedBuildingCount).toLocaleString("ko-KR")}동
              </span>
            </div>
            <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-500">배치 반영 건물 수</span>
              <span className="text-sm font-semibold text-slate-900">
                {metrics.usedBuildingCount.toLocaleString("ko-KR")}동
              </span>
            </div>
          </>
        )}
        {!isLand && metrics.roofUsableAreaSqm != null && metrics.roofUsableAreaSqm > 0 && (
          <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-500">지붕 유효면적</span>
            <span className="text-sm font-semibold text-slate-900">
              {metrics.roofUsableAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡
            </span>
          </div>
        )}
        {!isLand && metrics.registryBuildingAreaSqm != null && metrics.registryBuildingAreaSqm > 0 && (
          <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-500">건축물대장 건축면적</span>
            <span className="text-sm font-semibold text-slate-900">
              {metrics.registryBuildingAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡
            </span>
          </div>
        )}
        {!isLand && metrics.buildingFootprintAreaSumSqm != null &&
          metrics.registryBuildingAreaSqm != null &&
          Math.abs(metrics.buildingFootprintAreaSumSqm - metrics.registryBuildingAreaSqm) > 1 && (
          <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-500">GIS polygon 합산면적</span>
            <span className="text-sm font-semibold text-slate-900">
              {metrics.buildingFootprintAreaSumSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡
            </span>
          </div>
        )}
        {!isLand && metrics.buildingFootprintAreaSqm != null && metrics.buildingFootprintAreaSqm > 0 && (
          <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-500">건물/지붕면적</span>
            <span className="text-sm font-semibold text-slate-900">
              {metrics.buildingFootprintAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡
            </span>
          </div>
        )}
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3">
          <p className="text-sm font-medium leading-relaxed text-amber-900">
            ⚠ {metrics.capacityDisclaimer}
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-amber-900">
            ⚠ 실제 설치용량은 음영, 지붕 형상, 구조검토 결과에 따라 달라질 수 있습니다.
          </p>
        </div>
      </div>
    </Wrapper>
  );
}
