import type { SuitabilityItem } from "@/types/siteReview";
import SectionHeader from "@/components/ui/SectionHeader";

const statusConfig = {
  pass: { label: "적합", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  caution: { label: "주의", className: "bg-amber-50 text-amber-800 border-amber-200" },
  fail: { label: "부적합", className: "bg-red-50 text-red-800 border-red-200" },
};

interface SuitabilityReviewProps {
  items: SuitabilityItem[];
}

export default function SuitabilityReview({ items }: SuitabilityReviewProps) {
  return (
    <section>
      <SectionHeader title="적합성 검토" description="6개 항목 기준 입지 적합성 분석입니다." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const config = statusConfig[item.status];
          return (
            <div key={item.label} className="card-premium p-4 sm:p-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-900">{item.label}</span>
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${config.className}`}
                >
                  {config.label}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
