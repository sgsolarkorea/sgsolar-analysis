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
  tone: "amber" | "orange" | "blue" | "green" | "slate";
  why: string;
  action: string;
}

function toneClass(tone: GateItem["tone"]) {
  if (tone === "amber") return "text-amber-800 bg-amber-50/20";
  if (tone === "orange") return "text-orange-800 bg-orange-50/10";
  if (tone === "green") return "text-emerald-300 bg-emerald-500/10";
  if (tone === "blue") return "text-sky-200 bg-sky-500/10";
  return "text-slate-200 bg-white/5";
}

function statusTone(status: ReviewStatusItem["status"]): GateItem["tone"] {
  if (status === "confirmed" || status === "reviewable") return "blue";
  if (status === "site_check") return "orange";
  if (status === "needs_review" || status === "insufficient_data") return "amber";
  return "slate";
}

export default function PermitGateSection({ items }: PermitGateSectionProps) {
  const { installType } = useResultMetrics();
  const kind = resolveBusinessRoadmapKind(installType);
  const roadmap = getBusinessRoadmap(installType);
  const [detailOpen, setDetailOpen] = useState(false);

  const byKey = useMemo(() => {
    const map = new Map(items.map((i) => [i.key, i]));
    return map;
  }, [items]);

  const gates: GateItem[] = useMemo(() => {
    const grid = byKey.get("grid");
    const permit = byKey.get("permit");
    const ordinance = byKey.get("ordinance");
    const site = byKey.get("site-check");

    if (kind === "net_metering") {
      return [
        {
          key: "grid",
          title: "한전 계통 · 상계접수",
          statusLabel: grid ? REVIEW_STATUS_MAP[grid.status].label : "한전 확인 필요",
          tone: grid ? statusTone(grid.status) : "amber",
          why: "상계거래 신청과 전력공급부 연계 기술 검토가 필요합니다.",
          action: "한전 접수 대상",
        },
        {
          key: "permit",
          title: "인허가 검토",
          statusLabel: permit ? REVIEW_STATUS_MAP[permit.status].label : "대상 여부 확인",
          tone: permit ? statusTone(permit.status) : "amber",
          why: "개발행위 허가 면제 여부 등 설치 관련 행정 요건을 확인합니다.",
          action: "추가 검토 필요",
        },
        {
          key: "ordinance",
          title: "지자체 조례",
          statusLabel: ordinance ? REVIEW_STATUS_MAP[ordinance.status].label : "조례 확인",
          tone: ordinance ? statusTone(ordinance.status) : "amber",
          why: "이격거리·입지제한 등 해당 지자체 기준을 확인합니다.",
          action: "조례 확인",
        },
        {
          key: "inspection",
          title: "사용전점검",
          statusLabel: "시공 이후",
          tone: "slate",
          why: "설치 완료 후 전기안전공사 사용전점검 절차가 진행됩니다.",
          action: "시공 이후 진행",
        },
      ];
    }

    return [
      {
        key: "grid",
        title: "한전 계통연계",
        statusLabel: grid ? REVIEW_STATUS_MAP[grid.status].label : "한전 확인 필요",
        tone: grid ? statusTone(grid.status) : "amber",
        why: "접속 가능 용량·접속 조건은 한전 검토로 최종 확인됩니다.",
        action: "한전 확인 필요",
      },
      {
        key: "permit",
        title: "발전사업 관련 인허가",
        statusLabel: permit ? REVIEW_STATUS_MAP[permit.status].label : "대상 여부 확인",
        tone: permit ? statusTone(permit.status) : "amber",
        why: "사업 유형·설치규모에 따라 발전사업허가 등 절차를 검토해야 합니다.",
        action: "추가 검토 필요",
      },
      {
        key: "development",
        title: "개발행위 · 토지",
        statusLabel: "주소 기준 검토",
        tone: "amber",
        why:
          installType.includes("토지")
            ? "토지형 설치 시 개발행위허가 및 관련 기준 확인이 필요합니다."
            : "건축물형도 설치 면적·구조에 따라 개발행위 대상 여부를 확인합니다.",
        action: "대상 여부 확인",
      },
      {
        key: "ordinance",
        title: "지자체 조례",
        statusLabel: ordinance ? REVIEW_STATUS_MAP[ordinance.status].label : "조례 확인",
        tone: ordinance ? statusTone(ordinance.status) : "amber",
        why: "이격거리·입지제한 등 해당 지자체 조례를 확인합니다.",
        action: "조례 확인",
      },
      {
        key: "site",
        title: "현장 구조 · 음영",
        statusLabel: site ? REVIEW_STATUS_MAP[site.status].label : "현장 확인 필요",
        tone: site ? statusTone(site.status) : "orange",
        why: "구조·음영·진입 여건은 현장 확인 후 최종 확정됩니다.",
        action: "현장 확인 필요",
      },
    ];
  }, [byKey, kind, installType]);

  const detailCategories =
    kind === "net_metering"
      ? [
          { title: "인허가 검토", body: "개발행위 허가 면제 여부 등 설치 관련 행정 요건을 확인합니다. 확정 허가가 아니라 대상 여부 검토 단계입니다." },
          { title: "한전 접수", body: "상계거래 신청 접수 및 한전 전력공급부 연계 기술 검토가 진행됩니다." },
          { title: "시공", body: "기자재 입고, 구조물·모듈·전기 시공이 진행됩니다." },
          { title: "사용전점검", body: "전기안전공사 사용전점검 신청·확인 후 상계거래를 시작합니다." },
        ]
      : [
          { title: "사업허가", body: "발전사업허가 신청 등 사업 유형에 맞는 인허가 절차를 검토합니다. (소요기간은 관할에 따라 상이)" },
          { title: "개발행위", body: "개발행위허가·구조안전 검토 대상 여부를 확인합니다. 확정 가능 여부는 관계기관 확인이 필요합니다." },
          { title: "계통접수", body: "사업자등록 후 전력수급계약(PPA) 신청, 수급지점 협의, 시설부담금 고지 등이 포함됩니다." },
          { title: "공사계획", body: "전기공사 감리 배치 및 공사계획 신고가 필요할 수 있습니다." },
          { title: "사용전검사", body: "용량 기준에 따라 전기안전관리자 선임·사용전검사가 진행됩니다." },
          { title: "전력수급계약", body: "전력수급계약, 병렬운전 협의, 계좌이체거래약정 등이 포함됩니다." },
          { title: "설비확인", body: "에너지관리공단 설비확인 등록이 필요합니다." },
          { title: "SMP · REC", body: "상업운전 개시 후 SMP·REC 발급·운영이 진행됩니다." },
        ];

  return (
    <section id="permit-gate" className="scroll-mt-28" aria-labelledby="permit-gate-heading">
      <div className="overflow-hidden rounded-3xl bg-navy text-white shadow-sm">
        <div className="border-b border-white/10 px-5 py-6 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-300">Business Gate</p>
          <h2 id="permit-gate-heading" className="mt-2 text-[26px] font-extrabold sm:text-[30px]">
            사업 진행 핵심 검토
          </h2>
          <p className="mt-2 max-w-3xl text-[15px] text-slate-300">
            실제 사업 진행 시 확인해야 하는 주요 행정·기술 절차입니다. 현재 입지분석만으로 허가·접속이
            확정되지 않습니다. ({roadmap.label})
          </p>
        </div>

        <div
          className={`grid sm:grid-cols-2 ${
            gates.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"
          }`}
        >
          {gates.map((gate) => (
            <div key={gate.key} className={`border-white/10 px-4 py-5 sm:border-r sm:px-5 ${toneClass(gate.tone)}`}>
              <p className="text-sm font-bold text-white">{gate.title}</p>
              <p className="mt-2 inline-flex rounded-md bg-white/10 px-2 py-1 text-xs font-bold">
                {gate.statusLabel}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{gate.why}</p>
              <p className="mt-2 text-xs font-semibold text-sky-200">{gate.action}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => setDetailOpen((v) => !v)}
            className="inline-flex h-11 items-center rounded-xl bg-white px-4 text-sm font-bold text-navy"
            aria-expanded={detailOpen}
          >
            {detailOpen ? "인허가 상세 접기" : "인허가 상세 · 절차 보기"}
          </button>
          <Link href="#grid" className="text-sm font-semibold text-sky-200 underline-offset-2 hover:underline">
            계통 상세로 이동
          </Link>
          <Link href="#business-roadmap" className="text-sm font-semibold text-sky-200 underline-offset-2 hover:underline">
            사업 로드맵 보기
          </Link>
        </div>
      </div>

      {detailOpen ? (
        <div id="permit-detail" className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="text-lg font-extrabold text-navy">인허가 및 사업 진행 상세</h3>
          <p className="mt-1 text-sm text-slate-600">
            회사소개서 {roadmap.sourceTitle} 절차를 기준으로 정리했습니다. 허가 가능 여부를 확정하지
            않습니다.
          </p>
          <ol className="mt-5 space-y-4">
            {detailCategories.map((item, index) => (
              <li key={item.title} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <p className="text-sm font-bold text-navy">
                  {String(index + 1).padStart(2, "0")} {item.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.body}</p>
                <p className="mt-1 text-xs text-slate-500">
                  현재 단계: 입지 1차 검토 · 추후 진행시점: 계약·설계 이후 · 관계기관 확인 필요
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
