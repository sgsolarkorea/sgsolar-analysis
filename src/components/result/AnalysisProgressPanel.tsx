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
    <aside className="hidden lg:block lg:w-56 lg:shrink-0 lg:self-stretch">
      <div className="sticky top-[4.75rem] z-30 max-h-[calc(100vh-5.25rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <h2 className="text-[13px] font-bold text-navy">분석 진행 단계</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
          분석 항목을 순서대로 확인하세요.
        </p>

        <ul className="mt-2 space-y-1.5">
          {steps.map((step) => {
            const isActive = activeId === step.id;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(step.id)}
                  className={`w-full rounded-md border px-2.5 py-2 text-left transition-colors ${
                    isActive
                      ? "border-navy bg-navy-light ring-1 ring-navy/20"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 pt-px text-[13px] font-semibold leading-tight text-slate-900">
                      {step.label}
                    </span>
                    <span
                      className={`mt-px shrink-0 rounded border px-1.5 py-px text-[10px] font-semibold leading-none ${STATUS_STYLES[step.statusKind]}`}
                    >
                      {step.statusLabel}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{step.description}</p>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => scrollToSection("consultation")}
          className="btn-primary mt-3 h-9 w-full px-3 text-xs font-bold"
        >
          무료 컨설팅 상담 신청하기
        </button>
      </div>
    </aside>
  );
}
