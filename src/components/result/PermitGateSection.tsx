"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { getBusinessRoadmap, resolveBusinessRoadmapKind } from "@/data/businessRoadmaps";
import type { ReviewStatusItem } from "@/lib/result/reviewStatus";
import { REVIEW_STATUS_MAP } from "@/lib/result/reviewStatus";

interface PermitGateSectionProps {
  items: ReviewStatusItem[];
}

interface GateItem {
  key: string;
  title: string;
  statusLabel: string;
  oneLine: string;
}

function statusDotClass(label: string): string {
  if (label.includes("확인") || label.includes("검토")) return "bg-amber-400";
  if (label.includes("완료") || label.includes("가능")) return "bg-emerald-400";
  return "bg-slate-400";
}

export default function PermitGateSection({ items }: PermitGateSectionProps) {
  const { installType } = useResultMetrics();
  const kind = resolveBusinessRoadmapKind(installType);
  const roadmap = getBusinessRoadmap(installType);
  const [detailOpen, setDetailOpen] = useState(false);

  const byKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);

  const { primary, secondary } = useMemo(() => {
    const grid = byKey.get("grid");
    const permit = byKey.get("permit");
    const ordinance = byKey.get("ordinance");
    const site = byKey.get("site-check");

    if (kind === "net_metering") {
      return {
        primary: {
          key: "grid",
          title: "한전 계통 · 상계접수",
          statusLabel: grid ? REVIEW_STATUS_MAP[grid.status].label : "한전 확인 필요",
          oneLine: "상계거래 신청과 전력공급부 연계 기술 검토가 필요합니다.",
        },
        secondary: [
          {
            key: "permit",
            title: "인허가",
            statusLabel: permit ? REVIEW_STATUS_MAP[permit.status].label : "대상 여부 확인",
            oneLine: "개발행위 면제 여부 등 설치 행정 요건을 확인합니다.",
          },
          {
            key: "development",
            title: "개발행위",
            statusLabel: "주소 기준 검토",
            oneLine: "설치 면적·구조에 따라 개발행위 대상 여부를 확인합니다.",
          },
          {
            key: "ordinance",
            title: "조례",
            statusLabel: ordinance ? REVIEW_STATUS_MAP[ordinance.status].label : "조례 확인",
            oneLine: "이격거리·입지제한 등 지자체 기준을 확인합니다.",
          },
          {
            key: "site",
            title: "현장",
            statusLabel: site ? REVIEW_STATUS_MAP[site.status].label : "현장 확인 필요",
            oneLine: "지붕·음영·구조는 현장 확인 후 확정됩니다.",
          },
        ] as GateItem[],
      };
    }

    return {
      primary: {
        key: "grid",
        title: "한전 계통연계",
        statusLabel: grid ? REVIEW_STATUS_MAP[grid.status].label : "한전 확인 필요",
        oneLine: "접속 가능 용량과 접속 조건은 한전 검토로 최종 확인됩니다.",
      },
      secondary: [
        {
          key: "permit",
          title: "인허가",
          statusLabel: permit ? REVIEW_STATUS_MAP[permit.status].label : "대상 여부 확인",
          oneLine: "사업 유형·규모에 따라 발전사업허가 등 절차를 검토합니다.",
        },
        {
          key: "development",
          title: "개발행위",
          statusLabel: "주소 기준 검토",
          oneLine: installType.includes("토지")
            ? "토지형 설치 시 개발행위허가 대상 여부를 확인합니다."
            : "설치 면적·구조에 따라 개발행위 대상 여부를 확인합니다.",
        },
        {
          key: "ordinance",
          title: "조례",
          statusLabel: ordinance ? REVIEW_STATUS_MAP[ordinance.status].label : "조례 확인",
          oneLine: "이격거리·입지제한 등 해당 지자체 조례를 확인합니다.",
        },
        {
          key: "site",
          title: "현장",
          statusLabel: site ? REVIEW_STATUS_MAP[site.status].label : "현장 확인 필요",
          oneLine: "구조·음영·진입 여건은 현장 확인 후 최종 확정됩니다.",
        },
      ] as GateItem[],
    };
  }, [byKey, kind, installType]);

  return (
    <div id="permit-gate" className="text-white">
      <div className="grid gap-10 lg:grid-cols-[0.45fr_0.55fr] lg:gap-14">
        <div className="rounded-[20px] bg-[#0a1628]/60 px-5 py-6 sm:px-7 sm:py-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3L4 9v12h16V9l-8-6z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.14em] text-sky-300">핵심 사업조건</p>
          <p className="mt-3 text-[30px] font-extrabold leading-tight sm:text-[34px]">{primary.title}</p>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-200">{primary.oneLine}</p>
          <p className="mt-5 flex items-center gap-2 text-[14px] font-semibold text-slate-200">
            <span className={`inline-block h-2 w-2 rounded-full ${statusDotClass(primary.statusLabel)}`} />
            {primary.statusLabel}
          </p>
          <Link
            href="#grid"
            className="mt-8 inline-flex text-sm font-bold text-sky-200 underline-offset-4 hover:underline"
          >
            계통 상세 확인 →
          </Link>
        </div>

        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-sky-300">사업 진행 전 확인</p>
          <ol className="mt-5 space-y-0">
            {secondary.map((gate, index) => (
              <li
                key={gate.key}
                className="grid grid-cols-[40px_1fr_auto] items-start gap-3 border-t border-white/10 py-4 first:border-t-0 first:pt-0"
              >
                <span className="pt-0.5 text-[13px] font-bold text-sky-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="text-[16px] font-bold text-white">{gate.title}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-slate-300">{gate.oneLine}</p>
                </div>
                <p className="flex shrink-0 items-center gap-2 pt-0.5 text-[13px] font-semibold text-slate-200">
                  <span className={`inline-block h-2 w-2 rounded-full ${statusDotClass(gate.statusLabel)}`} />
                  {gate.statusLabel}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-8 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={() => setDetailOpen((v) => !v)}
          className="text-sm font-semibold text-sky-200 underline-offset-2 hover:underline"
          aria-expanded={detailOpen}
        >
          {detailOpen ? "인허가 상세 접기" : "인허가 상세 보기"}
        </button>
      </div>

      {detailOpen ? (
        <div id="permit-detail" className="mt-5 rounded-[20px] bg-white/95 px-5 py-6 text-navy sm:px-7">
          <h3 className="text-lg font-extrabold">인허가 상세</h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            회사소개서 {roadmap.sourceTitle} 절차 기준입니다. 허가 가능 여부를 확정하지 않습니다.
          </p>
        </div>
      ) : null}
    </div>
  );
}
