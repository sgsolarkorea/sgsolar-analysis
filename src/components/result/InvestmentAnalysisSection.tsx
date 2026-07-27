"use client";

import { useMemo, useState } from "react";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { isHouseholdInstallType } from "@/lib/solar/householdSavings";
import { runInvestmentAnalysis } from "@/lib/investment/engine";
import { runPriceSensitivity } from "@/lib/investment/sensitivity";
import { INVESTMENT_ENGINE_VERSION, type InvestmentAnalysisInput } from "@/lib/investment/types";

function formatManwon(won: number): string {
  if (!Number.isFinite(won)) return "—";
  const man = Math.round(won / 10_000);
  if (Math.abs(man) >= 10_000) {
    const eok = man / 10_000;
    return `${eok.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억원`;
  }
  return `${man.toLocaleString("ko-KR")}만원`;
}

function formatPct(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return "산출 불가";
  return `${(rate * 100).toFixed(2)}%`;
}

/**
 * Long-term investment simulation — separate from 1-year market snapshot.
 * Gate: only RPS; requires user CAPEX (or site construction estimate).
 */
export default function InvestmentAnalysisSection() {
  const { metrics, installType, capacity } = useResultMetrics();
  const household = isHouseholdInstallType(installType);

  const defaultCapex = metrics.constructionCostWon > 0 ? metrics.constructionCostWon : 0;
  const [open, setOpen] = useState(false);
  const [totalCapex, setTotalCapex] = useState(defaultCapex);
  const [equity, setEquity] = useState(defaultCapex > 0 ? Math.round(defaultCapex * 0.4) : 0);
  const [loan, setLoan] = useState(defaultCapex > 0 ? Math.round(defaultCapex * 0.6) : 0);
  const [rate, setRate] = useState(0.047);
  const [grace, setGrace] = useState(3);
  const [term, setTerm] = useState(20);
  const [om, setOm] = useState(1_500_000);
  const [insurance, setInsurance] = useState(500_000);
  const [priceMode, setPriceMode] = useState<"spot" | "fixed">("spot");
  const [fixedBlended, setFixedBlended] = useState(193);

  const canRun = !household && totalCapex > 0 && equity >= 0 && loan >= 0 && metrics.annualGenerationKwh > 0;

  const input: InvestmentAnalysisInput | null = useMemo(() => {
    if (!canRun) return null;
    const base: InvestmentAnalysisInput = {
      capacityKw: metrics.capacityKw,
      year1GenerationKwh: metrics.annualGenerationKwh,
      degradationRate: 0.005,
      revenueMode: priceMode === "spot" ? "platform_market" : "excel_blended_kwh",
      smpPricePerKwh: metrics.market.smpPrice,
      recPricePerRec: metrics.market.recPrice,
      recWeight: metrics.recWeight,
      blendedWonPerKwh: fixedBlended,
      priceScenario: priceMode === "spot" ? "current_spot_reference" : "user_fixed_price",
      totalCapexWon: totalCapex,
      equityWon: equity,
      loanWon: loan,
      interestRate: rate,
      graceYears: grace,
      loanTermYears: term,
      analysisYears: 20,
      discountRate: 0.05,
      annualOmCostWon: om,
      annualInsuranceCostWon: insurance,
      annualOtherCostWon: 0,
      inverterReplacementYear: 10,
      inverterReplacementCostWon: 7_000_000,
      businessType: "rps",
    };
    return base;
  }, [
    canRun,
    metrics.capacityKw,
    metrics.annualGenerationKwh,
    metrics.market.smpPrice,
    metrics.market.recPrice,
    metrics.recWeight,
    priceMode,
    fixedBlended,
    totalCapex,
    equity,
    loan,
    rate,
    grace,
    term,
    om,
    insurance,
  ]);

  const result = useMemo(() => (input ? runInvestmentAnalysis(input) : null), [input]);
  const sensitivity = useMemo(() => (input ? runPriceSensitivity(input, [-0.2, 0, 0.2]) : []), [input]);

  if (household) return null;

  return (
    <section id="investment-analysis" className="scroll-mt-28" aria-labelledby="investment-heading">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-5 py-6 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Long-term Simulation</p>
          <h2 id="investment-heading" className="mt-2 text-[28px] font-extrabold text-navy sm:text-[32px]">
            장기 투자수익 시뮬레이션
          </h2>
          <p className="mt-2 max-w-3xl text-[15px] text-slate-600">
            위의 “현재 시장가격 기준 예상 연간수익”과 별개로, 20년 현금흐름·자기자본 IRR·NPV를 시뮬레이션합니다.
            엔진 v{INVESTMENT_ENGINE_VERSION} · RPS 사업용.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            자동 적용: 설비용량 {capacity || "—"} · 연간 발전량{" "}
            {metrics.annualGenerationKwh.toLocaleString("ko-KR")} kWh · REC 가중치 {metrics.recWeight}
          </p>
        </div>

        <div className="px-5 py-5 sm:px-8">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-11 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white"
            aria-expanded={open}
          >
            {open ? "투자조건 접기" : "투자조건 설정"}
          </button>

          {open ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm">
                <span className="font-semibold text-slate-700">총 사업비 (원)</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={totalCapex || ""}
                  onChange={(e) => setTotalCapex(Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700">자기자본 (원)</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={equity || ""}
                  onChange={(e) => setEquity(Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700">대출금 (원)</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={loan || ""}
                  onChange={(e) => setLoan(Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700">대출금리 (연, 소수)</span>
                <input
                  type="number"
                  step="0.001"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700">거치기간 (년)</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={grace}
                  onChange={(e) => setGrace(Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700">대출기간 (년, 거치 포함)</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={term}
                  onChange={(e) => setTerm(Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700">연 유지보수비 (원)</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={om}
                  onChange={(e) => setOm(Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700">연 보험/기타 (원)</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={insurance}
                  onChange={(e) => setInsurance(Number(e.target.value) || 0)}
                />
              </label>
              <div className="text-sm">
                <span className="font-semibold text-slate-700">장기 가격 기준</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${priceMode === "spot" ? "bg-navy text-white" : "bg-white ring-1 ring-slate-300"}`}
                    onClick={() => setPriceMode("spot")}
                  >
                    현재 단가 단순 적용
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${priceMode === "fixed" ? "bg-navy text-white" : "bg-white ring-1 ring-slate-300"}`}
                    onClick={() => setPriceMode("fixed")}
                  >
                    직접 장기단가
                  </button>
                </div>
                {priceMode === "fixed" ? (
                  <input
                    type="number"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={fixedBlended}
                    onChange={(e) => setFixedBlended(Number(e.target.value) || 0)}
                    aria-label="통합 원/kWh"
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {!canRun ? (
            <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
              총 사업비를 입력하면 장기 투자 시뮬레이션이 계산됩니다.
              {defaultCapex <= 0 ? " (회사 기본 원/kW 단가가 없어 자동 채우지 않습니다.)" : ""}
            </p>
          ) : result ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr_1.1fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">자금구조</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">총 사업비</dt>
                    <dd className="font-bold text-navy">{formatManwon(totalCapex)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">자기자본</dt>
                    <dd className="font-bold text-navy">{formatManwon(equity)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">대출</dt>
                    <dd className="font-bold text-navy">{formatManwon(loan)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">금리</dt>
                    <dd className="font-bold text-navy">{(rate * 100).toFixed(2)}%</dd>
                  </div>
                  {result.fundingGapWon > 0 ? (
                    <div className="flex justify-between gap-3 text-amber-800">
                      <dt>추가 조달 필요</dt>
                      <dd className="font-bold">{formatManwon(result.fundingGapWon)}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">투자수익</p>
                <p className="mt-3 text-sm text-slate-500">자기자본 IRR</p>
                <p className="text-[36px] font-extrabold tracking-tight text-navy">{formatPct(result.equityIrr)}</p>
                <p className="mt-4 text-sm text-slate-500">예상 투자금 회수</p>
                <p className="text-[28px] font-extrabold text-sky-700">
                  {result.cashflowPaybackYearsExact != null
                    ? `약 ${result.cashflowPaybackYearsExact.toFixed(1)}년`
                    : result.cashflowPaybackYear != null
                      ? `${result.cashflowPaybackYear}년차`
                      : "회수 불가"}
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  NPV {formatManwon(result.npvWon ?? 0)} · 20년 누적{" "}
                  {formatManwon(result.totalNetEquityCashflowWon)}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">누적 현금흐름 (요약)</p>
                <div className="mt-3 flex h-28 items-end gap-0.5">
                  {result.years.slice(0, 21).map((y) => {
                    const maxAbs = Math.max(
                      ...result.years.map((row) => Math.abs(row.cumulativeEquityCashFlowWon)),
                      1,
                    );
                    const h = Math.max(4, Math.round((Math.abs(y.cumulativeEquityCashFlowWon) / maxAbs) * 100));
                    const positive = y.cumulativeEquityCashFlowWon >= 0;
                    return (
                      <div
                        key={y.year}
                        className={`w-full rounded-t ${positive ? "bg-emerald-500" : "bg-slate-400"}`}
                        style={{ height: `${h}%` }}
                        title={`${y.year}년: ${Math.round(y.cumulativeEquityCashFlowWon).toLocaleString("ko-KR")}원`}
                      />
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">회색=미회수 · 초록=누적 회수 이후</p>
              </div>
            </div>
          ) : null}

          {result && sensitivity.length > 0 ? (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-sm font-bold text-navy">시장가격 민감도 (간단)</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                {sensitivity.map((s) => (
                  <li key={s.label} className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                    <p className="text-xs font-semibold text-slate-500">{s.label}</p>
                    <p className="mt-1 text-lg font-extrabold text-navy">{formatPct(s.equityIrr)}</p>
                    <p className="text-xs text-slate-500">
                      회수 {s.cashflowPaybackYear != null ? `${s.cashflowPaybackYear}년차` : "—"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result ? (
            <details className="mt-6 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
              <summary className="cursor-pointer text-sm font-bold text-navy">적용 가정 보기</summary>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                <li>분석기간 20년 · 성능저하 0.5%/년 · 할인율 5%</li>
                <li>
                  가격:{" "}
                  {priceMode === "spot"
                    ? `현재 단가 단순 적용 (SMP ${metrics.market.smpPrice}원/kWh · REC ${metrics.market.recPrice.toLocaleString("ko-KR")}원/REC)`
                    : `장기 통합단가 ${fixedBlended}원/kWh`}
                </li>
                <li>인버터 교체: 10년차 · 700만원 (가정)</li>
                <li>미포함: {result.assumptions.excludedItems.join(", ")}</li>
              </ul>
            </details>
          ) : null}

          <p className="mt-5 text-sm leading-relaxed text-slate-500">
            본 분석은 입력값 및 설정된 가정을 기반으로 한 추정치이며, 실제 투자수익은 발전량, 시장가격,
            금융조건, 시공비, 세금, 계통연계 및 운영조건 등에 따라 달라질 수 있습니다. 보장수익이 아닙니다.
            {result?.warnings?.[0] ? ` (${result.warnings[0]})` : ""}
          </p>
          {metrics.market.isFallback && priceMode === "spot" ? (
            <p className="mt-2 text-sm font-semibold text-amber-800">
              현재 시장가격이 참고 단가입니다. 장기 시뮬레이션에도 참고 단가가 적용됩니다.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
