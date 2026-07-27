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

/**
 * FRAME 02 — Technical: capacity summary + installation visual as one composition.
 */
export default function TechnicalFrame() {
  const { metrics, capacity, installType } = useResultMetrics();
  const usable = metrics.usableAreaSqm ?? metrics.roofUsableAreaSqm ?? metrics.baseAreaSqm;
  const visual = resolveInstallVisual(installType);
  const points = reviewPointsFor(installType);

  return (
    <div className="grid items-stretch gap-10 lg:grid-cols-[0.42fr_0.58fr] lg:gap-12">
      <div className="flex flex-col justify-center">
        <p className="text-sm font-medium text-slate-500">예상 설치용량</p>
        <p className="mt-3 text-[48px] font-extrabold leading-none tracking-tight text-navy sm:text-[56px]">
          {capacity || "—"}
        </p>
        <p className="mt-4 text-[17px] font-semibold text-sky-800">{installType || "설치형태 확인 중"}</p>
        <p className="mt-2 text-sm text-slate-500">참고 사업비는 설치조건에 따라 실제 견적과 달라질 수 있습니다.</p>

        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-slate-200 pt-8">
          <div>
            <dt className="text-sm text-slate-500">예상 모듈 수</dt>
            <dd className="mt-1 text-[22px] font-bold text-slate-900">
              {metrics.moduleCount > 0 ? `${metrics.moduleCount.toLocaleString("ko-KR")}장` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">활용 면적</dt>
            <dd className="mt-1 text-[22px] font-bold text-slate-900">
              {usable != null && usable > 0 ? `${Math.round(usable).toLocaleString("ko-KR")}㎡` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">분석 면적</dt>
            <dd className="mt-1 text-[22px] font-bold text-slate-900">
              {metrics.baseAreaSqm > 0 ? `${Math.round(metrics.baseAreaSqm).toLocaleString("ko-KR")}㎡` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">설치 형태</dt>
            <dd className="mt-1 text-[22px] font-bold text-slate-900">{installType || "—"}</dd>
          </div>
        </dl>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">구조 검토사항</p>
          <ul className="mt-2 space-y-1.5 text-[15px] leading-relaxed text-slate-600">
            {points.map((point) => (
              <li key={point}>· {point}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative min-h-[280px] overflow-hidden bg-slate-900 sm:min-h-[360px] lg:min-h-[480px]">
        <Image
          src={visual.src}
          alt={visual.alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 58vw"
          priority={false}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-5 pb-6 pt-20 sm:px-7">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-200">예상 설치 형태</p>
          <p className="mt-1 text-2xl font-extrabold text-white sm:text-[28px]">{visual.label}</p>
          <p className="mt-1 text-lg font-semibold text-white/90">{capacity || "—"}</p>
        </div>
      </div>
    </div>
  );
}
