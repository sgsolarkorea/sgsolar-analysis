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
  why: string;
  action: string;
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
          why: "상계거래 신청과 전력공급부 연계 기술 검토가 필요합니다. 최종 접수는 한전 확인 후 진행됩니다.",
          action: "한전 접수 대상",
        },
        secondary: [
          {
            key: "permit",
            title: "인허가 검토",
            statusLabel: permit ? REVIEW_STATUS_MAP[permit.status].label : "대상 여부 확인",
            why: "개발행위 면제 여부 등 설치 행정 요건을 확인합니다.",
            action: "추가 검토 필요",
          },
          {
            key: "ordinance",
            title: "지자체 조례",
            statusLabel: ordinance ? REVIEW_STATUS_MAP[ordinance.status].label : "조례 확인",
            why: "이격거리·입지제한 등 지자체 기준을 확인합니다.",
            action: "조례 확인",
          },
          {
            key: "site",
            title: "현장조건",
            statusLabel: site ? REVIEW_STATUS_MAP[site.status].label : "현장 확인 필요",
            why: "지붕·음영·구조는 현장 확인 후 확정됩니다.",
            action: "현장 확인",
          },
          {
            key: "inspection",
            title: "사용전점검",
            statusLabel: "시공 이후",
            why: "설치 완료 후 전기안전공사 사용전점검이 진행됩니다.",
            action: "시공 이후",
          },
        ] as GateItem[],
      };
    }

    return {
      primary: {
        key: "grid",
        title: "한전 계통연계",
        statusLabel: grid ? REVIEW_STATUS_MAP[grid.status].label : "한전 확인 필요",
        why: "접속 가능 용량과 접속 조건은 한전 검토로 최종 확인됩니다. 입지분석만으로 연계가 확정되지 않습니다.",
        action: "한전 확인 필요",
      },
      secondary: [
        {
          key: "permit",
          title: "발전사업 관련 인허가",
          statusLabel: permit ? REVIEW_STATUS_MAP[permit.status].label : "대상 여부 확인",
          why: "사업 유형·규모에 따라 발전사업허가 등 절차를 검토합니다.",
          action: "추가 검토 필요",
        },
        {
          key: "development",
          title: "개발행위",
          statusLabel: "주소 기준 검토",
          why: installType.includes("토지")
            ? "토지형 설치 시 개발행위허가 대상 여부를 확인합니다."
            : "설치 면적·구조에 따라 개발행위 대상 여부를 확인합니다.",
          action: "대상 여부 확인",
        },
        {
          key: "ordinance",
          title: "지자체 조례",
          statusLabel: ordinance ? REVIEW_STATUS_MAP[ordinance.status].label : "조례 확인",
          why: "이격거리·입지제한 등 해당 지자체 조례를 확인합니다.",
          action: "조례 확인",
        },
        {
          key: "site",
          title: "현장조건",
          statusLabel: site ? REVIEW_STATUS_MAP[site.status].label : "현장 확인 필요",
          why: "구조·음영·진입 여건은 현장 확인 후 최종 확정됩니다.",
          action: "현장 확인",
        },
      ] as GateItem[],
    };
  }, [byKey, kind, installType]);

  const detailCategories =
    kind === "net_metering"
      ? [
          { title: "설치 사전검토", body: "입지·경제성·조례·한전 선로용량을 1차로 검토합니다." },
          { title: "인허가 검토", body: "개발행위 면제 여부 등 설치 관련 행정 요건을 확인합니다. 허가 가능 여부를 확정하지 않습니다." },
          { title: "설계", body: "모듈배치·구조·전기 설계가 진행됩니다." },
          { title: "한전 접수", body: "상계거래 신청 및 한전 기술 검토가 필요합니다." },
          { title: "시공", body: "기자재 입고와 구조물·모듈·전기 시공이 진행됩니다." },
          { title: "사용전점검", body: "전기안전공사 사용전점검 후 상계거래를 시작합니다." },
          { title: "상계거래", body: "자가소비·잉여전력 상계 운영이 시작됩니다." },
        ]
      : [
          { title: "사업허가", body: "발전사업허가 신청 등 사업 유형에 맞는 인허가 절차를 검토합니다." },
          { title: "개발행위", body: "개발행위허가·구조안전 검토 대상 여부를 확인합니다." },
          { title: "계통접수", body: "전력수급계약 신청, 수급지점 협의, 시설부담금 고지 등이 포함됩니다." },
          { title: "공사계획", body: "전기공사 감리 배치 및 공사계획 신고가 필요할 수 있습니다." },
          { title: "계통연계", body: "가공·지중선로 및 한전 외선 공사가 포함될 수 있습니다." },
          { title: "사용전검사", body: "용량 기준에 따라 전기안전관리자 선임·사용전검사가 진행됩니다." },
          { title: "전력수급계약", body: "전력수급계약, 병렬운전 협의, 계좌이체거래약정 등이 포함됩니다." },
          { title: "설비확인", body: "에너지관리공단 설비확인 등록이 필요합니다." },
          { title: "SMP · REC 운영", body: "상업운전 개시 후 SMP·REC 발급·운영이 진행됩니다." },
        ];

  return (
    <div id="permit-gate" className="text-white">
      <div className="grid gap-8 lg:grid-cols-[0.4fr_0.6fr] lg:gap-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-sky-300">Grid Connection</p>
          <p className="mt-3 text-[26px] font-extrabold sm:text-[30px]">{primary.title}</p>
          <p className="mt-4 inline-flex rounded-md bg-white/15 px-2.5 py-1 text-sm font-bold">
            {primary.statusLabel}
          </p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-200">{primary.why}</p>
          <p className="mt-3 text-sm font-semibold text-sky-200">{primary.action}</p>
          <Link
            href="#grid"
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-white px-4 text-sm font-bold text-navy"
          >
            계통 상세 확인
          </Link>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-sky-300">Permit Summary</p>
          <ul className="mt-4 divide-y divide-white/10">
            {secondary.map((gate) => (
              <li key={gate.key} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-white">{gate.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">{gate.why}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-sky-200">{gate.statusLabel}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={() => setDetailOpen((v) => !v)}
          className="inline-flex h-11 items-center rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-bold text-white"
          aria-expanded={detailOpen}
        >
          {detailOpen ? "인허가 상세 접기" : "인허가 상세 보기"}
        </button>
        <Link href="#frame-action" className="text-sm font-semibold text-sky-200 underline-offset-2 hover:underline">
          진행 절차로 이동
        </Link>
        <span className="text-xs text-slate-400">({roadmap.label})</span>
      </div>

      {detailOpen ? (
        <div id="permit-detail" className="mt-6 rounded-2xl bg-white px-5 py-6 text-navy sm:px-7">
          <h3 className="text-lg font-extrabold">인허가 상세</h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            회사소개서 {roadmap.sourceTitle} 절차 기준입니다. 허가 가능 여부를 확정하지 않습니다.
          </p>
          <ol className="mt-5 grid gap-4 md:grid-cols-2">
            {detailCategories.map((item, index) => (
              <li key={item.title}>
                <p className="text-sm font-bold text-navy">
                  {String(index + 1).padStart(2, "0")} {item.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
