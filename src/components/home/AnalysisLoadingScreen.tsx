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

const BRIEF_STEPS = [
  { id: "address", label: "주소 확인", match: ["address", "location"] },
  { id: "land", label: "토지정보", match: ["land"] },
  { id: "building", label: "건축물", match: ["building"] },
  { id: "capacity", label: "설치규모", match: ["capacity"] },
  { id: "generation", label: "발전량", match: ["generation"] },
  { id: "business", label: "사업성", match: ["revenue"] },
  { id: "result", label: "결과 정리", match: ["result"] },
] as const;

function stageMessage(activeBriefId: string | undefined, elapsedSec: number): string {
  if (elapsedSec >= 20) {
    return "외부 공공데이터 응답을 기다리고 있습니다. 확인된 결과부터 우선 준비하고 있습니다.";
  }
  switch (activeBriefId) {
    case "address":
      return "입력하신 주소와 부지 위치를 확인하고 있습니다.";
    case "land":
      return "토지 경계와 면적, 용도 정보를 확인하고 있습니다.";
    case "building":
      return "건축물 정보와 설치 활용 가능 조건을 확인하고 있습니다.";
    case "capacity":
      return "활용 가능한 면적을 기준으로 예상 설치규모를 산정하고 있습니다.";
    case "generation":
      return "설치규모를 기준으로 예상 발전량을 계산하고 있습니다.";
    case "business":
      return "시장가격과 발전량을 기준으로 사업성을 분석하고 있습니다.";
    case "result":
      return "확인된 결과를 정리하고 있습니다.";
    default:
      return "입력하신 주소와 부지 위치를 확인하고 있습니다.";
  }
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
    const buildingStatus = steps.find((s) => s.id === "building")?.status ?? "pending";
    const capacityStatus = steps.find((s) => s.id === "capacity")?.status ?? "pending";

    if (addressDone || locationDone) items.push({ label: "주소", value: "확인 완료" });
    if (landDone) items.push({ label: "면적·토지", value: "조회 완료" });
    if (buildingStatus === "completed") items.push({ label: "건축물", value: "확인 완료" });
    else if (buildingStatus === "active" || buildingStatus === "delayed") {
      items.push({ label: "건축물", value: "확인 중" });
    }
    if (capacityStatus === "active" || capacityStatus === "delayed") {
      items.push({ label: "설치유형", value: "산정 중" });
    } else if (capacityStatus === "completed") {
      items.push({ label: "설치유형", value: "산정 완료" });
    }
    return items;
  }, [steps]);

  const activeBriefId = useMemo(() => {
    const idx = briefStatuses.findIndex((s) => s === "active");
    return idx >= 0 ? BRIEF_STEPS[idx].id : briefStatuses.every((s) => s === "completed") ? "result" : "address";
  }, [briefStatuses]);

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
      // Navigate immediately when API is ready — no artificial animation wait.
      if (!failed) router.replace(resultHref);
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
  const activeIndex = Math.max(
    0,
    briefStatuses.findIndex((s) => s === "active"),
  );

  return (
    <div className="flex min-h-[calc(100vh-88px)] flex-col bg-[#EEF3F9]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex justify-center">
          <SgSolarLogo layout="loading" variant="dark" />
        </div>

        <div className="relative flex min-h-[520px] flex-1 flex-col overflow-hidden bg-navy text-white lg:min-h-[560px]">
          <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
            <div className="absolute -left-20 top-10 h-72 w-72 rounded-full border border-sky-400/20" />
            <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full border border-sky-300/15" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(56,189,248,0.18),transparent_42%)]" />
          </div>

          <div className="relative grid flex-1 gap-10 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:p-12">
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-sky-300">Site Analysis</p>
                <h1 className="mt-4 text-[28px] font-extrabold tracking-tight sm:text-[36px]">
                  입지를 분석하고 있습니다
                </h1>
                <p className="mt-4 max-w-lg text-[17px] font-semibold leading-snug text-white">{address}</p>
                <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-slate-300">
                  {stageMessage(activeBriefId, elapsedSec)}
                </p>
              </div>

              {!apiFailed && revealed.length > 0 ? (
                <ul className="mt-10 grid gap-3 sm:grid-cols-2">
                  {revealed.map((item) => (
                    <li key={item.label} className="border-t border-white/15 pt-3">
                      <p className="text-[12px] text-slate-400">{item.label}</p>
                      <p className="mt-1 text-[15px] font-bold text-white">{item.value}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-10 text-[13px] text-slate-400">
                  확인된 정보가 준비되는 즉시 결과 화면으로 이동합니다.
                </p>
              )}
            </div>

            <div className="flex flex-col justify-center">
              <div className="mb-5 flex items-end justify-between gap-3">
                <p className="text-[13px] font-bold text-sky-200">현재 분석 단계</p>
                <p className="text-[28px] font-extrabold tabular-nums text-white">{progress}%</p>
              </div>
              <div className="mb-8 h-[3px] overflow-hidden bg-white/15">
                <div className="h-full bg-sky-400 transition-[width] duration-200" style={{ width: `${progress}%` }} />
              </div>
              <ol className="space-y-0">
                {BRIEF_STEPS.map((step, i) => {
                  const status = briefStatuses[i];
                  const isActive = status === "active" || (status === "pending" && i === activeIndex);
                  return (
                    <li
                      key={step.id}
                      className={`flex items-baseline justify-between gap-4 border-t border-white/10 py-3 ${
                        status === "completed"
                          ? "text-slate-300"
                          : isActive
                            ? "text-white"
                            : "text-slate-500"
                      }`}
                    >
                      <span className={`text-[15px] ${isActive ? "font-bold" : "font-medium"}`}>
                        {String(i + 1).padStart(2, "0")} {step.label}
                        {status === "active" ? " 중" : ""}
                      </span>
                      <span className="text-[12px] font-semibold">
                        {status === "completed" ? "완료" : status === "active" ? "진행" : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>

        {apiFailed ? (
          <div className="mt-5 space-y-3 border border-red-200 bg-red-50 px-5 py-4">
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
