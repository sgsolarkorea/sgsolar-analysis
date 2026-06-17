import SectionHeader from "@/components/ui/SectionHeader";
import { KpiCard } from "@/components/ui/InfoCard";
import { formatUnifiedCapacityKw } from "@/lib/solar/capacityResolution";
import {
  formatHouseholdMonthlySavings,
  HOUSEHOLD_SAVINGS_DISCLAIMER,
  HOUSEHOLD_SAVINGS_PER_KW,
} from "@/lib/solar/householdSavings";

interface HouseholdSavingsAnalysisProps {
  capacityKw: number;
}

export default function HouseholdSavingsAnalysis({ capacityKw }: HouseholdSavingsAnalysisProps) {
  const monthlySavings = formatHouseholdMonthlySavings(capacityKw);

  const cards = [
    { label: "예상 설치용량", value: formatUnifiedCapacityKw(capacityKw) },
    { label: "월 예상 절감액", value: monthlySavings },
    { label: "절감 기준", value: `kW당 ${HOUSEHOLD_SAVINGS_PER_KW.toLocaleString("ko-KR")}원/월` },
    { label: "참고 (3·6·9kW)", value: "약 5·10·15만원/월" },
  ];

  return (
    <section id="revenue" className="scroll-mt-24">
      <SectionHeader
        title="전기요금 절감 안내"
        description="상계거래(가정용) 기준 월 예상 전기요금 절감 효과입니다."
      />
      <div className="card-premium overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-4 sm:divide-y-0">
          {cards.map((card) => (
            <KpiCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 sm:px-6">
          <p className="text-xs leading-relaxed text-amber-900 sm:text-sm">
            ⚠ {HOUSEHOLD_SAVINGS_DISCLAIMER}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-amber-900 sm:text-sm">
            월 예상 절감액 ≈ 설치용량(kW) × {HOUSEHOLD_SAVINGS_PER_KW.toLocaleString("ko-KR")}원
          </p>
        </div>
      </div>
    </section>
  );
}
