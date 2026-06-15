"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { InstallTypeOption } from "@/data/resultUx";
import {
  calculateSolarMetrics,
  formatCapacityDisplay,
  formatConstructionDisplay,
  formatGenerationDisplay,
  formatRevenueDisplay,
} from "@/lib/solar/calculate";
import type { ConsultationAnalysisContext } from "@/types/consultation";
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
  consultationBase: Omit<
    ConsultationAnalysisContext,
    "installType" | "capacity" | "annualGeneration" | "annualRevenue"
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
}

const ResultMetricsContext = createContext<ResultMetricsContextValue | null>(null);

export function ResultMetricsProvider({
  landInfo,
  buildingInfo,
  initialInstallType,
  initialMetrics,
  initialProfitability,
  initialMonthlyGeneration,
  consultationBase,
  children,
}: ResultMetricsProviderProps) {
  const [installType, setInstallTypeState] = useState<InstallTypeOption>(initialInstallType);

  const computed = useMemo(() => {
    if (installType === initialInstallType) {
      return {
        metrics: initialMetrics,
        profitability: initialProfitability,
        monthlyGeneration: initialMonthlyGeneration,
      };
    }

    const result = calculateSolarMetrics({
      installType,
      landInfo,
      buildingInfo,
      market: initialMetrics.market,
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
  ]);

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
      },
    };
  }, [computed, consultationBase, installType, landInfo, buildingInfo, setInstallType]);

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
