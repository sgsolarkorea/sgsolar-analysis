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
    { label: "예상 설치용량", value: profitability.estimatedCapacity ?? "—" },
    { label: "예상 발전량", value: profitability.annualGeneration },
    { label: "SMP 단가", value: profitability.smpPrice ?? "—" },
    { label: "REC 단가", value: profitability.recPrice ?? "—" },
    { label: "REC 가중치", value: profitability.recWeight ?? "—", highlight: true },
    { label: "SMP 수익", value: profitability.smpRevenue },
    { label: "REC 수익", value: profitability.recRevenue },
    { label: "예상 연매출", value: profitability.totalRevenue, highlight: true },
    { label: "예상 연 순수익", value: profitability.annualNetProfit ?? profitability.totalRevenue },
    { label: "예상 시공비", value: profitability.estimatedInstallCost },
    { label: "투자비 회수기간", value: profitability.paybackPeriod },
    { label: "ROI (20년)", value: profitability.roi ?? "—" },
    { label: "IRR (20년)", value: profitability.irr ?? "—" },
    {
      label: "20년 단순 누적매출",
      value: profitability.cumulative20YearRevenue ?? "—",
      highlight: true,
    },
    {
      label: "20년 누적 순수익",
      value: profitability.cumulative20YearNetProfit ?? "—",
      highlight: true,
    },
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
