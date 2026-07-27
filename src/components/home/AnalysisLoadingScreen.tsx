"use client";

import SgSolarLogo from "@/components/brand/SgSolarLogo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ANALYSIS_LOADING_STEPS,
  computeLoadingProgress,
  type LoadingStepState,
} from "@/data/analysisLoadingSteps";

interface AnalysisLoadingScreenProps {
  address: string;
}

const FINISH_ANIMATION_MS = 200;

/** Condensed journey for briefing UI (maps from full step ids). */
const BRIEF_STEPS = [
  { id: "address", label: "주소 및 위치 확인", match: ["address", "location"] },
  { id: "land", label: "토지 정보 확인", match: ["land"] },
  { id: "building", label: "건축물·설치조건 분석", match: ["building"] },
  { id: "capacity", label: "설치용량 산정", match: ["capacity"] },
  { id: "business", label: "사업성 분석", match: ["generation", "revenue"] },
  { id: "result", label: "결과 정리", match: ["result"] },
] as const;

function statusMessage(elapsedSec: number): string {
  if (elapsedSec >= 20) return "분석이 평소보다 조금 오래 걸리고 있습니다.";
  if (elapsedSec >= 15) return "일부 외부 데이터 응답을 기다리고 있습니다. 먼저 확인된 결과부터 준비하고 있습니다.";
  if (elapsedSec >= 12) return "예상 설치규모와 발전량을 산정하고 있습니다.";
  if (elapsedSec >= 8) return "공공데이터와 설치조건을 함께 검토하고 있습니다.";
  return "입력하신 주소의 토지·건축물 정보를 확인하고 있습니다.";
}

function BriefMark({ status }: { status: "completed" | "active" | "pending" }) {
  if (status === "completed") {
    return <span className="text-base font-bold text-emerald-600" aria-hidden>✓</span>;
  }
  if (status === "active") {
    return <span className="text-sky-600" aria-hidden>●</span>;
  }
  return <span className="text-slate-300" aria-hidden>○</span>;
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

  const progress = useMemo(() => computeLoadingProgress(steps), [steps]);

  const briefStatuses = useMemo(() => {
    return BRIEF_STEPS.map((brief) => {
      const matchIds = brief.match as readonly string[];
      const matched = steps.filter((s) => matchIds.includes(s.id));
      if (matched.every((s) => s.status === "completed")) return "completed" as const;
      if (matched.some((s) => s.status === "active" || s.status === "delayed")) return "active" as const;
      return "pending" as const;
    });
  }, [steps]);

  const revealed = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    const addressDone = steps.find((s) => s.id === "address")?.status === "completed";
    const locationDone = steps.find((s) => s.id === "location")?.status === "completed";
    const landDone = steps.find((s) => s.id === "land")?.status === "completed";
    const buildingActiveOrDone = ["completed", "active", "delayed"].includes(
      steps.find((s) => s.id === "building")?.status ?? "",
    );

    if (addressDone || locationDone) {
      items.push({ label: "분석 위치", value: "확인 완료" });
    }
    if (landDone) {
      items.push({ label: "토지 정보", value: "조회 완료" });
    }
    if (buildingActiveOrDone || landDone) {
      items.push({ label: "건축물·설치조건", value: buildingActiveOrDone ? "확인 중" : "대기" });
    }
    return items;
  }, [steps]);

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
          status: failed
            ? step.status === "active" || step.status === "delayed"
              ? "failed"
              : step.status
            : "completed",
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
        if (!failed) router.replace(resultHref);
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

    fetch(`/api/analyze?address=${encodeURIComponent(address)}&phase=core`)
      .then(async (response) => {
        if (!response.ok) {
          failed = true;
          setApiFailed(true);
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

  const retryHref = `/analyzing?address=${encodeURIComponent(address)}`;

  return (
    <div className="flex min-h-[calc(100vh-88px)] flex-col bg-[#F5F8FC]">
      <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex justify-center sm:mb-8">
          <SgSolarLogo layout="loading" variant="dark" />
        </div>

        <div className="text-center">
          <h1 className="text-[26px] font-extrabold tracking-tight text-navy sm:text-[32px]">
            입지 정보를 분석하고 있습니다
          </h1>
          <p className="mt-3 text-[15px] font-medium text-slate-700 sm:text-base">{address}</p>
          <p className="mt-3 text-sm text-slate-500">{statusMessage(elapsedSec)}</p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_1fr]">
          {/* Mini map / site preview — desktop only to keep mobile short */}
          <div className="relative hidden min-h-[280px] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-navy to-slate-900 p-5 text-white shadow-sm sm:min-h-[300px] lg:block">
            <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
              <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/40" />
              <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/20" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.2),transparent_45%)]" />
            </div>
            <p className="relative text-xs font-semibold uppercase tracking-wide text-sky-200">분석 부지</p>
            <p className="relative mt-3 max-w-[90%] text-lg font-bold leading-snug sm:text-xl">{address}</p>
            <div className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
              위치 핀 · 분석 경계 준비 중
            </div>
            <p className="relative mt-auto pt-16 text-xs text-slate-300">
              결과 화면에서 지도·필지·설치 규모를 확인합니다.
            </p>
          </div>

          {/* Progress steps */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 lg:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-navy">현재 진행 단계</p>
              <span className="text-sm font-semibold text-slate-500">{progress}%</span>
            </div>
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-navy to-sky-500 transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <ol className="space-y-3">
              {BRIEF_STEPS.map((step, i) => {
                const status = briefStatuses[i];
                return (
                  <li key={step.id} className="flex items-start gap-3 text-[15px]">
                    <BriefMark status={status} />
                    <span
                      className={
                        status === "completed"
                          ? "font-semibold text-slate-800"
                          : status === "active"
                            ? "font-bold text-navy"
                            : "text-slate-400"
                      }
                    >
                      {step.label}
                      {status === "active" ? " 중" : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Revealed facts — no invented metrics */}
        {!apiFailed && revealed.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">현재 확인된 정보</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
              {revealed.map((item) => (
                <li key={item.label} className="rounded-xl bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-navy">{item.value}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Failure only */}
        {apiFailed ? (
          <div className="mt-5 space-y-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm font-semibold text-red-800">
              분석 중 오류가 발생했습니다. 주소를 확인한 뒤 다시 분석해 주세요.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={retryHref} className="btn-primary h-11 px-4 text-sm">
                다시 분석
              </Link>
              <Link href="/#consultation" className="btn-outline h-11 px-4 text-sm">
                상담 문의
              </Link>
              <Link
                href={`/?address=${encodeURIComponent(address)}`}
                className="btn-secondary h-11 px-4 text-sm"
              >
                주소 수정
              </Link>
            </div>
          </div>
        ) : null}

        <p className="mt-6 text-center text-xs text-slate-500">
          분석 결과는 참고용 1차 검토자료이며, 최종 설치 가능 여부는 현장 확인 후 확정됩니다.
        </p>
      </div>
    </div>
  );
}
