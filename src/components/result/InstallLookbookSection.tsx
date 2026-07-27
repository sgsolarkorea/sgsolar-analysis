"use client";

import Image from "next/image";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { resolveInstallVisualSet } from "@/data/installationVisuals";

const SUPPORT_COPY = [
  {
    title: "공장 지붕형",
    blurb: "공장 지붕을 활용해 토지 추가 확보 없이 설치하는 형태입니다.",
  },
  {
    title: "주택 지붕형",
    blurb: "자가소비 및 상계거래를 고려하는 소규모 설치형태입니다.",
  },
  {
    title: "주차장형",
    blurb: "주차공간 상부에 구조물을 설치해 주차와 발전을 함께 활용합니다.",
  },
] as const;

/** FRAME 07 — featured full-width + 3-column supporting. */
export default function InstallLookbookSection({ embedded = false }: { embedded?: boolean }) {
  const { installType } = useResultMetrics();
  const { proofFeatured, proofSupporting } = resolveInstallVisualSet(installType);

  return (
    <div id="cases">
      {!embedded ? (
        <div className="max-w-3xl">
          <h2 className="text-[28px] font-extrabold text-navy sm:text-[32px]">설치 형태 예시</h2>
        </div>
      ) : null}

      <div className="relative mt-6 min-h-[280px] overflow-hidden rounded-[22px] bg-slate-900 sm:min-h-[360px] lg:min-h-[460px]">
        <Image
          src={proofFeatured.src}
          alt={proofFeatured.alt}
          fill
          className="object-cover"
          sizes="100vw"
          loading="lazy"
        />
        <div className="absolute bottom-4 right-4 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-md">
          설치 형태 예시
        </div>
      </div>

      <div className="mt-7 grid gap-6 sm:grid-cols-3 sm:gap-8">
        {proofSupporting.map((visual, index) => {
          const copy = SUPPORT_COPY[index] ?? {
            title: visual.label,
            blurb: "설치 조건에 따라 구조·배치가 달라질 수 있습니다.",
          };
          return (
            <article key={visual.id}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-slate-100">
                <Image
                  src={visual.src}
                  alt={visual.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                  loading="lazy"
                />
              </div>
              <h4 className="mt-4 text-[16px] font-bold text-navy">{copy.title}</h4>
              <p className="mt-1 text-[14px] leading-relaxed text-slate-600">{copy.blurb}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
