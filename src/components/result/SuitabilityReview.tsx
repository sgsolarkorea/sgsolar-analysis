import type { SuitabilityItem } from "@/types/siteReview";
import SectionHeader from "@/components/ui/SectionHeader";

const defaultStatusConfig = {
  pass: { label: "적합", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  caution: { label: "참고", className: "bg-slate-50 text-slate-700 border-slate-200" },
  fail: { label: "검토", className: "bg-slate-100 text-slate-700 border-slate-300" },
} as const;

const labelStatusOverrides: Record<string, { label: string; className: string }> = {
  "계통 연계": {
    label: "한전 확인 필요",
    className: "bg-slate-50 text-slate-700 border-slate-200",
  },
  "규제·인허가": {
    label: "검토 필요",
    className: "bg-slate-50 text-slate-700 border-slate-200",
  },
  "수익성 참고": {
    label: "수익성 참고",
    className: "bg-blue-50 text-blue-800 border-blue-100",
  },
};

function getStatusDisplay(item: SuitabilityItem) {
  return labelStatusOverrides[item.label] ?? defaultStatusConfig[item.status];
}

interface SuitabilityReviewProps {
  items: SuitabilityItem[];
}

export default function SuitabilityReview({ items }: SuitabilityReviewProps) {
  return (
    <section>
      <SectionHeader title="적합성 검토" description="6개 항목 기준 입지 적합성 분석입니다." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const config = getStatusDisplay(item);
          return (
            <div key={item.label} className="card-premium p-4 sm:p-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-900">{item.label}</span>
                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold ${config.className}`}
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
