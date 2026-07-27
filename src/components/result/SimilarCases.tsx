"use client";

import { useState } from "react";
import Image from "next/image";
import type { RecommendedCaseStudy } from "@/data/caseStudies";
import { MARKETING_NAME } from "@/data/sampleData";
import { resolveInstallVisual } from "@/data/installationVisuals";
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
  cases: RecommendedCaseStudy[];
}

function openLink(url: string | undefined) {
  if (url && url !== "#") {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    alert("시공사례 링크는 준비 중입니다.");
  }
}

function CaseThumbnail({ item }: { item: RecommendedCaseStudy }) {
  const [imageFailed, setImageFailed] = useState(false);
  const gradient = TYPE_GRADIENT[item.installCategory] ?? TYPE_GRADIENT[item.installType] ?? "from-slate-600 to-slate-800";
  const hasPhoto = Boolean(item.thumbnail.src) && !imageFailed;
  const visual = resolveInstallVisual(item.installType);

  if (!hasPhoto) {
    return (
      <div className={`relative aspect-[16/9] overflow-hidden bg-gradient-to-br ${gradient}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={visual.src}
          alt={visual.alt}
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          loading="lazy"
          decoding="async"
        />
        <span className="absolute left-3 top-3 rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-900">
          {item.installCategory}
        </span>
        <span className="absolute right-3 top-3 rounded-md bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white">
          설치 형태 예시
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/9] overflow-hidden">
      <Image
        src={item.thumbnail.src}
        alt={item.thumbnail.alt}
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 33vw"
        onError={() => setImageFailed(true)}
      />
      <span className="absolute left-3 top-3 rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-900">
        {item.installCategory}
      </span>
      <span className="absolute right-3 top-3 rounded-md bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white">
        시공사례
      </span>
    </div>
  );
}

export default function SimilarCases({ cases }: SimilarCasesProps) {
  return (
    <section id="cases" className="scroll-mt-28">
      <SectionHeader
        title="시공 사례"
        description={`${MARKETING_NAME} 유사 유형의 시공사례를 참고용으로 보여드립니다. 용량은 본 입지검토 예상 설치용량과 별개입니다.`}
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cases.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CaseThumbnail item={item} />

            <div className="flex flex-1 flex-col p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {item.regionLabel}
              </p>
              <h4 className="mt-1 text-base font-bold leading-snug text-slate-900">{item.title}</h4>
              <dl className="mt-3 grid gap-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">설치 유형</dt>
                  <dd className="font-medium text-slate-900">{item.installCategory}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">용량</dt>
                  <dd className="font-bold text-navy">{item.capacityLabel}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">특징</dt>
                  <dd className="max-w-[60%] text-right font-medium leading-snug text-slate-900">
                    {item.summary}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => openLink(item.links.blogUrl)}
                className="btn-primary mt-4 h-10 w-full text-sm"
              >
                시공사례 보기
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
