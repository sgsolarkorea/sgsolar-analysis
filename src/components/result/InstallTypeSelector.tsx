"use client";

import SectionHeader from "@/components/ui/SectionHeader";
import {
  INSTALL_TYPE_OPTIONS,
  INSTALL_TYPE_UI_MESSAGES,
  formatInstallTypeShortLabel,
  type InstallTypeOption,
} from "@/data/resultUx";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { formatUnifiedCapacityKw } from "@/lib/solar/capacityResolution";

interface InstallTypeSelectorProps {
  apiRecommendation: string;
}

export default function InstallTypeSelector({ apiRecommendation }: InstallTypeSelectorProps) {
  const { installType, setInstallType, metrics } = useResultMetrics();

  return (
    <div>
      <SectionHeader
        title="설치유형 선택"
        description="관심 있는 설치 유형을 선택하면 추천 안내 및 설치용량 산정 기준이 변경됩니다."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {INSTALL_TYPE_OPTIONS.map((type) => {
          const isSelected = installType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setInstallType(type as InstallTypeOption)}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                isSelected
                  ? "border-navy bg-navy text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-800 hover:border-navy/30 hover:bg-navy-light"
              }`}
            >
              {type}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-navy/20 bg-navy-light px-4 py-4">
        <p className="text-sm font-semibold text-slate-900">추천 설치유형 (선택 기준)</p>
        <p className="mt-2 text-base font-bold text-navy">
          {formatInstallTypeShortLabel(metrics.installType as InstallTypeOption)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {INSTALL_TYPE_UI_MESSAGES[metrics.installType as InstallTypeOption]}
        </p>
        <p className="mt-3 text-sm text-slate-700">
          예상 설치용량:{" "}
          <strong className="text-navy">{formatUnifiedCapacityKw(metrics.capacityKw)}</strong>
        </p>
        <p className="mt-2 text-xs text-slate-500">1차 분석 추천: {apiRecommendation}</p>
      </div>
    </div>
  );
}
