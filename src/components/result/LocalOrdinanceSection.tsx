import type { LocalOrdinanceReview } from "@/types/regulatoryReview";
import SectionHeader from "@/components/ui/SectionHeader";

interface LocalOrdinanceSectionProps {
  review: LocalOrdinanceReview;
}

export default function LocalOrdinanceSection({ review }: LocalOrdinanceSectionProps) {
  return (
    <section id="local-ordinance" className="scroll-mt-24">
      <SectionHeader
        title="법·조례 검토"
        description="해당 지역 조례 및 태양광 발전시설 허가기준을 참고용으로 정리했습니다."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-premium p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-light text-navy">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">적용 조례</p>
              <h3 className="mt-1 text-base font-bold text-slate-900">{review.ordinanceTitle}</h3>
              {review.appendixTitle && (
                <p className="mt-2 text-sm text-slate-700">{review.appendixTitle}</p>
              )}
              {review.ordinanceUrl ? (
                <a
                  href={review.ordinanceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-navy hover:underline"
                >
                  조례 원문 확인
                </a>
              ) : (
                <p className="mt-3 text-sm font-medium text-slate-600">조례 확인 필요</p>
              )}
            </div>
          </div>

          <ul className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-100">
            {review.distanceRules.map((rule) => (
              <li key={rule.label} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-slate-600">{rule.label}</span>
                <span className="text-sm font-semibold text-slate-900">{rule.distance}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-premium flex flex-col p-5 sm:p-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">관련 조항</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-900">
              {review.relatedLaw}
            </p>
            {(review.promulgatedDate || review.enforcedDate) && (
              <p className="mt-3 text-xs text-slate-600">
                {review.promulgatedDate && `공포: ${review.promulgatedDate}`}
                {review.promulgatedDate && review.enforcedDate && " · "}
                {review.enforcedDate && `시행: ${review.enforcedDate}`}
              </p>
            )}
          </div>

          {review.statusNote && (
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{review.statusNote}</p>
          )}

          {review.appendixUrl && (
            <a
              href={review.appendixUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto pt-4 text-sm font-semibold text-navy hover:underline"
            >
              별표 조회 →
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
