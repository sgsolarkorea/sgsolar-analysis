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
    <span className={`text-sm font-semibold ${up ? "text-rose-300" : "text-sky-300"}`}>
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
      <section id="market-revenue" className="scroll-mt-28">
        <h2 className="text-[28px] font-extrabold text-navy sm:text-[32px]">시장가격 참고</h2>
        <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
          상계거래(가정용)은 전기요금 절감 중심으로 검토합니다. SMP·REC 발전수익 산정은 발전사업용
          설치 유형에서 확인하세요.
        </p>
      </section>
    );
  }

  return (
    <section id="market-revenue" className="scroll-mt-28" aria-labelledby="market-revenue-heading">
      <div className="overflow-hidden rounded-[28px] bg-[#0B1C33] text-white">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 px-5 py-6 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-300">Financial Energy Dashboard</p>
            <h2 id="market-revenue-heading" className="mt-2 text-[28px] font-extrabold sm:text-[32px]">
              시장가격 · 예상 발전수익
            </h2>
            <p className="mt-2 text-[15px] text-slate-300">
              {isFallback
                ? "참고 단가 기준 · 실데이터 연동 전 추정값입니다."
                : mode === "avg30"
                  ? "최근 30일 평균 시장가격 기준"
                  : "최신 시장자료 기준"}
            </p>
          </div>
          {hasAvg30 && !isFallback ? (
            <div className="inline-flex rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === "today" ? "bg-white text-navy" : "text-slate-300"}`}
                onClick={() => setMode("today")}
              >
                최신 가격
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === "avg30" ? "bg-white text-navy" : "text-slate-300"}`}
                onClick={() => setMode("avg30")}
              >
                30일 평균
              </button>
            </div>
          ) : null}
        </div>

        {marketError && !enriched ? (
          <p className="mx-5 mt-4 rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-200 sm:mx-8">
            시장가격 정보를 불러오지 못했습니다. 입지분석 결과는 정상 표시됩니다.
          </p>
        ) : null}

        <div className="grid gap-8 px-5 py-7 sm:px-8 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-6">
            <div>
              <p className="text-sm text-slate-400">{smpLabel}</p>
              <p className="mt-1 text-[34px] font-extrabold tracking-tight">
                {activeSmp.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
                <span className="ml-1 text-base font-semibold text-slate-400">원/kWh</span>
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span>{isFallback ? "참고 단가" : smpDate ? `${smpDate} 기준` : "기준일 확인 중"}</span>
                {!isFallback ? <ChangeBadge value={smpChange} /> : null}
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-400">REC</p>
              <p className="mt-1 text-[34px] font-extrabold tracking-tight">
                {activeRec.toLocaleString("ko-KR")}
                <span className="ml-1 text-base font-semibold text-slate-400">원/REC</span>
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span>{isFallback ? "참고 단가" : recDate ? `${recDate} 최근 거래 기준` : "기준일 확인 중"}</span>
                {!isFallback ? <ChangeBadge value={recChange} /> : null}
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-400">적용 REC 가중치</p>
              <p className="mt-1 text-[28px] font-extrabold">{metrics.recWeight}</p>
              <p className="mt-1 text-sm text-slate-400">{profitability.recWeightReason || "설치유형·용량 기준"}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 px-5 py-6 ring-1 ring-white/10 sm:px-6">
            <p className="text-sm font-medium text-slate-300">
              {isFallback ? "참고 단가 적용 시" : mode === "avg30" ? "30일 평균 가격 적용 시" : "시장가격 적용 시"}{" "}
              예상 연간 발전수익
            </p>
            <p className="mt-3 text-[44px] font-extrabold tracking-tight sm:text-[48px]">
              {formatMarketWonPerYear(revenue.totalRevenueWon)}
            </p>

            <div className="mt-8 space-y-4" aria-label="수익 구성">
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-slate-300">SMP 수익</span>
                  <span className="font-semibold">{formatMarketWonPerYear(revenue.smpRevenueWon)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-sky-400" style={{ width: `${smpPct}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-slate-300">REC 수익</span>
                  <span className="font-semibold">{formatMarketWonPerYear(revenue.recRevenueWon)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${recPct}%` }} />
                </div>
              </div>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-slate-400">
              SMP = 연간발전량 × SMP단가 · REC = (연간발전량÷1,000) × REC단가 × 가중치
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-slate-400 sm:px-8">
          {isFallback
            ? "현재는 참고 단가입니다. 실데이터 연동 후에는 기준일이 각각 표시됩니다. 장기 고정 수익을 의미하지 않습니다."
            : "현재 시장가격을 연간 예상 발전량에 적용한 단순 추정값입니다. 실제 수익은 가격·발전량·가중치·계약 조건에 따라 달라질 수 있습니다."}
        </div>
      </div>
    </section>
  );
}
