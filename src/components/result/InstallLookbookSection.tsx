"use client";

import Image from "next/image";
import { INSTALL_LOOKBOOK } from "@/data/installLookbook";
import {
  type InstallVisualType,
  resolveInstallVisual,
  resolveInstallVisualForLookbook,
} from "@/data/installationVisuals";
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
  const { installType, siteAddress } = useResultMetrics();
  const featuredId = featuredIdForInstallType(installType);
  const featuredCopy =
    INSTALL_LOOKBOOK.find((item) => item.id === featuredId) ??
    INSTALL_LOOKBOOK.find((item) => item.featured) ??
    INSTALL_LOOKBOOK[0];
  const technicalVisual = resolveInstallVisual(installType, {
    usage: "technical",
    seed: `${siteAddress}:${installType}:technical`,
  });
  const featuredVisual = resolveInstallVisualForLookbook(featuredCopy.visualKey, {
    usage: "proof_featured",
    seed: `${siteAddress}:${installType}:proof-featured`,
    excludeSrcs: [technicalVisual.src],
  });

  const supportingTypesBase: InstallVisualType[] = ["factory", "warehouse", "residential", "carport", "ground"];
  const supportingTypes = supportingTypesBase.filter((type) => type !== featuredCopy.visualKey).slice(0, 3);
  const titleMap: Record<InstallVisualType, string> = {
    ground: "토지형 태양광",
    factory: "공장 지붕형",
    warehouse: "창고 지붕형",
    residential: "주택·상계형",
    carport: "주차장형",
    building: "건축물 지붕형",
  };
  const blurbMap: Record<InstallVisualType, string> = {
    ground: "유휴부지에 구조물을 설치해 발전설비를 구성하는 형태입니다.",
    factory: "공장 지붕을 활용해 토지 추가 확보 없이 설치하는 형태입니다.",
    warehouse: "창고 지붕의 넓은 면적을 활용해 설치하는 형태입니다.",
    residential: "자가소비 및 상계거래를 고려하는 소규모 설치형태입니다.",
    carport: "주차공간 상부에 구조물을 설치해 주차와 발전을 함께 활용합니다.",
    building: "건축물 지붕 여건에 맞춰 배치·구조 검토 후 설치합니다.",
  };
  const supporting = supportingTypes.map((type, index) => {
    const visual = resolveInstallVisualForLookbook(type, {
      usage: "proof_supporting",
      seed: `${siteAddress}:${installType}:support-${type}`,
      excludeSrcs: [technicalVisual.src, featuredVisual.src],
    });
    return {
      key: `${type}-${index}`,
      title: titleMap[type],
      blurb: blurbMap[type],
      visual,
    };
  });

  return (
    <div id="cases">
      {!embedded ? (
        <div className="max-w-3xl">
          <h2 className="text-[28px] font-extrabold text-navy sm:text-[32px]">설치 형태 예시</h2>
        </div>
      ) : (
        <h3 className="text-[22px] font-extrabold text-navy sm:text-[24px]">설치 형태 예시</h3>
      )}

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
        <article>
          <div className="relative min-h-[320px] overflow-hidden bg-slate-900 sm:min-h-[380px] lg:min-h-[520px]">
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
              <p className="mt-1 text-[30px] font-extrabold text-white sm:text-[34px]">{featuredCopy.title}</p>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-slate-600">{featuredCopy.blurb}</p>
        </article>

        <div className="grid gap-5 content-start">
          {supporting.map((item) => {
            return (
              <article key={item.key} className="grid grid-cols-[110px_1fr] items-start gap-4 sm:grid-cols-[130px_1fr]">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <Image
                    src={item.visual.src}
                    alt={item.visual.alt}
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
