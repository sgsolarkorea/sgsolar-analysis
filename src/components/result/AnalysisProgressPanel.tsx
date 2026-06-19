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
    <aside className="hidden lg:block lg:w-60 lg:shrink-0 lg:self-stretch">
      <div className="sticky top-24 z-30 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <h2 className="text-sm font-bold text-navy">검토 흐름</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          핵심 결과만 빠르게 확인하세요.
        </p>

        <ul className="mt-3 space-y-2">
          {steps.map((step) => {
            const isActive = activeId === step.id;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(step.id)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "border-navy bg-navy-light ring-1 ring-navy/20"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{step.label}</span>
                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[step.statusKind]}`}
                    >
                      {step.statusLabel}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => scrollToSection("consultation")}
          className="btn-primary mt-4 h-11 w-full text-sm font-bold"
        >
          무료 컨설팅 상담 신청하기
        </button>
      </div>
    </aside>
  );
}
