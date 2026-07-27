"use client";

import Image from "next/image";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { resolveInstallVisual } from "@/data/installationVisuals";

const REVIEW_POINTS_BY_TYPE: Record<string, string[]> = {
  지붕형: ["지붕 구조·하중 검토", "음영·안전거리·방수", "건축물 대장·현장 확인"],
  토지형: ["지형·지반·진입로", "개발행위·이격거리", "한전 계통 접속 용량"],
  "상계거래(가정용)": ["지붕 방향·음영", "한전 상계 접수", "실제 전기사용량"],
};

function reviewPointsFor(installType: string): string[] {
  if (REVIEW_POINTS_BY_TYPE[installType]) return REVIEW_POINTS_BY_TYPE[installType];
  if (installType.includes("지붕") || installType.includes("건축")) return REVIEW_POINTS_BY_TYPE["지붕형"];
  if (installType.includes("토지")) return REVIEW_POINTS_BY_TYPE["토지형"];
  if (installType.includes("상계") || installType.includes("가정")) {
    return REVIEW_POINTS_BY_TYPE["상계거래(가정용)"];
  }
  return ["현장 구조·음영·진입", "인허가·계통 절차", "설계 후 최종 규모 확정"];
}

export default function InstallationVisualSection() {
  const { metrics, capacity, installType } = useResultMetrics();
  const visual = resolveInstallVisual(installType);
  const usable = metrics.usableAreaSqm ?? metrics.roofUsableAreaSqm ?? metrics.baseAreaSqm;
  const points = reviewPointsFor(installType);

  return (
    <section id="install-visual" className="scroll-mt-28" aria-labelledby="install-visual-heading">
      <h2 id="install-visual-heading" className="text-[28px] font-extrabold text-navy sm:text-[30px]">
        예상 설치 형태
      </h2>
      <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
        부지·건축물 조건에 따른 일반적인 설치 형태입니다. 실제 배치는 현장 조건에 따라 달라질 수 있습니다.
      </p>

      <div className="mt-6 overflow-hidden bg-slate-900 lg:grid lg:grid-cols-[1.85fr_1fr]">
        <div className="relative aspect-[16/9] lg:aspect-auto lg:min-h-[420px]">
          <Image
            src={visual.src}
            alt={visual.alt}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 68vw"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pb-5 pt-16">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-200">예상 설치 형태</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{visual.label}</p>
            <p className="mt-1 text-lg font-semibold text-white/90">{capacity || "—"}</p>
          </div>
        </div>
        <div className="flex flex-col justify-center bg-white px-6 py-7 sm:px-8">
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
              <dt className="text-slate-500">예상 모듈</dt>
              <dd className="font-bold text-slate-900">
                {metrics.moduleCount > 0 ? `${metrics.moduleCount.toLocaleString("ko-KR")}장` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
              <dt className="text-slate-500">활용 면적</dt>
              <dd className="font-bold text-slate-900">
                {usable != null && usable > 0 ? `${Math.round(usable).toLocaleString("ko-KR")}㎡` : "—"}
              </dd>
            </div>
          </dl>
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">구조 검토사항</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-600">
              {points.map((point) => (
                <li key={point}>· {point}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
