"use client";

import { useState } from "react";
import Image from "next/image";
import type { RecommendedCaseStudy } from "@/data/caseStudies";
import { MARKETING_NAME } from "@/data/sampleData";
import { resolveInstallVisual } from "@/data/installationVisuals";
import SectionHeader from "@/components/ui/SectionHeader";

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

function resolveCaseImage(item: RecommendedCaseStudy): { src: string; alt: string; actual: boolean } {
  const visual = resolveInstallVisual(item.installCategory || item.installType);
  // Prefer type-matched company-profile visual until dedicated project photos are verified.
  return {
    src: visual.src,
    alt: `${item.installCategory || item.installType} 태양광 설치 형태 예시`,
    actual: false,
  };
}

function CaseImage({
  item,
  priority = false,
  className = "aspect-[16/9]",
}: {
  item: RecommendedCaseStudy;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const image = resolveCaseImage(item);
  const src = failed ? resolveInstallVisual("지붕형").src : image.src;

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      <Image
        src={src}
        alt={image.alt}
        fill
        priority={priority}
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 60vw"
        onError={() => {
          if (process.env.NODE_ENV !== "production") {
            console.warn("case image load failed", item.id, image.src);
          }
          setFailed(true);
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-4 pb-3 pt-10">
        <p className="text-sm font-bold text-white">{item.regionLabel}</p>
        <p className="text-xs text-white/85">
          {item.installCategory} · {item.capacityLabel}
        </p>
      </div>
      <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-xs font-bold text-navy">
        {image.actual ? "시공사례" : "설치 형태 예시"}
      </span>
    </div>
  );
}

export default function SimilarCases({ cases }: SimilarCasesProps) {
  if (!cases.length) return null;
  const [featured, ...rest] = cases;
  const side = rest.slice(0, 2);

  return (
    <section id="cases" className="scroll-mt-28 rounded-3xl bg-slate-50/90 px-4 py-8 sm:px-6 sm:py-10">
      <SectionHeader
        title="시공 / 설치 사례"
        description={`${MARKETING_NAME} 회사소개서 시공 유형 사진을 설치 형태 예시로 함께 보여드립니다. 표시 용량은 본 입지검토 예상 용량과 별개입니다.`}
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <CaseImage item={featured} priority className="aspect-[16/9] lg:aspect-[3/2]" />
          <div className="p-5">
            <h3 className="text-lg font-extrabold text-slate-900">{featured.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{featured.summary}</p>
            <button
              type="button"
              onClick={() => openLink(featured.links.blogUrl)}
              className="btn-primary mt-4 h-11 px-5 text-sm"
            >
              사례 보기
            </button>
          </div>
        </article>

        <div className="grid gap-5">
          {side.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80"
            >
              <CaseImage item={item} className="aspect-[4/3]" />
              <div className="p-4">
                <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                <p className="mt-1 text-sm text-slate-600">
                  {item.installCategory} · {item.capacityLabel}
                </p>
                <button
                  type="button"
                  onClick={() => openLink(item.links.blogUrl)}
                  className="mt-3 text-sm font-semibold text-navy underline-offset-2 hover:underline"
                >
                  사례 보기
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
