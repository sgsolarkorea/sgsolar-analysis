"use client";

import { useEffect, useState } from "react";
import { scrollToSection } from "@/components/layout/ScrollLink";
import { ANALYSIS_PROGRESS_STEPS } from "@/data/resultUx";

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

function resolveActiveSection(): string {
  const sectionIds = ANALYSIS_PROGRESS_STEPS.map((step) => step.id);
  const scrollBottom = window.scrollY + window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;

  if (docHeight - scrollBottom < 96) {
    return sectionIds[sectionIds.length - 1] ?? "";
  }

  const marker = window.scrollY + HEADER_OFFSET + 64;
  let activeId = sectionIds[0] ?? "";

  for (const id of sectionIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.offsetTop <= marker) {
      activeId = id;
    }
  }

  return activeId;
}

export default function AnalysisProgressPanel() {
  const [activeId, setActiveId] = useState(ANALYSIS_PROGRESS_STEPS[0]?.id ?? "");

  useEffect(() => {
    const update = () => setActiveId(resolveActiveSection());
    update();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:self-stretch">
      <div className="sticky top-24 z-30 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-navy">원포인트 분석</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          검토 단계별 진행 상태를 확인하고 해당 섹션으로 이동할 수 있습니다.
        </p>

        <ul className="mt-4 space-y-3">
          {ANALYSIS_PROGRESS_STEPS.map((step) => {
            const isActive = activeId === step.id;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(step.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    isActive
                      ? "border-navy bg-navy-light ring-1 ring-navy/20"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{step.label}</span>
                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[step.statusKind]}`}
                    >
                      {step.statusLabel}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{step.description}</p>
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
