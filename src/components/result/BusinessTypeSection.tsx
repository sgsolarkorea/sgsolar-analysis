import type { BusinessTypeOption } from "@/types/siteReview";
import SectionHeader from "@/components/ui/SectionHeader";

interface BusinessTypeSectionProps {
  options: BusinessTypeOption[];
  recommendation: string;
}

export default function BusinessTypeSection({
  options,
  recommendation,
}: BusinessTypeSectionProps) {
  return (
    <section>
      <SectionHeader
        title="추천 사업 유형"
        description="입력 주소 기준 검토 가능한 태양광 사업 유형입니다."
      />
      <div className="mb-4 rounded-lg border border-navy/20 bg-navy-light px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">현재 입력 주소 기준 추천</p>
        <p className="mt-1 text-sm text-slate-700">{recommendation}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {options.map((opt) => (
          <div key={opt.id} className="card-premium p-5">
            <h3 className="font-bold text-slate-900">{opt.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{opt.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
