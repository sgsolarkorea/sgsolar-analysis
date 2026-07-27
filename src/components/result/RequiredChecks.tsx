"use client";

import { useMemo, useState } from "react";
import type { ReviewStatusItem } from "@/lib/result/reviewStatus";
import { REVIEW_STATUS_MAP } from "@/lib/result/reviewStatus";
import ReviewStatusBadge from "@/components/result/ReviewStatusBadge";

const ATTENTION_STATUSES = new Set(["needs_review", "site_check", "insufficient_data"]);

interface RequiredChecksProps {
  items: ReviewStatusItem[];
}

export default function RequiredChecks({ items }: RequiredChecksProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  const { attention, completed, summary } = useMemo(() => {
    const attentionItems = items.filter((item) => ATTENTION_STATUSES.has(item.status));
    const completedItems = items.filter((item) => !ATTENTION_STATUSES.has(item.status));
    const counts = {
      confirmed: items.filter((i) => i.status === "confirmed" || i.status === "reviewable" || i.status === "not_applicable")
        .length,
      needsReview: items.filter((i) => i.status === "needs_review" || i.status === "insufficient_data").length,
      siteCheck: items.filter((i) => i.status === "site_check").length,
    };
    return { attention: attentionItems, completed: completedItems, summary: counts };
  }, [items]);

  return (
    <section id="required-checks" className="scroll-mt-24" aria-labelledby="required-checks-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="required-checks-heading" className="text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">
            추가 확인 사항
          </h2>
          <p className="mt-2 text-[15px] text-slate-600">
            확인이 필요한 항목을 우선 표시합니다. 최종 판단은 현장·관계기관 검토 후 확정됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800">
            확인 완료 {summary.confirmed}
          </span>
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-900">
            추가 확인 {summary.needsReview}
          </span>
          <span className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-orange-800">
            현장 확인 {summary.siteCheck}
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-bold text-slate-800">확인이 필요한 항목</h3>
        {attention.length === 0 ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            현재 표시할 추가 확인 항목이 없습니다. 상세 검토는 상담 시 진행합니다.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {attention.map((item) => (
              <li
                key={item.key}
                className="flex min-h-[60px] flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
                </div>
                <ReviewStatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {completed.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowCompleted((prev) => !prev)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:underline"
            aria-expanded={showCompleted}
          >
            확인 완료 항목 {completed.length}개 {showCompleted ? "접기" : "보기"}
            <span aria-hidden>{showCompleted ? "▲" : "▼"}</span>
          </button>
          {showCompleted ? (
            <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {completed.map((item) => (
                <li
                  key={item.key}
                  className="flex min-h-[52px] flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{item.description}</p>
                  </div>
                  <span className={`text-xs font-semibold ${REVIEW_STATUS_MAP[item.status].foreground}`}>
                    {REVIEW_STATUS_MAP[item.status].label}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
