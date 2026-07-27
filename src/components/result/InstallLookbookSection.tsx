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

/** FRAME 07 hero — editorial installation photography. */
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
          <h2 className="text-[28px] font-extrabold text-navy sm:text-[32px]">설치 형태 예시</h2>
        </div>
      ) : (
        <h3 className="text-[22px] font-extrabold text-navy sm:text-[24px]">설치 형태 예시</h3>
      )}

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.65fr_1fr] lg:gap-12">
        <article>
          <div className="relative min-h-[280px] overflow-hidden bg-slate-900 sm:min-h-[360px] lg:min-h-[480px]">
            <Image
              src={featuredVisual.src}
              alt={featuredVisual.alt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 62vw"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pb-6 pt-20 sm:px-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-200">
                설치 형태 예시 · 현재 분석 유형
              </p>
              <p className="mt-1 text-[28px] font-extrabold text-white sm:text-[32px]">{featured.title}</p>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600">{featured.blurb}</p>
        </article>

        <div className="grid gap-5 content-start">
          {supporting.map((item) => {
            const visual = getInstallVisualOrFallback(item.visualKey);
            return (
              <article key={item.id} className="grid grid-cols-[110px_1fr] items-start gap-4 sm:grid-cols-[130px_1fr]">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <Image
                    src={visual.src}
                    alt={visual.alt}
                    fill
                    className="object-cover"
                    sizes="130px"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h4 className="text-[15px] font-bold text-navy">{item.title}</h4>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{item.blurb}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
