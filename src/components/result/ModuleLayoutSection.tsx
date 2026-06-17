"use client";

import { useEffect, useState } from "react";
import ModuleLayoutMap from "@/components/result/ModuleLayoutMap";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import SectionHeader from "@/components/ui/SectionHeader";
import { MetricCard } from "@/components/ui/InfoCard";
import { moduleLayoutConfig } from "@/data/moduleLayoutConfig";
import { formatInstallTypeShortLabel } from "@/data/resultUx";
import type { InstallTypeOption } from "@/data/resultUx";
import { formatUnifiedCapacityKw } from "@/lib/solar/capacityResolution";
import type { ModuleLayoutResult } from "@/types/moduleLayout";

interface ModuleLayoutSectionProps {
  address: string;
  jibunAddress: string;
}

export default function ModuleLayoutSection({ address, jibunAddress }: ModuleLayoutSectionProps) {
  const { metrics, installType, primaryParcel } = useResultMetrics();
  const [layout, setLayout] = useState<ModuleLayoutResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      lat: String(primaryParcel.lat),
      lng: String(primaryParcel.lng),
      capacityKw: String(metrics.capacityKw),
      installType,
      moduleCount: String(metrics.moduleCount),
    });
    if (primaryParcel.pnu) params.set("pnu", primaryParcel.pnu);

    fetch(`/api/module-layout?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "가배치도를 불러오지 못했습니다.");
        }
        return res.json() as Promise<ModuleLayoutResult>;
      })
      .then((data) => {
        if (!cancelled) setLayout(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLayout(null);
          setError(err instanceof Error ? err.message : "가배치도를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    primaryParcel.lat,
    primaryParcel.lng,
    primaryParcel.pnu,
    metrics.capacityKw,
    metrics.moduleCount,
    installType,
  ]);

  const targetModules = metrics.moduleCount;

  return (
    <section id="module-layout" className="scroll-mt-24">
      <SectionHeader
        title="예상 모듈 가배치도"
        description="위성지도 위 목표 모듈수 기준 1차 가배치도입니다."
      />

      {loading && (
        <div className="flex h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 sm:h-[400px]">
          <p className="text-sm text-slate-600">모듈 가배치도를 생성하는 중...</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      {!loading && layout && (
        <>
          <ModuleLayoutMap layout={layout} address={address} jibunAddress={jibunAddress} />

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="예상 설치용량"
              value={formatUnifiedCapacityKw(metrics.capacityKw)}
            />
            <MetricCard
              label="예상 모듈 수"
              value={`${targetModules.toLocaleString("ko-KR")}장`}
            />
            <MetricCard label="모듈 사양" value={`${moduleLayoutConfig.modulePowerW}W`} />
            <MetricCard
              label="설치유형"
              value={formatInstallTypeShortLabel(installType as InstallTypeOption)}
            />
          </div>

          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
            ※ {moduleLayoutConfig.disclaimer}
          </p>
        </>
      )}
    </section>
  );
}
