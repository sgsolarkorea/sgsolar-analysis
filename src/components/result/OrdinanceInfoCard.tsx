import type { OrdinanceDisplayCard } from "@/types/regulatoryReview";

interface OrdinanceInfoCardProps {
  card: OrdinanceDisplayCard;
}

function SourceLink({ card }: { card: OrdinanceDisplayCard }) {
  if (!card.sourceUrl) {
    return (
      <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-500">
        원문 링크 확인 중
      </span>
    );
  }

  return (
    <a
      href={card.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-navy/20 bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90"
    >
      원문 보기
      <span aria-hidden className="text-xs opacity-80">
        ↗
      </span>
    </a>
  );
}

export default function OrdinanceInfoCard({ card }: OrdinanceInfoCardProps) {
  return (
    <article className="card-premium overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-5 py-4 sm:px-6 sm:py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">출처</p>
        <h3 className="mt-1 text-lg font-bold leading-snug text-slate-900">{card.ordinanceName}</h3>
        <p className="mt-2 text-base font-semibold text-navy">{card.articleTitle}</p>
        {card.appendixTitle && card.appendixTitle !== card.articleTitle && (
          <p className="mt-1 text-sm text-slate-600">{card.appendixTitle}</p>
        )}
      </div>

      <div className="px-5 py-4 sm:px-6 sm:py-5">
        {card.showDistances && card.summaryBullets.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              핵심 요약
            </p>
            <ul className="mt-3 space-y-2">
              {card.summaryBullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-2 text-sm leading-relaxed text-slate-800"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-navy" aria-hidden />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-slate-600">
            세부 이격거리는 조례 원문 및 인허가 검토 후 안내됩니다.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            원문 출처: <span className="font-medium text-slate-700">{card.sourceOriginLabel}</span>
          </p>
          <SourceLink card={card} />
        </div>
      </div>
    </article>
  );
}
