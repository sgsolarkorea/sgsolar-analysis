"use client";

import Image from "next/image";
import { INSTALL_LOOKBOOK } from "@/data/installLookbook";
import { getInstallVisualOrFallback } from "@/data/installationVisuals";

export default function InstallLookbookSection() {
  const featured = INSTALL_LOOKBOOK.find((item) => item.featured) ?? INSTALL_LOOKBOOK[0];
  const supporting = INSTALL_LOOKBOOK.filter((item) => item.id !== featured.id).slice(0, 3);
  const featuredVisual = getInstallVisualOrFallback(featured.visualKey);

  return (
    <section id="cases" className="scroll-mt-28" aria-labelledby="lookbook-heading">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Installation Lookbook</p>
        <h2 id="lookbook-heading" className="mt-2 text-[28px] font-extrabold text-navy sm:text-[32px]">
          비슷한 설치 형태를 미리 확인해보세요
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
          부지와 건축물 조건에 따라 적용 가능한 구조와 배치는 달라질 수 있습니다. 아래는 설치 형태
          예시이며, 특정 시공현장의 용량·지역을 의미하지 않습니다.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        <article>
          <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
            <Image
              src={featuredVisual.src}
              alt={featuredVisual.alt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 62vw"
              priority
            />
            <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-xs font-bold text-navy">
              설치 형태 예시
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-navy">{featured.title}</h3>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">{featured.blurb}</p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {featured.points.map((point) => (
                <li key={point}>· {point}</li>
              ))}
            </ul>
          </div>
        </article>

        <div className="grid gap-6">
          {supporting.map((item) => {
            const visual = getInstallVisualOrFallback(item.visualKey);
            return (
              <article key={item.id} className="grid grid-cols-[1fr_1.1fr] gap-3 sm:gap-4">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <Image
                    src={visual.src}
                    alt={visual.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 40vw, 18vw"
                  />
                </div>
                <div className="flex min-w-0 flex-col justify-center">
                  <p className="text-xs font-bold text-sky-700">설치 형태 예시</p>
                  <h4 className="mt-1 text-base font-bold text-navy">{item.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.blurb}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
