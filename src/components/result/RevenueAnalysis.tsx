import type { Profitability } from "@/types/siteReview";
import SectionHeader from "@/components/ui/SectionHeader";
import { disclaimer as solarDisclaimer } from "@/data/solarConfig";

interface RevenueAnalysisProps {
  profitability: Profitability;
  disclaimer: string;
  revenueWarning: string;
}

export default function RevenueAnalysis({
  profitability,
  disclaimer,
  revenueWarning,
}: RevenueAnalysisProps) {
  const rows = [
    { label: "SMP 단가", value: profitability.smpPrice ?? "—" },
    { label: "SMP 기준일", value: profitability.smpDate ?? "—" },
    { label: "REC 단가", value: profitability.recPrice ?? "—" },
    { label: "REC 기준일", value: profitability.recDate ?? "—" },
    { label: "데이터 출처", value: profitability.marketSource ?? "—" },
    {
      label: "Fallback 사용",
      value: profitability.marketFallback ? "예 (설정값)" : "아니오 (실시간)",
    },
    { label: "REC 가중치", value: profitability.recWeight ?? "—", highlight: true },
    { label: "REC 가중치 사유", value: profitability.recWeightReason ?? "—" },
    { label: "예상 설치비", value: profitability.estimatedInstallCost },
    { label: "시공 단가", value: profitability.constructionCostPerKw ?? "—" },
    { label: "예상 연간 발전량", value: profitability.annualGeneration },
    { label: "예상 SMP 수익", value: profitability.smpRevenue },
    { label: "예상 REC 수익", value: profitability.recRevenue },
    { label: "예상 총수익 (연)", value: profitability.totalRevenue, highlight: true },
    {
      label: "예상 20년 누적매출",
      value: profitability.cumulative20YearRevenue ?? "—",
      highlight: true,
    },
    { label: "단순 회수기간", value: profitability.paybackPeriod, highlight: true },
  ];

  return (
    <section id="revenue" className="scroll-mt-24">
      <SectionHeader
        title="수익성 분석"
        description="SMP·REC 시장단가 및 REC 가중치 기준 1차 수익성 검토 결과입니다."
      />
      <div className="card-premium overflow-hidden">
        <div className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div
              key={row.label}
              className={`flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-3.5 ${
                row.highlight ? "bg-navy-light/50" : ""
              }`}
            >
              <span className="text-sm text-slate-600">{row.label}</span>
              <span
                className={`text-sm sm:text-right ${
                  row.highlight ? "font-bold text-navy" : "font-semibold text-slate-900"
                }`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-amber-200 bg-amber-50 px-5 py-3 sm:px-6">
          <p className="text-xs leading-relaxed text-amber-900 sm:text-sm">
            ⚠ {solarDisclaimer.market}
          </p>
          {profitability.separateWorkNote && (
            <p className="text-xs leading-relaxed text-amber-900 sm:text-sm">
              ⚠ {profitability.separateWorkNote}
            </p>
          )}
          <p className="text-xs leading-relaxed text-amber-900 sm:text-sm">⚠ {disclaimer}</p>
          <p className="text-xs leading-relaxed text-amber-900 sm:text-sm">⚠ {revenueWarning}</p>
        </div>
      </div>
    </section>
  );
}
