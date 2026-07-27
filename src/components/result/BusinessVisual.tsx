"use client";

import MonthlyGenerationChart from "@/components/result/MonthlyGenerationChart";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";

/** Compact business visual placed near the top of results (uses real monthly data). */
export default function BusinessVisual() {
  const { monthlyGeneration, metrics } = useResultMetrics();

  if (!monthlyGeneration?.length) return null;

  return (
    <div id="business-visual" className="scroll-mt-24">
      <MonthlyGenerationChart
        data={monthlyGeneration}
        annualTotalKwh={metrics.annualGenerationKwh}
        capacityKw={metrics.capacityKw}
      />
    </div>
  );
}
