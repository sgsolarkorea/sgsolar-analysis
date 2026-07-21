import type { ReviewStatusItem } from "@/lib/result/reviewStatus";
import ReviewStatusBadge from "@/components/result/ReviewStatusBadge";

interface ReviewStatusGridProps {
  items: ReviewStatusItem[];
}

export default function ReviewStatusGrid({ items }: ReviewStatusGridProps) {
  return (
    <section aria-labelledby="review-status-heading">
      <h2 id="review-status-heading" className="text-lg font-bold text-slate-900 sm:text-xl">
        검토 상태
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        항목별 1차 검토 상태입니다. 최종 판단은 현장 확인 및 관계기관 검토 후 확정됩니다.
      </p>
      <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex min-h-[64px] flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 sm:text-[15px]">{item.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                {item.description}
              </p>
            </div>
            <div className="shrink-0 self-start sm:self-center">
              <ReviewStatusBadge status={item.status} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
