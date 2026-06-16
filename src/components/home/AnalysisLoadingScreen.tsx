"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ANALYSIS_LOADING_DURATION_MS,
  ANALYSIS_LOADING_STEPS,
} from "@/data/analysisLoadingSteps";

interface AnalysisLoadingScreenProps {
  address: string;
}

function StepIcon({ completed, active }: { completed: boolean; active: boolean }) {
  if (completed) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white sm:h-11 sm:w-11">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 sm:h-11 sm:w-11 ${
        active ? "border-navy bg-navy-light" : "border-slate-200 bg-white"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${active ? "animate-pulse bg-navy" : "bg-slate-300"}`}
      />
    </span>
  );
}

export default function AnalysisLoadingScreen({ address }: AnalysisLoadingScreenProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  const completedCount = useMemo(() => {
    const stepSize = 100 / ANALYSIS_LOADING_STEPS.length;
    return Math.min(ANALYSIS_LOADING_STEPS.length, Math.floor(progress / stepSize));
  }, [progress]);

  useEffect(() => {
    const startedAt = Date.now();
    let frame = 0;

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(elapsed / ANALYSIS_LOADING_DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - ratio, 2.2);
      setProgress(Math.round(eased * 100));

      if (ratio < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        window.setTimeout(() => {
          router.replace(`/result?address=${encodeURIComponent(address)}`);
        }, 350);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [address, router]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="card-premium overflow-hidden p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">분석 진행 중</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              입력하신 주소를 기준으로 입지 정보를 분석하고 있습니다.
            </p>
          </div>
          <span className="shrink-0 rounded-lg bg-navy-light px-3 py-1.5 text-sm font-bold text-navy">
            {completedCount}/{ANALYSIS_LOADING_STEPS.length}
          </span>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>진행률</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-navy via-blue-600 to-amber-500 transition-[width] duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="mt-4 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {address}
        </p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {ANALYSIS_LOADING_STEPS.map((step, index) => {
            const completed = index < completedCount;
            const active = index === completedCount && progress < 100;
            return (
              <li
                key={step.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
                  completed
                    ? "border-navy/20 bg-navy-light/40"
                    : active
                      ? "border-navy/30 bg-white"
                      : "border-slate-200 bg-slate-50"
                }`}
              >
                <StepIcon completed={completed} active={active} />
                <span
                  className={`text-sm font-semibold ${
                    completed ? "text-navy" : active ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
