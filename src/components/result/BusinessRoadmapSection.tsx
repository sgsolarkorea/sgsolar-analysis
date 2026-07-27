"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getBusinessRoadmap } from "@/data/businessRoadmaps";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";

export default function BusinessRoadmapSection() {
  const { installType } = useResultMetrics();
  const roadmap = useMemo(() => getBusinessRoadmap(installType), [installType]);
  const [openDetail, setOpenDetail] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <section id="business-roadmap" className="scroll-mt-28 pt-6" aria-labelledby="business-roadmap-heading">
      <ol className="grid gap-6 border-y border-slate-200 py-8 sm:grid-cols-3 sm:gap-8">
        <li>
          <p className="text-[32px] font-extrabold tabular-nums text-navy/20">01</p>
          <p className="mt-2 text-[18px] font-extrabold text-navy">한전 계통</p>
          <p className="mt-1 text-[14px] text-slate-600">접속 가능용량 확인</p>
        </li>
        <li>
          <p className="text-[32px] font-extrabold tabular-nums text-navy/20">02</p>
          <p className="mt-2 text-[18px] font-extrabold text-navy">인허가·조례</p>
          <p className="mt-1 text-[14px] text-slate-600">대상 절차와 제한 확인</p>
        </li>
        <li>
          <p className="text-[32px] font-extrabold tabular-nums text-navy/20">03</p>
          <p className="mt-2 text-[18px] font-extrabold text-navy">현장</p>
          <p className="mt-1 text-[14px] text-slate-600">구조·음영·진입조건 확인</p>
        </li>
      </ol>

      <h2 id="business-roadmap-heading" className="mt-10 text-[28px] font-extrabold text-navy sm:text-[32px]">
        사업 진행 로드맵
      </h2>
      <p className="mt-2 text-[14px] text-slate-500">
        현재 유형 · {roadmap.label}
        {roadmap.durationNote ? ` · ${roadmap.durationNote}` : ""}
      </p>

      {/* Desktop journey canvas */}
      <div className="relative mt-10 hidden lg:block">
        <div className="absolute left-[8%] right-[8%] top-[28px] h-px bg-navy/20" aria-hidden />
        <ol className="relative grid grid-cols-5 gap-4">
          {roadmap.phases.map((phase) => {
            const current = Boolean(phase.current);
            const open = expandedId === phase.id;
            return (
              <li key={phase.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId((prev) => (prev === phase.id ? null : phase.id))}
                  className="w-full text-left"
                  aria-expanded={open}
                >
                  <span
                    className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[18px] font-extrabold ${
                      current ? "bg-sky-500 text-white" : "bg-navy text-white"
                    }`}
                  >
                    {phase.number}
                  </span>
                  <p className="mt-4 text-center text-[15px] font-extrabold text-navy">{phase.title}</p>
                  <p className="mt-2 text-center text-[13px] leading-snug text-slate-500">
                    {phase.summary[0] || ""}
                  </p>
                  {current ? (
                    <p className="mt-2 text-center text-[11px] font-bold text-sky-700">현재 위치</p>
                  ) : null}
                </button>
                {open ? (
                  <ul className="mt-3 space-y-1 text-[12px] text-slate-600">
                    {phase.summary.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Mobile / tablet vertical */}
      <ol className="mt-8 space-y-0 lg:hidden">
        {roadmap.phases.map((phase, index) => {
          const current = Boolean(phase.current);
          return (
            <li key={phase.id} className="relative flex gap-4 pb-8">
              <div className="flex w-12 flex-col items-center">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-[16px] font-extrabold text-white ${
                    current ? "bg-sky-500" : "bg-navy"
                  }`}
                >
                  {phase.number}
                </span>
                {index < roadmap.phases.length - 1 ? (
                  <span className="mt-1 w-px flex-1 bg-navy/20" aria-hidden />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-[17px] font-extrabold text-navy">{phase.title}</p>
                <p className="mt-1 text-[14px] text-slate-600">{phase.summary[0]}</p>
                {current ? <p className="mt-1 text-[12px] font-bold text-sky-700">현재 위치</p> : null}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setOpenDetail((v) => !v)}
          className="text-sm font-semibold text-navy hover:underline"
          aria-expanded={openDetail}
        >
          {openDetail ? "전체 사업 진행절차 접기" : "전체 사업 진행절차 보기"}
        </button>
        <Link href="#frame-conversion" className="btn-primary inline-flex h-11 items-center px-5 text-sm font-bold">
          무료 전문가 상담 신청
        </Link>
      </div>

      {openDetail ? (
        <ol className="mt-6 space-y-4 border-t border-slate-200 pt-6">
          {roadmap.detailSteps.map((step, i) => (
            <li key={`${step.title}-${i}`}>
              <p className="text-sm font-bold text-navy">
                {String(i + 1).padStart(2, "0")} {step.title}
              </p>
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
                {step.items.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
