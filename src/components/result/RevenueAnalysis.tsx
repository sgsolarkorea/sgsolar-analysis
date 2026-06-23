"use client";

import type { Profitability } from "@/types/siteReview";
import SectionHeader from "@/components/ui/SectionHeader";
import { KpiCard } from "@/components/ui/InfoCard";
import { REVENUE_WARNING } from "@/data/sampleData";
import { scrollToSection } from "@/components/layout/ScrollLink";

interface RevenueAnalysisProps {
  profitability: Profitability;
}

export default function RevenueAnalysis({ profitability }: RevenueAnalysisProps) {
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
        description="SMP·REC 시장단가 기준 1차 수익성 검토 결과입니다."
      />
      <p className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium leading-relaxed text-blue-950">
        예상 연매출과 시공비를 기준으로 초기 투자 회수 가능성을 검토한 결과입니다.
      </p>
      <div className="card-premium overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-4 sm:divide-y-0">
          {cards.map((card) => (
            <KpiCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 sm:px-6">
          <p className="text-xs leading-relaxed text-amber-900 sm:text-sm">
            ⚠ {REVENUE_WARNING}
          </p>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-navy/10 bg-navy-light/40 p-5 text-center">
        <p className="text-sm font-medium text-slate-700">
          현재 조건으로 설치 가능성과 견적을 더 구체적으로 확인해 보세요.
        </p>
        <button
          type="button"
          onClick={() => scrollToSection("consultation")}
          className="btn-primary mt-3 h-11 px-6 text-sm font-bold"
        >
          이 조건으로 무료 상담 신청하기
        </button>
      </div>
    </section>
  );
}
