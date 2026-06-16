"use client";

import { useState } from "react";
import type { MunicipalityOrdinanceData, OrdinanceArticle } from "@/types/regulatoryReview";
import SectionHeader from "@/components/ui/SectionHeader";

interface LocalOrdinanceSectionProps {
  review: MunicipalityOrdinanceData;
}

function OrdinanceArticleCard({ article }: { article: OrdinanceArticle }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-navy">조례명</p>
          <h4 className="mt-1 text-base font-bold text-slate-900">{article.title}</h4>
          {article.summary && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{article.summary}</p>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2.5 font-semibold">항목</th>
              <th className="px-3 py-2.5 font-semibold">기준</th>
              <th className="px-3 py-2.5 font-semibold">요약</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {article.items.map((item) => (
              <tr key={item.label}>
                <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">
                  {item.label}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                  {item.distance ?? "—"}
                </td>
                <td className="px-3 py-3 text-slate-700">{item.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {article.originalText && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="text-sm font-semibold text-navy hover:underline"
          >
            {expanded ? "조례 원문 접기" : "조례 원문 펼치기"}
          </button>
          {expanded && (
            <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
              {article.originalText}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function LocalOrdinanceSection({ review }: LocalOrdinanceSectionProps) {
  return (
    <section id="local-ordinance" className="scroll-mt-24">
      <SectionHeader
        title="법·조례 검토"
        description="해당 지자체 조례 및 태양광 발전시설 허가기준을 요약했습니다."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-premium p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {review.municipalityLabel}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{review.ordinanceTitle}</h3>
          {review.appendixTitle && (
            <p className="mt-2 text-sm text-slate-700">{review.appendixTitle}</p>
          )}

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
            <p className="text-xs font-semibold text-slate-500">관련 법령</p>
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

          {review.ordinanceUrl ? (
            <a
              href={review.ordinanceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto pt-4 text-sm font-semibold text-navy hover:underline"
            >
              조례 원문 확인 →
            </a>
          ) : (
            <p className="mt-auto pt-4 text-sm font-medium text-slate-600">조례 확인 필요</p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {review.articles.map((article) => (
          <OrdinanceArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
