"use client";

import SgSolarLogo from "@/components/brand/SgSolarLogo";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ANALYSIS_LOADING_STEPS,
  type AnalysisStepStatus,
  computeLoadingProgress,
  type LoadingStepState,
} from "@/data/analysisLoadingSteps";

interface AnalysisLoadingScreenProps {
  address: string;
}

const FINISH_ANIMATION_MS = 200;

function StepIcon({ status }: { status: AnalysisStepStatus }) {
  if (status === "completed") {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white sm:h-11 sm:w-11">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-red-300 bg-red-50 sm:h-11 sm:w-11">
        <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }

  const active = status === "active";

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
  const [steps, setSteps] = useState<LoadingStepState[]>(() =>
    ANALYSIS_LOADING_STEPS.map((step, index) => ({
      ...step,
      status: index === 0 ? "active" : "pending",
    })),
  );
  const [apiFailed, setApiFailed] = useState(false);

  const progress = useMemo(() => computeLoadingProgress(steps), [steps]);
  const completedCount = useMemo(
    () => steps.filter((step) => step.status === "completed").length,
    [steps],
  );

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let finishing = false;
    const startedAt = performance.now();
    let stepIndex = 0;
    let lastStepAdvance = startedAt;
    let apiDone = false;
    let failed = false;

    const resultHref = `/result?address=${encodeURIComponent(address)}`;
    router.prefetch(resultHref);

    const advanceStep = () => {
      if (cancelled || apiDone) return;
      const now = performance.now();
      if (now - lastStepAdvance < 400 || stepIndex >= ANALYSIS_LOADING_STEPS.length - 1) return;

      stepIndex += 1;
      lastStepAdvance = now;
      setSteps((prev) =>
        prev.map((step, index) => {
          if (index < stepIndex) return { ...step, status: "completed" };
          if (index === stepIndex) return { ...step, status: "active" };
          return { ...step, status: "pending" };
        }),
      );
    };

    const navigate = () => {
      if (cancelled || finishing) return;
      finishing = true;

      setSteps((prev) =>
        prev.map((step) => ({
          ...step,
          status: failed ? (step.status === "active" ? "failed" : step.status) : "completed",
        })),
      );

      const finishStart = performance.now();
      const animateFinish = () => {
        if (cancelled) return;
        const t = performance.now() - finishStart;
        if (t < FINISH_ANIMATION_MS) {
          frame = window.requestAnimationFrame(animateFinish);
          return;
        }
        if (!failed) {
          router.replace(resultHref);
        }
      };
      frame = window.requestAnimationFrame(animateFinish);
    };

    const tick = () => {
      if (cancelled || finishing) return;
      advanceStep();
      if (apiDone) {
        navigate();
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    const perfKey = `analysis:${address.trim()}`;
    performance.mark(`${perfKey}:start`);

    fetch(`/api/analyze?address=${encodeURIComponent(address)}`)
      .then(async (response) => {
        if (!response.ok) {
          failed = true;
          setApiFailed(true);
          return;
        }
        performance.mark(`${perfKey}:api-done`);
        performance.measure(`${perfKey}:total`, `${perfKey}:start`, `${perfKey}:api-done`);
        const measure = performance.getEntriesByName(`${perfKey}:total`).pop();
        if (measure) {
          console.info(`[AnalysisLoading] API completed in ${Math.round(measure.duration)}ms`);
        }
      })
      .catch(() => {
        failed = true;
        setApiFailed(true);
      })
      .finally(() => {
        apiDone = true;
        navigate();
      });

    frame = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [address, router]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-6 flex justify-center pt-2 sm:pt-4">
        <SgSolarLogo layout="loading" />
      </div>
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
              className="h-full rounded-full bg-gradient-to-r from-navy via-blue-600 to-amber-500 transition-[width] duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="mt-4 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {address}
        </p>

        {apiFailed && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            분석 중 오류가 발생했습니다. 주소를 확인한 뒤 다시 시도해 주세요.
          </p>
        )}

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {steps.map((step) => {
            const completed = step.status === "completed";
            const active = step.status === "active";
            const failed = step.status === "failed";
            return (
              <li
                key={step.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
                  completed
                    ? "border-navy/20 bg-navy-light/40"
                    : active
                      ? "border-navy/30 bg-white"
                      : failed
                        ? "border-red-200 bg-red-50"
                        : "border-slate-200 bg-slate-50"
                }`}
              >
                <StepIcon status={step.status} />
                <span
                  className={`text-sm font-semibold ${
                    completed ? "text-navy" : active ? "text-slate-900" : failed ? "text-red-700" : "text-slate-500"
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
