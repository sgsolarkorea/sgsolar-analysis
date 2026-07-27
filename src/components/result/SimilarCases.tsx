"use client";

import { useState } from "react";
import Image from "next/image";
import type { RecommendedCaseStudy } from "@/data/caseStudies";
import { resolveInstallVisual } from "@/data/installationVisuals";

interface SimilarCasesProps {
  cases: RecommendedCaseStudy[];
}

const TYPE_BLURBS: Record<string, { blurb: string; points: string[] }> = {
  주택형: {
    blurb: "주택 지붕의 유휴공간을 활용하는 형태입니다.",
    points: ["자가소비·상계거래에 적합", "지붕 방향·음영 검토 필요", "소규모 설치에 유리"],
  },
  공장형: {
    blurb: "공장·창고 지붕의 넓은 유휴공간을 활용하는 형태입니다.",
    points: ["생산시설 지붕 활용", "토지 추가 확보 최소화", "건축물 구조 검토 필요"],
  },
  축사형: {
    blurb: "축사·농업시설 지붕을 활용하는 형태입니다.",
    points: ["농업시설 지붕 활용", "구조·방수 검토 필요", "사업유형에 따라 인허가 상이"],
  },
  토지형: {
    blurb: "나대지·농지 등 토지에 구조물을 설치하는 형태입니다.",
    points: ["개발행위·이격거리 검토", "계통·선로 용량 확인", "지형·진입로 현장 확인"],
  },
};

function resolveCaseImage(item: RecommendedCaseStudy): { src: string; alt: string } {
  const visual = resolveInstallVisual(item.installCategory || item.installType);
  return {
    src: visual.src,
    alt: `${item.installCategory || item.installType} 태양광 설치 형태 예시`,
  };
}

function typeContent(item: RecommendedCaseStudy) {
  const key = item.installCategory || item.installType;
  return (
    TYPE_BLURBS[key] || {
      blurb: "부지와 건축물 조건에 따라 적용 가능한 구조와 배치는 달라질 수 있습니다.",
      points: ["설치 유형별 구조 검토", "현장 음영·하중 확인", "인허가·계통 절차 확인"],
    }
  );
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
      <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-xs font-bold text-navy">
        설치 형태 예시
      </span>
    </div>
  );
}

export default function SimilarCases({ cases }: SimilarCasesProps) {
  if (!cases.length) return null;
  const [featured, ...rest] = cases;
  const side = rest.slice(0, 2);
  const featuredContent = typeContent(featured);

  return (
    <section id="cases" className="scroll-mt-28" aria-labelledby="cases-heading">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Installation Reference</p>
        <h2 id="cases-heading" className="mt-2 text-[28px] font-extrabold text-navy sm:text-[30px]">
          비슷한 설치 형태를 미리 확인해보세요
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
          부지와 건축물 조건에 따라 적용 가능한 구조와 배치는 달라질 수 있습니다. 아래는 설치 형태
          예시이며, 특정 시공현장의 용량·지역을 의미하지 않습니다.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-stretch">
        <article className="overflow-hidden">
          <CaseImage item={featured} priority className="aspect-[16/9]" />
          <div className="mt-4">
            <p className="text-sm font-semibold text-sky-700">
              {featured.installCategory || featured.installType}
            </p>
            <h3 className="mt-1 text-xl font-extrabold text-navy">{featured.title}</h3>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">
              {featuredContent.blurb}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {featuredContent.points.map((point) => (
                <li key={point}>· {point}</li>
              ))}
            </ul>
          </div>
        </article>

        <div className="grid gap-6">
          {side.map((item) => {
            const content = typeContent(item);
            return (
              <article key={item.id} className="overflow-hidden">
                <CaseImage item={item} className="aspect-[4/3]" />
                <div className="mt-3">
                  <h4 className="text-base font-bold text-navy">{item.title}</h4>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.installCategory || item.installType}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{content.blurb}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
