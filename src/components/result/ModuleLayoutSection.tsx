"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ModuleLayoutMap from "@/components/result/ModuleLayoutMap";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import SectionHeader from "@/components/ui/SectionHeader";
import { MetricCard } from "@/components/ui/InfoCard";
import { layoutPolicy, moduleLayoutConfig } from "@/data/moduleLayoutConfig";
import { formatInstallTypeShortLabel } from "@/data/resultUx";
import type { InstallTypeOption } from "@/data/resultUx";
import { formatUnifiedCapacityKw } from "@/lib/solar/capacityResolution";
import { getFieldValue, parseAreaSqm } from "@/lib/solar/calculate";
import type { ModuleLayoutResult } from "@/types/moduleLayout";

interface ModuleLayoutSectionProps {
  address: string;
  jibunAddress: string;
}

export default function ModuleLayoutSection({ address, jibunAddress }: ModuleLayoutSectionProps) {
  const searchParams = useSearchParams();
  const polygonDebug = searchParams.get("polygonDebug");
  const polygonDebugOverlay = polygonDebug === "1";
  const polygonDebugRaw = polygonDebug === "raw";
  const polygonDebugCompare = polygonDebug === "compare";
  const polygonDebugRoof = polygonDebug === "roof";
  const { metrics, installType, primaryParcel, parcels, multiParcelGeometryReady, buildingInfo, landInfo } =
    useResultMetrics();
  const [layout, setLayout] = useState<ModuleLayoutResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const buildingAreaSqm = parseAreaSqm(getFieldValue(buildingInfo, "건축면적"));
    const landAreaSqm = parseAreaSqm(getFieldValue(landInfo, "면적"));

    if (installType === "토지형" && parcels.length > 1 && !multiParcelGeometryReady) {
      return () => {
        cancelled = true;
      };
    }

    const multiParcelLand = installType === "토지형" && parcels.length > 1;

    const params = new URLSearchParams({
      lat: String(primaryParcel.lat),
      lng: String(primaryParcel.lng),
      capacityKw: String(metrics.capacityKw),
      installType,
      moduleCount: String(metrics.moduleCount),
    });
    if (primaryParcel.pnu) params.set("pnu", primaryParcel.pnu);
    if (buildingAreaSqm != null) params.set("buildingAreaSqm", String(buildingAreaSqm));
    if (landAreaSqm != null) params.set("landAreaSqm", String(landAreaSqm));
    if (multiParcelLand) {
      params.set(
        "parcels",
        JSON.stringify(
          parcels.map((parcel) => ({
            pnu: parcel.pnu,
            lat: parcel.lat,
            lng: parcel.lng,
          })),
        ),
      );
    }
    if (polygonDebugOverlay || polygonDebugRaw || polygonDebugCompare) params.set("overlayOnly", "1");
    if (polygonDebugRoof) {
      params.set("polygonDebug", "roof");
      params.set("roofFittingProbe", "1");
    } else if (polygonDebugCompare) params.set("polygonDebug", "compare");
    else if (polygonDebugRaw) params.set("polygonDebug", "raw");
    else if (polygonDebugOverlay) params.set("polygonDebug", "1");

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
    parcels,
    multiParcelGeometryReady,
    metrics.capacityKw,
    metrics.moduleCount,
    installType,
    buildingInfo,
    landInfo,
    polygonDebugOverlay,
    polygonDebugRaw,
    polygonDebugCompare,
    polygonDebugRoof,
  ]);

  const targetModules = layout?.stats.targetModuleCount ?? metrics.moduleCount;
  const placedModules = layout?.stats.placedModuleCount ?? 0;
  const placementMismatch =
    !polygonDebugOverlay &&
    !polygonDebugRaw &&
    !polygonDebugCompare &&
    !polygonDebugRoof &&
    placedModules !== targetModules;

  return (
    <section id="module-layout" className="scroll-mt-24">
      <SectionHeader
        title={
          polygonDebugRoof
            ? "Roof Polygon Debug"
            : polygonDebugCompare
              ? "Polygon 3-way 비교"
              : polygonDebugRaw
                ? "원본 필지 경계 검증"
                : polygonDebugOverlay
                  ? "Polygon 검증 (Overlay 전용)"
                  : installType === "토지형"
                    ? "토지 기준 가배치"
                    : "건물 지붕 기준 가배치"
        }
        description={
          polygonDebugRoof
            ? "녹색=building footprint, 주황=0.5m setback usable, 모듈=배치됨, 빨간 점=center-only rejected. URL: ?polygonDebug=roof"
            : polygonDebugCompare
              ? "녹색=원본 필지, 주황=setback, 파란 점선=layout.boundary. 세 Polygon이 형상·위치가 일치하는지 확인합니다."
              : polygonDebugRaw
                ? "지적도 원본 경계(sourceBoundary)만 표시합니다. setback·모듈 미적용."
                : polygonDebugOverlay
                  ? "setback 적용 후 layout.boundary만 표시합니다. 모듈은 숨깁니다."
                  : "위성지도 기준 예상 배치도입니다. 실제 설계 시 현장 조건, 구조검토, 이격거리 및 인허가 기준에 따라 배치가 변경될 수 있습니다."
        }
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

          {(polygonDebugRoof || polygonDebugCompare) && (
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm border-2 border-green-600 bg-green-500/30" />
                building footprint
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm border-2 border-amber-500 bg-amber-500/35" />
                roof usable (setback {layoutPolicy.roofEdgeSetbackM}m)
              </span>
              {polygonDebugCompare && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm border-2 border-dashed border-blue-600" />
                  layout.boundary
                </span>
              )}
              {polygonDebugRoof && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500/80" />
                    center-only rejected
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500/80" />
                    edge-tolerance-only
                  </span>
                </>
              )}
            </div>
          )}

          {polygonDebugRoof && layout.roofFittingProbe && (
            <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
              <p className="font-semibold text-slate-900">Fitting 정책 비교 (diagnostics only)</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  footprint: {layout.roofFittingProbe.footprintAreaSqm}㎡ / usable:{" "}
                  {layout.roofFittingProbe.roofUsableAreaSqm}㎡
                </div>
                <div>
                  orientation: {layout.roofDebugOverlay?.orientationDegrees}° /{" "}
                  {layout.roofDebugOverlay?.selectedOrientationMode} / gap{" "}
                  {layout.roofDebugOverlay?.selectedRowGapM}m
                </div>
                <div>
                  selected: {layout.stats.placedModuleCount}장 (
                  {formatUnifiedCapacityKw(layout.stats.placedModuleCount * 0.64)})
                </div>
              </div>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th className="py-1 pr-2">policy</th>
                    <th className="py-1 pr-2">tol/setback</th>
                    <th className="py-1 pr-2">placed</th>
                    <th className="py-1 pr-2">kW</th>
                    <th className="py-1 pr-2">max침범</th>
                    <th className="py-1">nearMiss</th>
                  </tr>
                </thead>
                <tbody>
                  {layout.roofFittingProbe.edgeToleranceComparison.map((row) => (
                    <tr key={`edge-${row.toleranceM}`} className="border-b border-slate-200">
                      <td className="py-1 pr-2">edge_tolerance</td>
                      <td className="py-1 pr-2">{row.toleranceM}m / {row.setbackM}m</td>
                      <td className="py-1 pr-2">{row.placedModuleCount}</td>
                      <td className="py-1 pr-2">{row.selectedCapacityKw}</td>
                      <td className="py-1 pr-2">{row.maxOverBoundaryDistanceM}m</td>
                      <td className="py-1">{row.rejectedNearMissCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {layout.roofFittingProbe.recommendedPolicy.overEstimationRisk && (
                <p className="text-slate-600">
                  710Wp 수동 {layout.roofFittingProbe.userManualModules710Wp}장 기준 / 과대 위험:{" "}
                  {layout.roofFittingProbe.recommendedPolicy.overEstimationRisk}
                </p>
              )}
              <p className="text-slate-600">
                추천(diagnostics): {layout.roofFittingProbe.recommendedPolicy.policy}{" "}
                {layout.roofFittingProbe.recommendedPolicy.toleranceM > 0
                  ? `@ ${layout.roofFittingProbe.recommendedPolicy.toleranceM}m`
                  : ""}{" "}
                — {layout.roofFittingProbe.recommendedPolicy.rationale}
              </p>
              <ul className="list-disc pl-4 text-slate-600">
                {layout.roofFittingProbe.analysisNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {(polygonDebugOverlay || polygonDebugRaw || polygonDebugCompare) && !polygonDebugRoof && layout.diagnostics && (
            <pre className="mt-3 overflow-x-auto rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              {JSON.stringify(layout.diagnostics, null, 2)}
            </pre>
          )}

          {!polygonDebugOverlay && !polygonDebugRaw && !polygonDebugCompare && !polygonDebugRoof && (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {layout.diagnostics?.mergedParcelCount != null &&
                  layout.diagnostics.mergedParcelCount > 1 && (
                    <MetricCard
                      label="Union 필지 수"
                      value={`${layout.diagnostics.mergedParcelCount.toLocaleString("ko-KR")}필지`}
                    />
                  )}
                {installType === "토지형" ? (
                  <>
                    <MetricCard
                      label="토지면적"
                      value={
                        metrics.landAreaSqm != null && metrics.landAreaSqm > 0
                          ? `${metrics.landAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡`
                          : "확인 필요"
                      }
                    />
                    <MetricCard
                      label="usableArea"
                      value={
                        layout.diagnostics?.usableAreaSqm != null
                          ? `${layout.diagnostics.usableAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡`
                          : metrics.usableAreaSqm != null
                            ? `${metrics.usableAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡`
                            : "확인 필요"
                      }
                    />
                  </>
                ) : (
                  <>
                    {(layout.diagnostics?.usedBuildingCount ?? metrics.usedBuildingCount) != null &&
                      (layout.diagnostics?.usedBuildingCount ?? metrics.usedBuildingCount)! > 0 && (
                        <>
                          <MetricCard
                            label="감지 건물 수"
                            value={`${(layout.diagnostics?.detectedBuildingCount ?? metrics.detectedBuildingCount ?? layout.diagnostics?.usedBuildingCount ?? metrics.usedBuildingCount)?.toLocaleString("ko-KR")}동`}
                          />
                          <MetricCard
                            label="배치 반영 건물 수"
                            value={`${(layout.diagnostics?.usedBuildingCount ?? metrics.usedBuildingCount)?.toLocaleString("ko-KR")}동`}
                          />
                        </>
                      )}
                    <MetricCard
                      label="대지면적"
                      value={
                        metrics.landAreaSqm != null && metrics.landAreaSqm > 0
                          ? `${metrics.landAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡`
                          : "확인 필요"
                      }
                    />
                    <MetricCard
                      label="건물/지붕면적"
                      value={
                        metrics.buildingFootprintAreaSqm != null && metrics.buildingFootprintAreaSqm > 0
                          ? `${metrics.buildingFootprintAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡`
                          : "확인 필요"
                      }
                    />
                    <MetricCard
                      label="지붕 유효면적"
                      value={
                        layout.diagnostics?.roofUsableAreaSqm != null
                          ? `${layout.diagnostics.roofUsableAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡`
                          : metrics.roofUsableAreaSqm != null
                            ? `${metrics.roofUsableAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡`
                            : "확인 필요"
                      }
                    />
                  </>
                )}
                <MetricCard
                  label="예상 설치용량"
                  value={formatUnifiedCapacityKw(metrics.capacityKw)}
                />
                <MetricCard
                  label="예상 모듈 수"
                  value={`${targetModules.toLocaleString("ko-KR")}장`}
                />
                {placementMismatch && (
                  <MetricCard
                    label="가배치 반영"
                    value={`${placedModules.toLocaleString("ko-KR")}장`}
                  />
                )}
                {installType !== "토지형" &&
                  layout.diagnostics?.roofDualReason != null && (
                    <>
                      <MetricCard
                        label="dualSetCount"
                        value={String(layout.diagnostics.dualSetCount ?? "—")}
                      />
                      <MetricCard
                        label="continuousMaxFill"
                        value={
                          layout.diagnostics.continuousMaxFill != null
                            ? `${layout.diagnostics.continuousMaxFill}장`
                            : "—"
                        }
                      />
                      <MetricCard
                        label="dualMaxFill"
                        value={
                          layout.diagnostics.dualMaxFill != null
                            ? `${layout.diagnostics.dualMaxFill}장`
                            : "—"
                        }
                      />
                      <MetricCard
                        label="dualAisleEffective"
                        value={layout.diagnostics.dualAisleEffective ? "Y" : "N"}
                      />
                      <MetricCard
                        label="appliedDualAisleM"
                        value={
                          layout.diagnostics.appliedDualAisleM != null
                            ? `${layout.diagnostics.appliedDualAisleM}m`
                            : "0m"
                        }
                      />
                      <MetricCard
                        label="roofDualReason"
                        value={layout.diagnostics.roofDualReason}
                      />
                    </>
                  )}
                <MetricCard label="모듈 사양" value={`${moduleLayoutConfig.modulePowerW}W`} />
                <MetricCard
                  label="설치유형"
                  value={formatInstallTypeShortLabel(installType as InstallTypeOption)}
                />
              </div>

              {placementMismatch && (
                <p className="mt-3 text-sm font-medium leading-relaxed text-amber-800">
                  ※ 필지 형상, 이격거리, 음영, 구조물, 인허가 조건에 따라 실제 배치 가능 수량은
                  달라질 수 있습니다.
                </p>
              )}

              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
                ※ {moduleLayoutConfig.disclaimer}
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
