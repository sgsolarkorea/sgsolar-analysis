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

/** FRAME 02 — photo is the hero (~60%), capacity typography secondary. */
export default function TechnicalFrame() {
  const { metrics, capacity, installType } = useResultMetrics();
  const usable = metrics.usableAreaSqm ?? metrics.roofUsableAreaSqm ?? metrics.baseAreaSqm;
  const visual = resolveInstallVisual(installType);
  const points = reviewPointsFor(installType);

  return (
    <div className="grid items-stretch gap-8 lg:grid-cols-[0.38fr_0.62fr] lg:gap-10">
      <div className="flex flex-col justify-center order-2 lg:order-1">
        <p className="text-[13px] font-medium text-slate-500">예상 설치용량</p>
        <p className="mt-2 text-[52px] font-extrabold leading-none tracking-tight text-navy sm:text-[60px]">
          {capacity || "—"}
        </p>
        <p className="mt-4 text-[18px] font-semibold text-navy">{installType || "설치형태 확인 중"}</p>

        <div className="mt-10 space-y-5 border-t border-slate-200 pt-8">
          <div>
            <p className="text-[13px] text-slate-500">예상 모듈</p>
            <p className="mt-1 text-[26px] font-extrabold text-slate-900">
              {metrics.moduleCount > 0 ? `${metrics.moduleCount.toLocaleString("ko-KR")}장` : "—"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-[13px] text-slate-500">활용 면적</p>
              <p className="mt-1 text-[20px] font-bold text-slate-900">
                {usable != null && usable > 0 ? `${Math.round(usable).toLocaleString("ko-KR")}㎡` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[13px] text-slate-500">분석 면적</p>
              <p className="mt-1 text-[20px] font-bold text-slate-900">
                {metrics.baseAreaSqm > 0 ? `${Math.round(metrics.baseAreaSqm).toLocaleString("ko-KR")}㎡` : "—"}
              </p>
            </div>
          </div>
        </div>

        <ul className="mt-8 space-y-1 text-[14px] leading-relaxed text-slate-600">
          {points.slice(0, 3).map((point) => (
            <li key={point}>· {point}</li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-slate-500">
          참고 사업비는 설치조건에 따라 실제 견적과 달라질 수 있습니다.
        </p>
      </div>

      <div className="relative order-1 min-h-[300px] overflow-hidden bg-slate-900 sm:min-h-[400px] lg:order-2 lg:min-h-[520px]">
        <Image
          src={visual.src}
          alt={visual.alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 62vw"
          priority={false}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-5 pb-6 pt-24 sm:px-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-200">예상 설치 형태</p>
          <p className="mt-1 text-[26px] font-extrabold text-white sm:text-[30px]">{visual.label}</p>
          <p className="mt-1 text-[18px] font-semibold text-white/90">{capacity || "—"}</p>
        </div>
      </div>
    </div>
  );
}
