"use client";

import { useState, type ReactNode } from "react";

interface DetailAnalysisAccordionProps {
  children: ReactNode;
}

/** Detail analysis starts collapsed so the story flow stays above-the-fold. */
export default function DetailAnalysisAccordion({ children }: DetailAnalysisAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section id="detail-analysis" className="scroll-mt-28 border-t border-slate-200 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-extrabold tracking-tight text-navy sm:text-[28px]">
            상세 분석
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
            설치용량·토지·건축·조례 등 산정 근거와 세부 검토 자료입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          aria-expanded={open}
        >
          {open ? "상세 정보 접기" : "상세 정보 보기"}
        </button>
      </div>
      {open ? <div className="mt-8 space-y-8">{children}</div> : null}
    </section>
  );
}
