"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { InstallTypeOption } from "@/data/resultUx";
import { buildParcelReviewSummary, parcelToSnapshot } from "@/lib/parcels/aggregate";
import {
  calculateSolarMetrics,
  formatCapacityDisplay,
  formatConstructionDisplay,
  formatGenerationDisplay,
  formatRevenueDisplay,
} from "@/lib/solar/calculate";
import { resolveSiteGeometryFromBundle } from "@/lib/solar/resolveSiteGeometry";
import type { SiteGeometryBundle, SiteGeometryResult } from "@/types/siteGeometry";
import type { ConsultationAnalysisContext } from "@/types/consultation";
import type { ParcelItem } from "@/types/parcelReview";
import type {
  InfoField,
  MonthlyGeneration,
  Profitability,
  SolarMetrics,
} from "@/types/siteReview";

interface ResultMetricsProviderProps {
  landInfo: InfoField[];
  buildingInfo: InfoField[];
  initialInstallType: InstallTypeOption;
  initialMetrics: SolarMetrics;
  initialProfitability: Profitability;
  initialMonthlyGeneration: MonthlyGeneration[];
  initialPrimaryParcel: ParcelItem;
  multiParcelEnabled: boolean;
  siteGeometryBundle?: SiteGeometryBundle;
  searchHistoryId?: string;
  consultationBase: Omit<
    ConsultationAnalysisContext,
    "installType" | "capacity" | "annualGeneration" | "annualRevenue" | "parcelCount" | "totalLandArea" | "parcels"
  >;
  children: ReactNode;
}

interface ResultMetricsContextValue {
  landInfo: InfoField[];
  buildingInfo: InfoField[];
  installType: InstallTypeOption;
  setInstallType: (type: InstallTypeOption) => void;
  metrics: SolarMetrics;
  profitability: Profitability;
  monthlyGeneration: MonthlyGeneration[];
  capacity: string;
  annualGeneration: string;
  annualRevenue: string;
  constructionCost: string;
  consultationContext: ConsultationAnalysisContext;
  multiParcelEnabled: boolean;
  parcels: ParcelItem[];
  parcelSummary: ReturnType<typeof buildParcelReviewSummary>;
  addParcel: (parcel: ParcelItem) => boolean;
  removeParcel: (id: string) => void;
  addParcelsFromCandidates: (candidates: ParcelItem[]) => number;
  primaryParcel: ParcelItem;
  /** 다중 필지 union geometry fetch 완료 여부 */
  multiParcelGeometryReady: boolean;
}

const ResultMetricsContext = createContext<ResultMetricsContextValue | null>(null);

function formatModuleCountDisplay(count: number): string {
  if (count <= 0) return "확인 필요";
  return `약 ${count.toLocaleString("ko-KR")}장`;
}

export function ResultMetricsProvider({
  landInfo,
  buildingInfo,
  initialInstallType,
  initialMetrics,
  initialProfitability,
  initialMonthlyGeneration,
  initialPrimaryParcel,
  multiParcelEnabled,
  siteGeometryBundle,
  searchHistoryId,
  consultationBase,
  children,
}: ResultMetricsProviderProps) {
  const [installType, setInstallTypeState] = useState<InstallTypeOption>(initialInstallType);
  const [parcels, setParcels] = useState<ParcelItem[]>([initialPrimaryParcel]);
  const [multiParcelGeometry, setMultiParcelGeometry] = useState<SiteGeometryResult | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parcelSummary = useMemo(() => buildParcelReviewSummary(parcels), [parcels]);

  const useMultiParcelMetrics =
    multiParcelEnabled && installType === "토지형" && parcelSummary.totalAreaSqm > 0;

  useEffect(() => {
    if (!useMultiParcelMetrics || parcels.length <= 1) {
      setMultiParcelGeometry(null);
      return;
    }

    let cancelled = false;
    void fetch("/api/site-geometry/multi-parcel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parcels: parcels.map((parcel) => ({
          pnu: parcel.pnu,
          lat: parcel.lat,
          lng: parcel.lng,
        })),
        capacityKw: initialMetrics.capacityKw,
        registryLandAreaSqm: parcelSummary.totalAreaSqm,
      }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { geometry?: SiteGeometryResult };
      })
      .then((data) => {
        if (!cancelled) {
          setMultiParcelGeometry(data?.geometry ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setMultiParcelGeometry(null);
      });

    return () => {
      cancelled = true;
    };
  }, [useMultiParcelMetrics, parcels, parcelSummary.totalAreaSqm, initialMetrics.capacityKw]);

  const multiParcelGeometryReady =
    !useMultiParcelMetrics || parcels.length <= 1 || multiParcelGeometry != null;

  const computed = useMemo(() => {
    const shouldUseInitial =
      installType === initialInstallType &&
      parcels.length === 1 &&
      parcels[0]?.id === initialPrimaryParcel.id &&
      !useMultiParcelMetrics &&
      Math.abs(parcelSummary.totalAreaSqm - initialPrimaryParcel.areaSqm) < 0.01;

    if (shouldUseInitial) {
      return {
        metrics: initialMetrics,
        profitability: initialProfitability,
        monthlyGeneration: initialMonthlyGeneration,
      };
    }

    const geometryInput =
      useMultiParcelMetrics && multiParcelGeometry
        ? {
            capacityAreaSqm: multiParcelGeometry.capacityAreaSqm,
            capacityBasis: multiParcelGeometry.capacityBasis,
            displayLandAreaSqm: multiParcelGeometry.landAreaSqm,
            displayUsableAreaSqm: multiParcelGeometry.landUsableAreaSqm,
            parcelCount: parcelSummary.parcelCount,
          }
        : siteGeometryBundle && !useMultiParcelMetrics
        ? (() => {
            const g = resolveSiteGeometryFromBundle(siteGeometryBundle, {
              lat: initialPrimaryParcel.lat,
              lng: initialPrimaryParcel.lng,
              capacityKw: initialMetrics.capacityKw,
              installType,
            });
            return {
              capacityAreaSqm: g.capacityAreaSqm,
              capacityBasis: g.capacityBasis,
              displayLandAreaSqm: g.landAreaSqm,
              displayBuildingFootprintAreaSqm: g.buildingFootprintAreaSqm,
              buildingPolygonCount: g.buildingPolygonCount,
              buildingFootprintAreaSumSqm: g.buildingFootprintAreaSumSqm,
              displayRoofUsableAreaSqm: g.roofUsableAreaSqm,
              displayUsableAreaSqm: g.landUsableAreaSqm ?? g.roofUsableAreaSqm,
              detectedBuildingCount: g.detectedBuildingCount,
              usedBuildingCount: g.usedBuildingCount,
              excludedBuildingCount: g.excludedBuildingCount,
              registryBuildingAreaSqm: g.registryBuildingAreaSqm,
            };
          })()
        : useMultiParcelMetrics
          ? {
              overrideLandAreaSqm: parcelSummary.totalAreaSqm,
              parcelCount: parcelSummary.parcelCount,
            }
          : {};

    const result = calculateSolarMetrics({
      installType,
      landInfo,
      buildingInfo,
      market: initialMetrics.market,
      ...geometryInput,
    });

    return {
      metrics: result.metrics,
      profitability: result.profitability,
      monthlyGeneration: result.monthlyGeneration,
    };
  }, [
    installType,
    initialInstallType,
    initialMetrics,
    initialProfitability,
    initialMonthlyGeneration,
    landInfo,
    buildingInfo,
    parcels,
    initialPrimaryParcel.id,
    useMultiParcelMetrics,
    parcelSummary.totalAreaSqm,
    parcelSummary.parcelCount,
    initialPrimaryParcel.areaSqm,
    siteGeometryBundle,
    initialPrimaryParcel.lat,
    initialPrimaryParcel.lng,
    multiParcelGeometry,
  ]);

  const addParcel = useCallback((parcel: ParcelItem): boolean => {
    let added = false;
    setParcels((prev) => {
      if (prev.some((item) => item.pnu === parcel.pnu && parcel.pnu)) return prev;
      if (prev.some((item) => item.jibunAddress === parcel.jibunAddress && parcel.jibunAddress)) {
        return prev;
      }
      added = true;
      return [...prev, { ...parcel, isPrimary: false }];
    });
    return added;
  }, []);

  const removeParcel = useCallback((id: string) => {
    setParcels((prev) => {
      const target = prev.find((item) => item.id === id);
      if (!target || target.isPrimary) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const addParcelsFromCandidates = useCallback(
    (candidates: ParcelItem[]): number => {
      let count = 0;
      setParcels((prev) => {
        const next = [...prev];
        for (const candidate of candidates) {
          if (next.some((item) => item.pnu === candidate.pnu && candidate.pnu)) continue;
          if (
            next.some(
              (item) => item.jibunAddress === candidate.jibunAddress && candidate.jibunAddress,
            )
          ) {
            continue;
          }
          next.push({ ...candidate, isPrimary: false });
          count += 1;
        }
        return next;
      });
      return count;
    },
    [],
  );

  const setInstallType = useCallback((type: InstallTypeOption) => {
    setInstallTypeState(type);
  }, []);

  const value = useMemo<ResultMetricsContextValue>(() => {
    const { metrics, profitability, monthlyGeneration } = computed;

    return {
      landInfo,
      buildingInfo,
      installType,
      setInstallType,
      metrics,
      profitability,
      monthlyGeneration,
      capacity: formatCapacityDisplay(metrics.capacityKw),
      annualGeneration: formatGenerationDisplay(metrics.annualGenerationKwh),
      annualRevenue: formatRevenueDisplay(metrics.totalRevenueWon),
      constructionCost: formatConstructionDisplay(metrics.constructionCostWon),
      consultationContext: {
        ...consultationBase,
        installType: metrics.installType,
        capacity: formatCapacityDisplay(metrics.capacityKw),
        annualGeneration: formatGenerationDisplay(metrics.annualGenerationKwh),
        annualRevenue: formatRevenueDisplay(metrics.totalRevenueWon),
        parcelCount: parcelSummary.parcelCount,
        totalLandArea: parcelSummary.totalAreaLabel,
        parcels: parcels.map((parcel) => ({
          jibunAddress: parcel.jibunAddress,
          areaLabel: parcel.areaLabel,
          landCategory: parcel.landCategory,
        })),
      },
      multiParcelEnabled,
      parcels,
      parcelSummary,
      addParcel,
      removeParcel,
      addParcelsFromCandidates,
      primaryParcel: initialPrimaryParcel,
      multiParcelGeometryReady,
    };
  }, [
    computed,
    consultationBase,
    installType,
    landInfo,
    buildingInfo,
    setInstallType,
    multiParcelEnabled,
    parcels,
    parcelSummary,
    addParcel,
    removeParcel,
    addParcelsFromCandidates,
    initialPrimaryParcel,
    multiParcelGeometryReady,
  ]);

  useEffect(() => {
    if (!searchHistoryId || !multiParcelEnabled) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      void fetch("/api/search-history/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: searchHistoryId,
          parcels: parcels.map(parcelToSnapshot),
          parcelCount: parcelSummary.parcelCount,
          totalLandArea: parcelSummary.totalAreaLabel,
          capacity: formatCapacityDisplay(value.metrics.capacityKw),
          moduleCount: formatModuleCountDisplay(value.metrics.moduleCount),
          annualGeneration: formatGenerationDisplay(value.metrics.annualGenerationKwh),
          annualRevenue: formatRevenueDisplay(value.metrics.totalRevenueWon),
        }),
      });
    }, 800);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [
    searchHistoryId,
    multiParcelEnabled,
    parcels,
    parcelSummary,
    value.metrics.capacityKw,
    value.metrics.moduleCount,
    value.metrics.annualGenerationKwh,
    value.metrics.totalRevenueWon,
  ]);

  return (
    <ResultMetricsContext.Provider value={value}>{children}</ResultMetricsContext.Provider>
  );
}

export function useResultMetrics(): ResultMetricsContextValue {
  const context = useContext(ResultMetricsContext);
  if (!context) {
    throw new Error("useResultMetrics must be used within ResultMetricsProvider");
  }
  return context;
}
