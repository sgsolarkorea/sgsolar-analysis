"use client";

import SgSolarLogo from "@/components/brand/SgSolarLogo";
import Link from "next/link";
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

const STEP_HINTS: Record<string, string> = {
  address: "입력하신 주소를 확인하고 있습니다.",
  location: "좌표와 위치를 확인하는 중입니다.",
  land: "입력하신 주소의 토지 이용 정보를 조회하고 있습니다.",
  building: "건축물대장 및 지붕 활용 가능 정보를 확인하고 있습니다.",
  capacity: "설치 가능 면적을 기준으로 예상 용량을 산정하고 있습니다.",
  generation: "지역 일사량 기준으로 연간 발전량을 추정하고 있습니다.",
  revenue: "예상 수익·절감 효과를 계산하고 있습니다.",
  result: "핵심 지표와 검토 의견을 정리하고 있습니다.",
};

const WAITING_TIPS = [
  "결과에서 예상 설치용량·연간 발전량·수익성을 바로 확인할 수 있습니다.",
  "공공데이터 기준 1차 검토이며, 현장 확인이 필요한 항목은 별도로 표시됩니다.",
  "분석 완료 후 PDF 제안서로 저장하거나 무료 상담을 신청할 수 있습니다.",
  "토지·건축물·조례 정보는 공개 데이터를 우선 활용합니다.",
];

function StepIcon({ status }: { status: AnalysisStepStatus }) {
  if (status === "completed") {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-red-300 bg-red-50">
        <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }

  const active = status === "active" || status === "delayed";

  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 ${
        active ? "border-navy bg-navy-light" : "border-slate-200 bg-white"
      }`}
    >
      {active ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-navy border-t-transparent" aria-hidden />
      ) : (
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
      )}
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
  const [elapsedSec, setElapsedSec] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [keepWaiting, setKeepWaiting] = useState(false);

  const displaySteps = useMemo(() => {
    if (apiFailed || elapsedSec < 15) return steps;
    return steps.map((step) =>
      step.status === "active" ? { ...step, status: "delayed" as AnalysisStepStatus } : step,
    );
  }, [steps, elapsedSec, apiFailed]);

  const progress = useMemo(() => computeLoadingProgress(steps), [steps]);
  const completedCount = useMemo(
    () => steps.filter((step) => step.status === "completed").length,
    [steps],
  );
  const activeStep = useMemo(
    () => displaySteps.find((step) => step.status === "active" || step.status === "delayed"),
    [displaySteps],
  );

  useEffect(() => {
    const tipTimer = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % WAITING_TIPS.length);
    }, 7000);
    return () => window.clearInterval(tipTimer);
  }, []);

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

    const elapsedTimer = window.setInterval(() => {
      if (!cancelled) setElapsedSec(Math.floor((performance.now() - startedAt) / 1000));
    }, 500);

    const advanceStep = () => {
      if (cancelled || apiDone) return;
      const now = performance.now();
      if (now - lastStepAdvance < 450 || stepIndex >= ANALYSIS_LOADING_STEPS.length - 1) return;

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
          status: failed ? (step.status === "active" || step.status === "delayed" ? "failed" : step.status) : "completed",
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
      window.clearInterval(elapsedTimer);
      window.cancelAnimationFrame(frame);
    };
  }, [address, router]);

  const delayMessage =
    elapsedSec >= 20
      ? "일부 공공데이터 응답이 지연되고 있습니다. 핵심 분석 결과를 우선 준비하고 있습니다."
      : elapsedSec >= 15
        ? "일부 공공데이터 응답이 지연되고 있습니다. 핵심 분석 결과를 우선 준비하고 있습니다."
        : elapsedSec >= 8
          ? "외부 공공데이터를 확인하고 있습니다."
          : null;

  const retryHref = `/analyzing?address=${encodeURIComponent(address)}`;

  return (
    <div className="flex min-h-[calc(100vh-88px)] flex-col bg-slate-50">
      <div className="mx-auto flex w-full max-w-[920px] flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 flex justify-center">
          <SgSolarLogo layout="loading" variant="dark" />
        </div>
        <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-9 shadow-[0_8px_30px_rgba(11,29,58,0.08)] sm:p-11">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-bold text-slate-900 sm:text-[30px]">분석 진행 중</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600 sm:text-[16px]">
                입력하신 주소를 기준으로 입지 정보를 분석하고 있습니다.
              </p>
            </div>
            <span className="shrink-0 rounded-lg bg-navy-light px-3 py-1.5 text-sm font-bold text-navy">
              {completedCount}/{ANALYSIS_LOADING_STEPS.length}
            </span>
          </div>

          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>진행률</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-navy via-blue-600 to-sky-500 transition-[width] duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <p className="mt-5 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            {address}
          </p>

          {activeStep && !apiFailed ? (
            <div className="mt-4 rounded-xl border border-navy/15 bg-navy-light/50 px-4 py-3">
              <p className="text-sm font-bold text-navy">{activeStep.label} 중</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {STEP_HINTS[activeStep.id] ?? "공공데이터 확인 중"}
              </p>
            </div>
          ) : null}

          {delayMessage && !apiFailed && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              {delayMessage}
            </p>
          )}

          {elapsedSec >= 20 && !apiFailed && !keepWaiting && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary h-11 px-4 text-sm"
                onClick={() => setKeepWaiting(true)}
              >
                계속 기다리기
              </button>
              <Link href={retryHref} className="btn-secondary h-11 px-4 text-sm">
                다시 시도
              </Link>
              <Link href={`tel:1844-2807`} className="btn-outline h-11 px-4 text-sm">
                상담으로 문의
              </Link>
            </div>
          )}

          {apiFailed && (
            <div className="mt-4 space-y-3">
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                분석 중 오류가 발생했습니다. 주소를 확인한 뒤 다시 시도해 주세요.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={retryHref} className="btn-primary h-11 px-4 text-sm">
                  다시 시도
                </Link>
                <Link
                  href={`/?address=${encodeURIComponent(address)}`}
                  className="btn-outline h-11 px-4 text-sm"
                >
                  주소 수정
                </Link>
              </div>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">기다리는 동안</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{WAITING_TIPS[tipIndex]}</p>
          </div>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {displaySteps.map((step) => {
              const completed = step.status === "completed";
              const active = step.status === "active" || step.status === "delayed";
              const failed = step.status === "failed";
              return (
                <li
                  key={step.id}
                  className={`flex min-h-[76px] items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors ${
                    completed
                      ? "border-navy/20 bg-navy-light/40"
                      : active
                        ? "border-navy/40 bg-white shadow-sm"
                        : failed
                          ? "border-red-200 bg-red-50"
                          : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <StepIcon status={step.status} />
                  <div className="min-w-0">
                    <span
                      className={`block text-[15px] font-semibold ${
                        completed
                          ? "text-navy"
                          : active
                            ? "text-slate-900"
                            : failed
                              ? "text-red-700"
                              : "text-slate-500"
                      }`}
                    >
                      {step.label}
                    </span>
                    {active ? (
                      <span className="mt-0.5 block text-xs text-slate-500">공공데이터 확인 중</span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-6 text-center text-xs text-slate-500">
            분석 결과는 참고용 1차 검토자료이며, 최종 설치 가능 여부는 현장 확인 후 확정됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
