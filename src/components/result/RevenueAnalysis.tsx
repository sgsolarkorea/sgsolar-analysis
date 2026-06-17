import type { Profitability } from "@/types/siteReview";
import SectionHeader from "@/components/ui/SectionHeader";
import { KpiCard } from "@/components/ui/InfoCard";
import { REVENUE_WARNING } from "@/data/sampleData";
import { MOUNTAIN_REC_WEIGHT_NOTE } from "@/lib/site/mountainLand";

interface RevenueAnalysisProps {
  profitability: Profitability;
  showMountainRecNote?: boolean;
}

export default function RevenueAnalysis({
  profitability,
  showMountainRecNote = false,
}: RevenueAnalysisProps) {
  const cards = [
    { label: "예상 설치용량", value: profitability.estimatedCapacity ?? "—" },
    { label: "예상 발전량", value: profitability.annualGeneration },
    { label: "예상 연매출", value: profitability.totalRevenue },
    { label: "예상 시공비", value: profitability.estimatedInstallCost },
  ];

  return (
    <section id="revenue" className="scroll-mt-24">
      <SectionHeader
        title="수익성 분석"
        description="SMP·REC 시장단가 및 REC 가중치 기준 1차 수익성 검토 결과입니다."
      />
      <div className="card-premium overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-4 sm:divide-y-0">
          {cards.map((card) => (
            <KpiCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 sm:px-6">
          {profitability.recWeight && (
            <p className="text-xs leading-relaxed text-amber-900 sm:text-sm">
              REC 가중치: {profitability.recWeight}
              {profitability.recWeightReason ? ` (${profitability.recWeightReason})` : ""}
              {showMountainRecNote ? ` · ${MOUNTAIN_REC_WEIGHT_NOTE}` : ""}
            </p>
          )}
          <p className={`text-xs leading-relaxed text-amber-900 sm:text-sm ${profitability.recWeight ? "mt-2" : ""}`}>
            ⚠ {REVENUE_WARNING}
          </p>
        </div>
      </div>
    </section>
  );
}
