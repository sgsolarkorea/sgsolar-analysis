"use client";

import { useEffect, useState } from "react";
import { scrollToSection } from "@/components/layout/ScrollLink";
import type { ProgressStepConfig } from "@/data/resultUx";

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
                {step.label}
              </option>
            ))}
          </select>
        </div>
      </nav>

      <aside className="hidden lg:block lg:w-[240px] lg:shrink-0 lg:self-stretch xl:w-[250px]">
        <div className="sticky top-[5.5rem] z-30 max-h-[calc(100vh-6.5rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <h2 className="px-2 text-[15px] font-bold text-navy">분석 목차</h2>
          <p className="mt-1 px-2 text-[12px] leading-snug text-slate-500">섹션으로 이동합니다.</p>

          <ul className="mt-3 space-y-1">
            {steps.map((step, index) => {
              const isActive = activeId === step.id;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(step.id)}
                    className={`flex min-h-[56px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? "bg-navy-light text-navy ring-1 ring-navy/15"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`w-0.5 self-stretch rounded-full ${isActive ? "bg-sky-500" : "bg-transparent"}`}
                      aria-hidden
                    />
                    <span className="text-[12px] font-bold text-slate-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 text-[14px] font-semibold leading-tight">{step.label}</span>
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
