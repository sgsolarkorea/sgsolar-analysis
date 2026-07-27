"use client";

import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { formatMarketWonPerYear } from "@/lib/market/calculateMarketRevenue";
import {
  formatHouseholdMonthlySavings,
  isHouseholdInstallType,
} from "@/lib/solar/householdSavings";

/**
 * Open-layout business summary — not a row of equal white cards.
 */
export default function BusinessCoreSummary() {
  const { metrics, capacity, annualGeneration, annualRevenue, constructionCost, installType } =
    useResultMetrics();
  const household = isHouseholdInstallType(installType);
  const usable = metrics.usableAreaSqm ?? metrics.roofUsableAreaSqm ?? metrics.baseAreaSqm;
  const revenueLabel = household
    ? formatHouseholdMonthlySavings(metrics.capacityKw)
    : annualRevenue || formatMarketWonPerYear(metrics.totalRevenueWon);
  const marketFallback = !household && Boolean(metrics.market?.isFallback);

  return (
    <section id="business-summary" className="scroll-mt-28" aria-labelledby="business-summary-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="business-summary-heading" className="text-[28px] font-extrabold tracking-tight text-navy sm:text-[32px]">
            설치규모 · 핵심 사업성
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
            이 부지에서 1차 검토 가능한 규모와 사업성입니다.
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          자체 산정 · {marketFallback ? "참고 단가" : "시장 데이터"}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3 lg:gap-10">
        <div>
          <p className="text-sm font-medium text-slate-500">예상 설치용량</p>
          <p className="mt-2 text-[40px] font-extrabold leading-none tracking-tight text-navy sm:text-[44px]">
            {capacity || "—"}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">연간 예상 발전량</p>
          <p className="mt-2 text-[36px] font-extrabold leading-none tracking-tight text-navy sm:text-[40px]">
            {annualGeneration || "—"}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">
            {household
              ? "월 예상 전기요금 절감"
              : marketFallback
                ? "참고 단가 기준 예상 발전수익"
                : "오늘 시장가격 기준 예상 발전수익"}
          </p>
          <p className="mt-2 text-[36px] font-extrabold leading-none tracking-tight text-sky-700 sm:text-[40px]">
            {revenueLabel || "—"}
          </p>
          {marketFallback ? (
            <p className="mt-2 text-xs font-semibold text-amber-700">실데이터 연동 전 · 참고 단가</p>
          ) : null}
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-200 pt-6 sm:grid-cols-3 lg:grid-cols-5">
        <div>
          <dt className="text-xs text-slate-500">분석 면적</dt>
          <dd className="mt-1 text-base font-bold text-slate-900">
            {metrics.baseAreaSqm > 0 ? `${Math.round(metrics.baseAreaSqm).toLocaleString("ko-KR")}㎡` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">활용 면적</dt>
          <dd className="mt-1 text-base font-bold text-slate-900">
            {usable != null && usable > 0 ? `${Math.round(usable).toLocaleString("ko-KR")}㎡` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">예상 모듈 수</dt>
          <dd className="mt-1 text-base font-bold text-slate-900">
            {metrics.moduleCount > 0 ? `${metrics.moduleCount.toLocaleString("ko-KR")}장` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">설치 형태</dt>
          <dd className="mt-1 text-base font-bold text-slate-900">{installType || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{household ? "REC 가중치" : "예상 시공비"}</dt>
          <dd className="mt-1 text-base font-bold text-slate-900">
            {household
              ? metrics.recWeight || "—"
              : constructionCost && constructionCost !== "산정 불가"
                ? constructionCost
                : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
