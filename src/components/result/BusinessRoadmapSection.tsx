"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { getBusinessRoadmap, type RoadmapPhase } from "@/data/businessRoadmaps";

function PhaseIcon({ title }: { title: string }) {
  const common = "h-5 w-5";
  if (title.includes("사전") || title.includes("입지")) {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
        <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
        <path d="M20 20l-3.5-3.5" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (title.includes("계약") || title.includes("인허가")) {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
        <path d="M8 4h8a2 2 0 012 2v14l-4-2-4 2V6a2 2 0 012-2z" strokeWidth="1.8" />
        <path d="M10 10h4M10 13h4" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (title.includes("설계") || title.includes("계통") || title.includes("한전")) {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
        <path d="M13 2L4 14h7l-1 8 10-14h-7l0-6z" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (title.includes("시공") || title.includes("점검") || title.includes("검사")) {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
        <path d="M4 20h16M7 20V9l5-4 5 4v11" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M10 20v-5h4v5" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PhaseNode({
  phase,
  index,
  total,
  expanded,
  onToggle,
}: {
  phase: RoadmapPhase;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const current = Boolean(phase.current);
  return (
    <li className="relative flex flex-1 flex-col">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`group flex w-full flex-col rounded-2xl px-3 py-4 text-left transition ${
          current
            ? "bg-white/95 shadow-sm ring-1 ring-sky-300/70"
            : "bg-white/60 hover:bg-white/90"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
              current ? "bg-sky-500 text-white" : "bg-navy/10 text-navy"
            }`}
          >
            <PhaseIcon title={phase.title} />
          </span>
          <span className={`text-xs font-bold tracking-wide ${current ? "text-sky-700" : "text-slate-500"}`}>
            PHASE {phase.number}
          </span>
        </div>
        <p className="mt-3 text-[18px] font-extrabold leading-snug text-navy">{phase.title}</p>
        {phase.statusLabel ? (
          <span className="mt-2 inline-flex w-fit rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
            {phase.statusLabel}
          </span>
        ) : null}
        <ul className={`mt-3 space-y-1 text-[13px] leading-snug text-slate-600 ${expanded ? "" : "line-clamp-3"}`}>
          {phase.summary.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
      </button>
      {index < total - 1 ? (
        <div
          className="pointer-events-none absolute right-0 top-10 hidden h-px w-6 translate-x-full bg-gradient-to-r from-navy/40 to-sky-400/70 lg:block"
          aria-hidden
        />
      ) : null}
    </li>
  );
}

export default function BusinessRoadmapSection() {
  const { installType } = useResultMetrics();
  const roadmap = useMemo(() => getBusinessRoadmap(installType), [installType]);
  const [openDetail, setOpenDetail] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(
    roadmap.phases.find((p) => p.current)?.id ?? roadmap.phases[0]?.id ?? null,
  );

  return (
    <section
      id="business-roadmap"
      className="scroll-mt-28 rounded-3xl bg-gradient-to-br from-[#F3F7FC] via-[#F7FAFD] to-sky-50/70 px-4 py-8 sm:px-6 sm:py-10"
      aria-labelledby="business-roadmap-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Business Roadmap</p>
          <h2 id="business-roadmap-heading" className="mt-2 text-[26px] font-extrabold text-navy sm:text-[28px]">
            사업 진행 로드맵
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
            1차 입지검토 이후 실제 사업 진행 흐름을 확인하세요. 현재 유형:{" "}
            <span className="font-semibold text-navy">{roadmap.label}</span>
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
          현재 위치 · 1차 입지검토 완료
        </div>
      </div>

      {roadmap.durationNote ? (
        <p className="mt-4 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-600">
          {roadmap.durationNote}
        </p>
      ) : null}

      {/* Desktop / tablet journey */}
      <ol className="mt-8 hidden gap-3 md:grid md:grid-cols-2 lg:flex lg:items-stretch">
        {roadmap.phases.map((phase, index) => (
          <PhaseNode
            key={phase.id}
            phase={phase}
            index={index}
            total={roadmap.phases.length}
            expanded={expandedId === phase.id}
            onToggle={() => setExpandedId((prev) => (prev === phase.id ? null : phase.id))}
          />
        ))}
      </ol>

      {/* Mobile vertical timeline */}
      <ol className="mt-8 space-y-0 md:hidden">
        {roadmap.phases.map((phase, index) => {
          const current = Boolean(phase.current);
          return (
            <li key={phase.id} className="relative flex gap-4 pb-6">
              <div className="flex w-10 flex-col items-center">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    current ? "bg-sky-500 text-white" : "bg-navy/10 text-navy"
                  }`}
                >
                  <PhaseIcon title={phase.title} />
                </span>
                {index < roadmap.phases.length - 1 ? (
                  <span className="mt-1 w-px flex-1 bg-gradient-to-b from-sky-400 to-slate-200" aria-hidden />
                ) : null}
              </div>
              <button
                type="button"
                className="min-w-0 flex-1 rounded-2xl bg-white/80 px-4 py-3 text-left ring-1 ring-slate-200/80"
                onClick={() => setExpandedId((prev) => (prev === phase.id ? null : phase.id))}
                aria-expanded={expandedId === phase.id}
              >
                <p className="text-xs font-bold text-slate-500">PHASE {phase.number}</p>
                <p className="mt-1 text-lg font-extrabold text-navy">{phase.title}</p>
                {phase.statusLabel ? (
                  <span className="mt-2 inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    {phase.statusLabel}
                  </span>
                ) : null}
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {phase.summary.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpenDetail((v) => !v)}
          className="inline-flex h-11 items-center rounded-xl border border-navy/20 bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-50"
          aria-expanded={openDetail}
        >
          {openDetail ? "전체 사업 진행절차 접기" : "전체 사업 진행절차 보기"}
        </button>
        <Link href="#consultation" className="btn-primary inline-flex h-11 items-center px-5 text-sm font-bold">
          무료 전문가 상담 신청
        </Link>
      </div>

      {openDetail ? (
        <ol className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-4 sm:p-6">
          {roadmap.detailSteps.map((step, i) => (
            <li key={`${step.title}-${i}`} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
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
