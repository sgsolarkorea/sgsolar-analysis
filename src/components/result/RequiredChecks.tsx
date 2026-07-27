"use client";

import { useMemo, useState } from "react";
import type { ReviewStatusItem } from "@/lib/result/reviewStatus";
import { REVIEW_STATUS_MAP } from "@/lib/result/reviewStatus";

const ATTENTION_STATUSES = new Set(["needs_review", "site_check", "insufficient_data"]);

interface RequiredChecksProps {
  items: ReviewStatusItem[];
}

export default function RequiredChecks({ items }: RequiredChecksProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [showMoreAttention, setShowMoreAttention] = useState(false);

  const { primaryAttention, moreAttention, completed } = useMemo(() => {
    const attentionItems = items.filter((item) => ATTENTION_STATUSES.has(item.status));
    const completedItems = items.filter((item) => !ATTENTION_STATUSES.has(item.status));
    return {
      primaryAttention: attentionItems.slice(0, 3),
      moreAttention: attentionItems.slice(3),
      completed: completedItems,
    };
  }, [items]);

  return (
    <section id="required-checks" className="scroll-mt-28" aria-labelledby="required-checks-heading">
      <h2 id="required-checks-heading" className="text-[28px] font-extrabold tracking-tight text-navy sm:text-[32px]">
        사업 진행 전 지금 확인할 사항
      </h2>
      <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
        설치 가능성과 사업성 판단에 영향을 주는 확인 항목입니다.
      </p>

      <div className="mt-8 space-y-0">
        {primaryAttention.length === 0 ? (
          <p className="border-y border-emerald-200/80 py-6 text-[15px] text-emerald-900">
            현재 표시할 추가 확인 항목이 없습니다. 상세 검토는 상담 시 진행합니다.
          </p>
        ) : (
          primaryAttention.map((item, index) => (
            <article key={item.key} className="grid gap-3 border-t border-slate-200 py-6 sm:grid-cols-[72px_1fr]">
              <p className="text-[28px] font-extrabold tabular-nums text-navy/25">
                {String(index + 1).padStart(2, "0")}
              </p>
              <div>
                <h3 className="text-[18px] font-extrabold text-navy">{item.label}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{item.description}</p>
                <p className="mt-2 text-[13px] font-semibold text-slate-500">
                  다음 행동 · {REVIEW_STATUS_MAP[item.status].label}
                </p>
              </div>
            </article>
          ))
        )}
        {moreAttention.length > 0 ? (
          <div className="border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setShowMoreAttention((v) => !v)}
              className="text-sm font-semibold text-navy hover:underline"
            >
              {showMoreAttention ? "추가 확인 항목 접기" : `추가 확인 항목 ${moreAttention.length}개 더 보기`}
            </button>
            {showMoreAttention
              ? moreAttention.map((item, index) => (
                  <article key={item.key} className="mt-4 grid gap-3 sm:grid-cols-[72px_1fr]">
                    <p className="text-[24px] font-extrabold tabular-nums text-navy/20">
                      {String(index + 4).padStart(2, "0")}
                    </p>
                    <div>
                      <h3 className="text-[16px] font-bold text-navy">{item.label}</h3>
                      <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                    </div>
                  </article>
                ))
              : null}
          </div>
        ) : null}
      </div>

      {completed.length > 0 ? (
        <div className="mt-6 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => setShowCompleted((prev) => !prev)}
            className="text-sm font-semibold text-navy hover:underline"
            aria-expanded={showCompleted}
          >
            확인 완료 항목 {completed.length}개 {showCompleted ? "접기" : "보기"}
          </button>
          {showCompleted ? (
            <ul className="mt-4 space-y-3">
              {completed.map((item) => (
                <li key={item.key}>
                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
