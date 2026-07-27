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
  if (value === 0) return <span className="text-sm font-medium text-slate-400">보합</span>;
  const up = value > 0;
  return (
    <span className={`text-sm font-semibold ${up ? "text-rose-600" : "text-sky-700"}`}>
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString("ko-KR")}
    </span>
  );
}

/** 1-year market snapshot — open layout (no nested navy dashboard card). */
export default function MarketRevenueSection({ embedded = false }: { embedded?: boolean }) {
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
  const isFallback = enriched?.isFallback ?? market.isFallback;

  const activeSmp = mode === "avg30" && avg30 ? avg30.smp : (enriched?.smpPrice ?? market.smpPrice);
  const activeRec = mode === "avg30" && avg30 ? avg30.rec : (enriched?.recPrice ?? market.recPrice);
  const smpChange = enriched?.smpChange ?? market.smpChange ?? null;
  const recChange = enriched?.recChange ?? market.recChange ?? null;
  const region = (enriched?.smpRegion ?? market.smpRegion ?? "unified") as SmpRegion;
  const smpDate = enriched?.smpDate ?? market.smpDate;
  const recDate = enriched?.recDate ?? market.recDate;

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
      <div id="market-revenue">
        {!embedded ? <h2 className="text-[28px] font-extrabold text-navy">시장가격 참고</h2> : null}
        <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
          상계거래(가정용)은 전기요금 절감 중심으로 검토합니다. SMP·REC 발전수익 산정은 발전사업용
          설치 유형에서 확인하세요.
        </p>
      </div>
    );
  }

  return (
    <div id="market-revenue" aria-labelledby={embedded ? undefined : "market-revenue-heading"}>
      {!embedded ? (
        <h2 id="market-revenue-heading" className="text-[28px] font-extrabold text-navy sm:text-[32px]">
          시장가격 · 예상 발전수익
        </h2>
      ) : (
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-sky-700">현재 시장가격 · 1년 기준</p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-slate-600">
          {isFallback
            ? "참고 단가 기준 · 실데이터 연동 전 추정값"
            : mode === "avg30"
              ? "최근 30일 평균 시장가격 기준"
              : "최신 시장자료 기준"}
        </p>
        {hasAvg30 && !isFallback ? (
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === "today" ? "bg-white text-navy shadow-sm" : "text-slate-600"}`}
              onClick={() => setMode("today")}
            >
              최신 가격
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === "avg30" ? "bg-white text-navy shadow-sm" : "text-slate-600"}`}
              onClick={() => setMode("avg30")}
            >
              30일 평균
            </button>
          </div>
        ) : null}
      </div>

      {marketError && !enriched ? (
        <p className="mt-4 text-sm text-slate-600">시장가격 정보를 불러오지 못했습니다. 입지분석 결과는 정상 표시됩니다.</p>
      ) : null}

      <div className="mt-8 grid gap-8 border-b border-slate-200 pb-8 sm:grid-cols-3">
        <div>
          <p className="text-sm text-slate-500">{smpLabel}</p>
          <p className="mt-1 text-[32px] font-extrabold tracking-tight text-navy">
            {activeSmp.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
            <span className="ml-1 text-base font-semibold text-slate-500">원/kWh</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>{isFallback ? "참고 단가" : smpDate ? `${smpDate} 기준` : "기준일 확인 중"}</span>
            {!isFallback ? <ChangeBadge value={smpChange} /> : null}
          </div>
        </div>
        <div>
          <p className="text-sm text-slate-500">REC</p>
          <p className="mt-1 text-[32px] font-extrabold tracking-tight text-navy">
            {activeRec.toLocaleString("ko-KR")}
            <span className="ml-1 text-base font-semibold text-slate-500">원/REC</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>{isFallback ? "참고 단가" : recDate ? `${recDate} 최근 거래 기준` : "기준일 확인 중"}</span>
            {!isFallback ? <ChangeBadge value={recChange} /> : null}
          </div>
        </div>
        <div>
          <p className="text-sm text-slate-500">적용 REC 가중치</p>
          <p className="mt-1 text-[28px] font-extrabold text-navy">{metrics.recWeight}</p>
          <p className="mt-1 text-sm text-slate-500">{profitability.recWeightReason || "설치유형·용량 기준"}</p>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-sm font-medium text-slate-500">현재 가격 기준 예상 연간 발전수익</p>
        <p className="mt-2 text-[44px] font-extrabold tracking-tight text-navy sm:text-[52px]">
          {formatMarketWonPerYear(revenue.totalRevenueWon)}
        </p>

        <div className="mt-8 max-w-xl space-y-4" aria-label="수익 구성">
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-slate-600">SMP 수익</span>
              <span className="font-semibold text-navy">{formatMarketWonPerYear(revenue.smpRevenueWon)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-sky-500" style={{ width: `${smpPct}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-slate-600">REC 수익</span>
              <span className="font-semibold text-navy">{formatMarketWonPerYear(revenue.recRevenueWon)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${recPct}%` }} />
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm text-slate-500">
          입력값과 적용 가정에 따른 1년 기준 추정치입니다. 장기 투자수익과 별개입니다.
        </p>
      </div>
    </div>
  );
}
