interface ReviewOpinionPanelProps {
  lines: string[];
}

export default function ReviewOpinionPanel({ lines }: ReviewOpinionPanelProps) {
  return (
    <section
      aria-labelledby="review-opinion-heading"
      className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50/80 px-5 py-5 sm:px-6 sm:py-6"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="review-opinion-heading" className="text-[17px] font-bold text-navy sm:text-xl">
            핵심 검토 의견
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-[1.65] text-slate-700 sm:text-[15px]">
            {lines.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-navy/40" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
