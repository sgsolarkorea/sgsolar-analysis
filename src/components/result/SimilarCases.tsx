"use client";

import type { RecommendedConstructionCase } from "@/types/siteReview";
import { MARKETING_NAME } from "@/data/sampleData";
import SectionHeader from "@/components/ui/SectionHeader";

const TYPE_GRADIENT: Record<string, string> = {
  토지형: "from-emerald-700 to-emerald-900",
  축사형: "from-slate-600 to-slate-800",
  상가형: "from-blue-900 to-navy",
  주택형: "from-amber-700 to-amber-900",
  공장형: "from-slate-700 to-slate-900",
  지붕형: "from-blue-800 to-navy",
};

interface SimilarCasesProps {
  cases: RecommendedConstructionCase[];
}

function openLink(url: string) {
  if (url && url !== "#") {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    alert("시공사례 링크는 준비 중입니다.");
  }
}

export default function SimilarCases({ cases }: SimilarCasesProps) {
  return (
    <section id="cases" className="scroll-mt-24">
      <SectionHeader
        title="유사 시공사례"
        description={`${MARKETING_NAME} 시공사례 중 유사한 유형의 현장을 추천합니다.`}
      />
      <div className="grid gap-5 lg:grid-cols-3">
        {cases.map((item) => (
          <article key={item.title} className="card-premium flex flex-col overflow-hidden">
            <div
              className={`relative flex h-44 items-center justify-center bg-gradient-to-br ${TYPE_GRADIENT[item.type] ?? "from-slate-600 to-slate-800"}`}
              data-image-url={item.imageUrl}
            >
              <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-white/60 bg-black/20 px-6 py-4 text-center">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-semibold text-white">시공사진 Placeholder</span>
                <span className="text-[10px] text-slate-200">실제 사진 연동 예정</span>
              </div>
              <span className="absolute left-3 top-3 rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-900">
                {item.type}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <p className="rounded-lg border border-navy/15 bg-navy-light px-3 py-2 text-xs leading-relaxed text-slate-700">
                {item.recommendReason}
              </p>
              <h4 className="mt-3 text-base font-bold leading-snug text-slate-900">{item.title}</h4>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">지역</dt>
                  <dd className="text-right font-medium text-slate-900">{item.region}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">용량</dt>
                  <dd className="font-bold text-navy">{item.capacity}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">특징</dt>
                  <dd className="text-right font-medium text-slate-900">{item.description}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">준공</dt>
                  <dd className="font-medium text-slate-900">{item.completedAt}</dd>
                </div>
              </dl>

              <div className="mt-auto flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => openLink(item.blogUrl)}
                  className="btn-primary h-10 flex-1 text-sm"
                >
                  시공사례 보기
                </button>
                <button
                  type="button"
                  onClick={() => openLink(item.youtubeUrl)}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  영상 보기
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
