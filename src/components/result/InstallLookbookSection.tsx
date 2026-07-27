"use client";

import Image from "next/image";
import { INSTALL_LOOKBOOK } from "@/data/installLookbook";
import { getInstallVisualOrFallback } from "@/data/installationVisuals";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";

function featuredIdForInstallType(installType: string): string {
  if (installType.includes("주차")) return "carport";
  if (installType.includes("상계") || installType.includes("가정") || installType.includes("주택")) {
    return "residential";
  }
  if (installType.includes("토지")) return "ground";
  if (installType.includes("지붕") || installType.includes("공장") || installType.includes("창고")) {
    return "factory";
  }
  return "ground";
}

export default function InstallLookbookSection({ embedded = false }: { embedded?: boolean }) {
  const { installType } = useResultMetrics();
  const featuredId = featuredIdForInstallType(installType);
  const featured =
    INSTALL_LOOKBOOK.find((item) => item.id === featuredId) ??
    INSTALL_LOOKBOOK.find((item) => item.featured) ??
    INSTALL_LOOKBOOK[0];
  const supporting = INSTALL_LOOKBOOK.filter((item) => item.id !== featured.id).slice(0, 3);
  const featuredVisual = getInstallVisualOrFallback(featured.visualKey);

  return (
    <div id="cases">
      {!embedded ? (
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Installation Types</p>
          <h2 className="mt-2 text-[28px] font-extrabold text-navy sm:text-[32px]">설치 형태 예시</h2>
        </div>
      ) : null}

      <div className={`${embedded ? "" : "mt-10 "}grid gap-8 lg:grid-cols-[1.7fr_1fr]`}>
        <article>
          <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
            <Image
              src={featuredVisual.src}
              alt={featuredVisual.alt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 62vw"
              loading="lazy"
            />
            <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-xs font-bold text-navy">
              현재 분석과 동일 유형
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

        <div className="grid gap-6 content-start">
          {supporting.map((item) => {
            const visual = getInstallVisualOrFallback(item.visualKey);
            return (
              <article key={item.id} className="grid grid-cols-[1fr_1.15fr] items-center gap-3 sm:gap-4">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <Image
                    src={visual.src}
                    alt={visual.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 40vw, 18vw"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-navy">{item.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.blurb}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
