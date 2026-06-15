import type { OrdinanceItem, OrdinanceStatus } from "@/types/siteReview";
import SectionHeader from "@/components/ui/SectionHeader";

const statusStyle: Record<OrdinanceStatus, string> = {
  "확인 필요": "bg-slate-100 text-slate-800 border-slate-200",
  "상담 필요": "bg-blue-50 text-blue-800 border-blue-200",
  "조건부 가능": "bg-amber-50 text-amber-800 border-amber-200",
};

interface OrdinanceReviewProps {
  items: OrdinanceItem[];
}

export default function OrdinanceReview({ items }: OrdinanceReviewProps) {
  return (
    <section>
      <SectionHeader
        title="조례 및 인허가 검토"
        description="설치 전 확인이 필요한 인허가·조례 항목입니다."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="card-premium p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900">{item.label}</h4>
              <span
                className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold ${statusStyle[item.status]}`}
              >
                {item.status}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
