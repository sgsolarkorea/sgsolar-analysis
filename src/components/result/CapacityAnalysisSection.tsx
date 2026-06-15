import type { SolarMetrics } from "@/types/siteReview";
import SectionHeader from "@/components/ui/SectionHeader";

interface CapacityAnalysisSectionProps {
  metrics: SolarMetrics;
}

export default function CapacityAnalysisSection({ metrics }: CapacityAnalysisSectionProps) {
  return (
    <section id="capacity-analysis" className="scroll-mt-24">
      <SectionHeader
        title="설치용량 산정"
        description={`${metrics.modulePowerW}W 모듈 기준 1차 설치용량 검토입니다.`}
      />
      <div className="card-premium divide-y divide-slate-100">
        <div className="flex flex-col gap-1 bg-navy-light/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-slate-500">예상 설치용량</span>
          <span className="text-base font-bold text-navy">
            {metrics.capacityKw.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}kW
          </span>
        </div>
        <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-slate-500">기준면적 ({metrics.baseAreaLabel})</span>
          <span className="text-sm font-semibold text-slate-900">
            {metrics.baseAreaSqm > 0
              ? `${metrics.baseAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡`
              : "확인 필요"}
          </span>
        </div>
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3">
          <p className="text-xs leading-relaxed text-amber-900 sm:text-sm">
            ⚠ {metrics.capacityDisclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}
