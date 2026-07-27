"use client";

import { useEffect, useMemo, useState } from "react";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import {
  calculateMarketRevenue,
  formatMarketWonPerYear,
} from "@/lib/market/calculateMarketRevenue";
import { resolveSmpRegionLabel, type SmpRegion } from "@/lib/market/smpRegion";
import { isHouseholdInstallType } from "@/lib/solar/householdSavings";
import type { MarketPriceData } from "@/lib/api/market";

type PriceMode = "today" | "avg30";

function ChangeBadge({ value }: { value: number | null | undefined }) {
  if (value == null || !Number.isFinite(value)) return null;
  if (value === 0) {
    return <span className="text-xs font-medium text-slate-500">보합</span>;
  }
  const up = value > 0;
  return (
    <span className={`text-xs font-semibold ${up ? "text-red-600" : "text-blue-700"}`}>
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString("ko-KR")}
    </span>
  );
}

export default function MarketRevenueSection() {
  const { metrics, profitability, installType, siteAddress, siteJibunAddress } = useResultMetrics();
  const [mode, setMode] = useState<PriceMode>("today");
  const [enriched, setEnriched] = useState<MarketPriceData | null>(null);
  const [marketError, setMarketError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ address: siteAddress });
    if (siteJibunAddress) qs.set("jibun", siteJibunAddress);
    fetch(`/api/market?${qs.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("market");
        return (await res.json()) as MarketPriceData;
      })
      .then((data) => {
        if (!cancelled) setEnriched(data);
      })
      .catch(() => {
        if (!cancelled) setMarketError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [siteAddress, siteJibunAddress]);

  const household = isHouseholdInstallType(installType);
  const market = metrics.market;
  const avg30 = enriched?.avg30 ?? null;
  const hasAvg30 = Boolean(avg30 && avg30.sampleCount >= 5);

  const activeSmp = mode === "avg30" && avg30 ? avg30.smp : (enriched?.smpPrice ?? market.smpPrice);
  const activeRec = mode === "avg30" && avg30 ? avg30.rec : (enriched?.recPrice ?? market.recPrice);
  const smpChange = enriched?.smpChange ?? market.smpChange ?? null;
  const recChange = enriched?.recChange ?? market.recChange ?? null;
  const region = (enriched?.smpRegion ?? market.smpRegion ?? "unified") as SmpRegion;
  const priceDate = enriched?.smpDate ?? market.smpDate ?? market.recDate;

  const revenue = useMemo(
    () =>
      calculateMarketRevenue({
        annualGenerationKwh: metrics.annualGenerationKwh,
        smpPricePerKwh: activeSmp,
        recPricePerRec: activeRec,
        recWeight: metrics.recWeight,
      }),
    [metrics.annualGenerationKwh, activeSmp, activeRec, metrics.recWeight],
  );

  const smpLabel = resolveSmpRegionLabel(region);
  const totalShare = revenue.totalRevenueWon > 0 ? revenue.totalRevenueWon : 1;
  const smpPct = Math.round((revenue.smpRevenueWon / totalShare) * 100);
  const recPct = Math.max(0, 100 - smpPct);

  if (household) {
    return (
      <section id="market-revenue" className="scroll-mt-28">
        <h2 className="text-[26px] font-extrabold text-navy sm:text-[28px]">시장가격 참고</h2>
        <p className="mt-2 text-[15px] text-slate-600">
          상계거래(가정용)은 전기요금 절감 중심으로 검토합니다. SMP·REC 발전수익 산정은 발전사업용
          설치 유형에서 확인하세요.
        </p>
      </section>
    );
  }

  return (
    <section id="market-revenue" className="scroll-mt-28" aria-labelledby="market-revenue-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="market-revenue-heading" className="text-[26px] font-extrabold text-navy sm:text-[28px]">
            오늘 시장가격 기준 사업성
          </h2>
          <p className="mt-2 text-[15px] text-slate-600">
            시장가격 기준일 {priceDate}
            {(enriched?.isFallback ?? market.isFallback) ? " · 참고 단가" : " · 최신 시장자료"}
          </p>
        </div>
        {hasAvg30 ? (
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === "today" ? "bg-white text-navy shadow-sm" : "text-slate-600"}`}
              onClick={() => setMode("today")}
            >
              오늘 가격
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === "avg30" ? "bg-white text-navy shadow-sm" : "text-slate-600"}`}
              onClick={() => setMode("avg30")}
            >
              최근 30일 평균
            </button>
          </div>
        ) : null}
      </div>

      {marketError && !enriched ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          오늘의 시장가격 정보를 불러오지 못했습니다. 입지분석 결과는 정상 표시됩니다.
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{smpLabel}</p>
          <p className="mt-2 text-[28px] font-extrabold text-navy">
            {activeSmp.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
            <span className="ml-1 text-base font-semibold text-slate-500">원/kWh</span>
          </p>
          <div className="mt-2">
            <ChangeBadge value={smpChange} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">REC</p>
          <p className="mt-2 text-[28px] font-extrabold text-navy">
            {activeRec.toLocaleString("ko-KR")}
            <span className="ml-1 text-base font-semibold text-slate-500">원/REC</span>
          </p>
          <div className="mt-2">
            <ChangeBadge value={recChange} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">적용 REC 가중치</p>
          <p className="mt-2 text-[28px] font-extrabold text-navy">{metrics.recWeight}</p>
          <p className="mt-2 text-xs text-slate-500">{profitability.recWeightReason || "설치유형·용량 기준"}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-navy/10 bg-navy px-5 py-6 text-white sm:px-8">
        <p className="mt-0 text-sm font-medium text-slate-300">
          {mode === "avg30" ? "최근 30일 평균 가격 적용 시" : "오늘 시장가격 적용 시"} 예상 연간 발전수익
        </p>
        <p className="mt-2 text-[36px] font-extrabold tracking-tight sm:text-[40px]">
          {formatMarketWonPerYear(revenue.totalRevenueWon)}
        </p>
        <p className="mt-2 text-sm text-slate-300">
          SMP {formatMarketWonPerYear(revenue.smpRevenueWon)} + REC{" "}
          {formatMarketWonPerYear(revenue.recRevenueWon)}
        </p>

        <div className="mt-6 space-y-3" aria-label="수익 구성">
          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-300">
              <span>SMP 수익</span>
              <span>{formatMarketWonPerYear(revenue.smpRevenueWon)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-sky-400" style={{ width: `${smpPct}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-300">
              <span>REC 수익</span>
              <span>{formatMarketWonPerYear(revenue.recRevenueWon)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${recPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {metrics.constructionCostWon > 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          예상 시공비{" "}
          <span className="font-bold text-slate-900">
            {formatMarketWonPerYear(metrics.constructionCostWon).replace("/년", "")}
          </span>
          <span className="text-slate-500"> · 발전수익과 별도 사업비 항목</span>
        </p>
      ) : null}

      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
        현재 시장가격을 연간 예상 발전량에 적용한 단순 추정값입니다. 실제 수익은 SMP·REC 가격, 발전량,
        REC 가중치 및 계약 조건 등에 따라 달라질 수 있습니다.
      </p>
    </section>
  );
}
