"use client";

import { useMemo, useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import {
  INSTALL_TYPE_OPTIONS,
  INSTALL_TYPE_UI_MESSAGES,
  inferDefaultInstallType,
  type InstallTypeOption,
} from "@/data/resultUx";
import { calculateSolarMetrics } from "@/lib/solar/calculate";
import type { InfoField, SolarMetrics } from "@/types/siteReview";

interface InstallTypeSelectorProps {
  apiRecommendation: string;
  landInfo: InfoField[];
  buildingInfo: InfoField[];
  initialMetrics: SolarMetrics;
}

export default function InstallTypeSelector({
  apiRecommendation,
  landInfo,
  buildingInfo,
  initialMetrics,
}: InstallTypeSelectorProps) {
  const [selected, setSelected] = useState<InstallTypeOption>(() =>
    inferDefaultInstallType(apiRecommendation),
  );

  const metrics = useMemo(() => {
    if (selected === initialMetrics.installType) {
      return initialMetrics;
    }
    return calculateSolarMetrics({
      installType: selected,
      landInfo,
      buildingInfo,
      market: initialMetrics.market,
    }).metrics;
  }, [selected, landInfo, buildingInfo, initialMetrics]);

  return (
    <section id="install-type" className="scroll-mt-24">
      <SectionHeader
        title="설치유형 선택"
        description="관심 있는 설치 유형을 선택하면 추천 안내 및 설치용량 산정 기준이 변경됩니다."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {INSTALL_TYPE_OPTIONS.map((type) => {
          const isSelected = selected === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setSelected(type)}
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
        <p className="mt-2 text-base font-bold text-navy">{selected}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {INSTALL_TYPE_UI_MESSAGES[selected]}
        </p>
        <p className="mt-3 text-sm text-slate-700">
          예상 설치용량:{" "}
          <strong className="text-navy">
            {metrics.capacityKw.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}kW
          </strong>
          <span className="ml-2 text-xs text-slate-500">({metrics.formula})</span>
        </p>
        <p className="mt-2 text-xs text-slate-500">API 분석 기준 참고: {apiRecommendation}</p>
      </div>
    </section>
  );
}
