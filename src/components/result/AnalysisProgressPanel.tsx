"use client";

import { useEffect, useState } from "react";
import { scrollToSection } from "@/components/layout/ScrollLink";
import type { ProgressStepConfig } from "@/data/resultUx";

export type ProgressStatusKind =
  | "complete"
  | "reviewed"
  | "reference"
  | "caution"
  | "available"
  | "error";

const STATUS_STYLES: Record<ProgressStatusKind, string> = {
  complete: "bg-blue-50 text-blue-800 border-blue-200",
  reviewed: "bg-blue-50 text-blue-800 border-blue-200",
  reference: "bg-violet-50 text-violet-800 border-violet-200",
  caution: "bg-amber-50 text-amber-900 border-amber-200",
  available: "bg-emerald-50 text-emerald-800 border-emerald-200",
  error: "bg-red-50 text-red-800 border-red-200",
};

const HEADER_OFFSET = 120;

function resolveActiveSection(stepIds: string[]): string {
  const scrollBottom = window.scrollY + window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;

  if (docHeight - scrollBottom < 96) {
    return stepIds[stepIds.length - 1] ?? "";
  }

  const marker = window.scrollY + HEADER_OFFSET + 64;
  let activeId = stepIds[0] ?? "";

  for (const id of stepIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.offsetTop <= marker) {
      activeId = id;
    }
  }

  return activeId;
}

interface AnalysisProgressPanelProps {
  steps: ProgressStepConfig[];
}

export default function AnalysisProgressPanel({ steps }: AnalysisProgressPanelProps) {
  const [activeId, setActiveId] = useState(steps[0]?.id ?? "");

  useEffect(() => {
    const stepIds = steps.map((step) => step.id);
    const update = () => setActiveId(resolveActiveSection(stepIds));
    update();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [steps]);

  return (
    <>
      <nav className="mb-4 lg:hidden" aria-label="분석 섹션">
        <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <label htmlFor="result-section-nav" className="sr-only">
            분석 섹션 이동
          </label>
          <select
            id="result-section-nav"
            className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
            value={activeId}
            onChange={(e) => {
              setActiveId(e.target.value);
              scrollToSection(e.target.value);
            }}
          >
            {steps.map((step) => (
              <option key={step.id} value={step.id}>
                {step.label} · {step.statusLabel}
              </option>
            ))}
          </select>
        </div>
      </nav>

      <aside className="hidden lg:block lg:w-[250px] lg:shrink-0 lg:self-stretch xl:w-[260px]">
        <div className="sticky top-[5.5rem] z-30 max-h-[calc(100vh-6.5rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-[15px] font-bold text-navy">분석 목차</h2>
          <p className="mt-1 text-[12px] leading-snug text-slate-500">항목을 선택해 이동합니다.</p>

          <ul className="mt-3 space-y-1.5">
            {steps.map((step) => {
              const isActive = activeId === step.id;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(step.id)}
                    className={`flex min-h-[56px] w-full flex-col justify-center rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? "border-navy bg-navy-light ring-1 ring-navy/20"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 text-[14px] font-semibold leading-tight text-slate-900">
                        {step.label}
                      </span>
                      <span
                        className={`mt-px shrink-0 rounded border px-1.5 py-0.5 text-[12px] font-semibold leading-none ${STATUS_STYLES[step.statusKind]}`}
                      >
                        {step.statusLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-snug text-slate-500">{step.description}</p>
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => scrollToSection("consultation")}
            className="btn-primary mt-4 h-11 w-full px-3 text-sm font-bold"
          >
            무료 상담 신청
          </button>
        </div>
      </aside>
    </>
  );
}
