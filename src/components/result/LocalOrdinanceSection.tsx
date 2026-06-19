"use client";

import { useState } from "react";
import type { MunicipalityOrdinanceData, OrdinanceArticle } from "@/types/regulatoryReview";
import type { OrdinanceLoadMeta } from "@/types/ordinanceLearning";
import { ORDINANCE_DISPLAY_LABELS } from "@/types/ordinanceLearning";
import SectionHeader from "@/components/ui/SectionHeader";

interface LocalOrdinanceSectionProps {
  review: MunicipalityOrdinanceData | null;
  meta: OrdinanceLoadMeta;
}

function formatReviewDate(iso?: string): string {
  if (!iso) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(iso))
    .replace(/\./g, "-")
    .replace(/\s/g, "")
    .replace(/-$/, "");
}

function DisplayStatusBadge({ meta }: { meta: OrdinanceLoadMeta }) {
  const styles = {
    verified: "bg-emerald-50 text-emerald-800 border-emerald-200",
    ai_draft: "bg-violet-50 text-violet-800 border-violet-200",
    preparing: "bg-amber-50 text-amber-900 border-amber-200",
    default_template: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${styles[meta.displayStatus]}`}
    >
      {ORDINANCE_DISPLAY_LABELS[meta.displayStatus]}
    </span>
  );
}

function OrdinanceArticleCard({ article }: { article: OrdinanceArticle }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div>
        <p className="text-xs font-semibold text-navy">조례명</p>
        <h4 className="mt-1 text-base font-bold text-slate-900">{article.title}</h4>
        {article.summary && (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{article.summary}</p>
        )}
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

function OrdinancePreparingPanel({ meta }: { meta: OrdinanceLoadMeta }) {
  return (
    <div className="card-premium p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <DisplayStatusBadge meta={meta} />
        <span className="text-sm font-semibold text-slate-900">{meta.municipalityLabel}</span>
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-900">지자체 조례 기준 상세 검토가 필요합니다.</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        해당 지역({meta.municipalityLabel}) 조례 세부 기준은 상담 시 확인합니다. 아래 이격거리
        검토와 기본 법령 정보를 참고해 주세요.
      </p>
      <p className="mt-4 text-sm font-medium text-slate-500">
        {meta.status === "review"
          ? "관리자 검토 후 조례 요약이 업데이트됩니다."
          : "상담 시 조례 세부 기준을 함께 검토합니다."}
      </p>
    </div>
  );
}

export default function LocalOrdinanceSection({ review, meta }: LocalOrdinanceSectionProps) {
  if (meta.isPreparing || !review) {
    return (
      <section id="local-ordinance" className="scroll-mt-24">
        <SectionHeader
          title="법·조례 검토"
          description="해당 지자체 조례 및 태양광 발전시설 허가기준을 요약합니다."
        />
        <OrdinancePreparingPanel meta={meta} />
      </section>
    );
  }

  return (
    <section id="local-ordinance" className="scroll-mt-24">
      <SectionHeader
        title="법·조례 검토"
        description="해당 지자체 조례 및 태양광 발전시설 허가기준을 요약했습니다."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <DisplayStatusBadge meta={meta} />
        <div className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">{review.municipalityLabel}</span>
          {meta.reviewedAt && (
            <span className="ml-2 text-slate-600">
              최종 검토일 {formatReviewDate(meta.reviewedAt)}
              {meta.version ? ` · v${meta.version}` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-premium p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">출처</p>
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
