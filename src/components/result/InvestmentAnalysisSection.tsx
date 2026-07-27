"use client";

import { useEffect, useMemo, useState } from "react";
import { useResultMetrics } from "@/components/result/ResultMetricsProvider";
import { isHouseholdInstallType } from "@/lib/solar/householdSavings";
import { runInvestmentAnalysis } from "@/lib/investment/engine";
import { runPriceSensitivity } from "@/lib/investment/sensitivity";
import { INVESTMENT_ENGINE_VERSION, type InvestmentAnalysisInput } from "@/lib/investment/types";
import { saveInvestmentScenario } from "@/lib/investment/scenarioStorage";

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
 * Long-term investment — default view = 4 key values + cashflow curve.
 * Settings / NPV / full sensitivity behind progressive disclosure.
 * Engine math unchanged (v1.0.0).
 */
export default function InvestmentAnalysisSection() {
  const { metrics, capacity, installType } = useResultMetrics();
  const household = isHouseholdInstallType(installType);

  const defaultCapex = metrics.constructionCostWon > 0 ? metrics.constructionCostWon : 0;
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [totalCapex, setTotalCapex] = useState(defaultCapex);
  const [equity, setEquity] = useState(defaultCapex > 0 ? Math.round(defaultCapex * 0.4) : 0);
  const [loan, setLoan] = useState(defaultCapex > 0 ? Math.round(defaultCapex * 0.6) : 0);
  const [rate, setRate] = useState(0.047);
  const [grace, setGrace] = useState(3);
  const [term, setTerm] = useState(20);
  const [om, setOm] = useState(1_500_000);
  const [insurance, setInsurance] = useState(500_000);
  const [discountRate, setDiscountRate] = useState(0.05);
  const [priceMode, setPriceMode] = useState<"spot" | "fixed">("spot");
  const [fixedBlended, setFixedBlended] = useState(193);

  const canRun = !household && totalCapex > 0 && equity >= 0 && loan >= 0 && metrics.annualGenerationKwh > 0;

  const input: InvestmentAnalysisInput | null = useMemo(() => {
    if (!canRun) return null;
    return {
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
      discountRate,
      annualOmCostWon: om,
      annualInsuranceCostWon: insurance,
      annualOtherCostWon: 0,
      inverterReplacementYear: 10,
      inverterReplacementCostWon: 7_000_000,
      businessType: "rps",
    };
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
    discountRate,
  ]);

  const result = useMemo(() => (input ? runInvestmentAnalysis(input) : null), [input]);
  const sensitivity = useMemo(() => (input ? runPriceSensitivity(input, [-0.1, 0, 0.1]) : []), [input]);

  useEffect(() => {
    if (!canRun) return;
    saveInvestmentScenario({
      totalCapexWon: totalCapex,
      equityWon: equity,
      loanWon: loan,
      interestRate: rate,
      graceYears: grace,
      loanTermYears: term,
      annualOmCostWon: om,
      annualInsuranceCostWon: insurance,
      discountRate,
      priceMode,
      blendedWonPerKwh: fixedBlended,
    });
  }, [
    canRun,
    totalCapex,
    equity,
    loan,
    rate,
    grace,
    term,
    om,
    insurance,
    discountRate,
    priceMode,
    fixedBlended,
  ]);

  if (household) return null;

  const paybackLabel =
    result?.cashflowPaybackYearsExact != null
      ? `약 ${result.cashflowPaybackYearsExact.toFixed(1)}년`
      : result?.cashflowPaybackYear != null
        ? `${result.cashflowPaybackYear}년차`
        : "회수 불가";

  return (
    <div id="investment-analysis" className="mt-14 border-t border-slate-200 pt-12" aria-labelledby="investment-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-sky-700">장기 투자수익 시뮬레이션</p>
          <h3 id="investment-heading" className="mt-2 text-[26px] font-extrabold text-navy sm:text-[30px]">
            20년 투자 수익성
          </h3>
          <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
            위 1년 시장수익과 별개입니다. 자동 적용: 설비용량 {capacity || "—"} · 발전량{" "}
            {metrics.annualGenerationKwh.toLocaleString("ko-KR")} kWh · REC 가중치 {metrics.recWeight}
            <span className="text-slate-400"> · engine {INVESTMENT_ENGINE_VERSION}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-11 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white"
          aria-expanded={open}
        >
          {open ? "투자조건 접기" : "투자조건 조정"}
        </button>
      </div>

      {open ? (
        <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            <span className="font-semibold text-slate-700">총 사업비 (원) · 참고</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              value={totalCapex || ""}
              onChange={(e) => setTotalCapex(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-slate-700">자기자본 (원)</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              value={equity || ""}
              onChange={(e) => setEquity(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-slate-700">대출금 (원)</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              value={loan || ""}
              onChange={(e) => setLoan(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-slate-700">대출금리 (연, 소수)</span>
            <input
              type="number"
              step="0.001"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-slate-700">거치기간 (년)</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              value={grace}
              onChange={(e) => setGrace(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-slate-700">대출기간 (년)</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              value={term}
              onChange={(e) => setTerm(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-slate-700">연 유지보수비 (원)</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              value={om}
              onChange={(e) => setOm(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-slate-700">연 보험/기타 (원)</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              value={insurance}
              onChange={(e) => setInsurance(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-slate-700">할인율 (NPV)</span>
            <input
              type="number"
              step="0.001"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              value={discountRate}
              onChange={(e) => setDiscountRate(Number(e.target.value) || 0)}
            />
          </label>
          <div className="text-sm sm:col-span-2 lg:col-span-3">
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
                className="mt-2 w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2"
                value={fixedBlended}
                onChange={(e) => setFixedBlended(Number(e.target.value) || 0)}
                aria-label="통합 원/kWh"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {!canRun ? (
        <p className="mt-6 text-sm text-amber-900">
          총 사업비(참고)를 입력하면 장기 투자 시뮬레이션이 계산됩니다.
          {defaultCapex <= 0 ? " 회사 기본 원/kW가 없어 자동 채우지 않습니다." : ""}
        </p>
      ) : result ? (
        <>
          <div className="mt-10 grid gap-10 lg:grid-cols-[0.9fr_0.75fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">자금 구조</p>
              <p className="mt-4 text-sm text-slate-500">참고 사업비</p>
              <p className="mt-1 text-[28px] font-extrabold text-navy">{formatManwon(totalCapex)}</p>
              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">자기자본</dt>
                  <dd className="font-bold text-navy">{formatManwon(equity)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">대출</dt>
                  <dd className="font-bold text-navy">{formatManwon(loan)}</dd>
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
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">투자 수익</p>
              <p className="mt-4 text-sm text-slate-500">예상 투자금 회수</p>
              <p className="mt-1 text-[36px] font-extrabold tracking-tight text-sky-700">{paybackLabel}</p>
              <p className="mt-6 text-sm text-slate-500">자기자본 IRR</p>
              <p className="mt-1 text-[40px] font-extrabold tracking-tight text-navy">{formatPct(result.equityIrr)}</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">20년 누적 현금흐름</p>
              <div className="mt-4 flex h-40 items-end gap-0.5 sm:h-48">
                {result.years.slice(0, 21).map((y) => {
                  const maxAbs = Math.max(
                    ...result.years.map((row) => Math.abs(row.cumulativeEquityCashFlowWon)),
                    1,
                  );
                  const h = Math.max(4, Math.round((Math.abs(y.cumulativeEquityCashFlowWon) / maxAbs) * 100));
                  const positive = y.cumulativeEquityCashFlowWon >= 0;
                  const isPayback =
                    result.cashflowPaybackYear != null && y.year === result.cashflowPaybackYear;
                  return (
                    <div
                      key={y.year}
                      className={`relative w-full rounded-t ${positive ? "bg-emerald-500" : "bg-slate-300"} ${isPayback ? "ring-2 ring-sky-500 ring-offset-1" : ""}`}
                      style={{ height: `${h}%` }}
                      title={`${y.year}년: ${Math.round(y.cumulativeEquityCashFlowWon).toLocaleString("ko-KR")}원`}
                    />
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">회색=미회수 · 초록=누적 회수 이후 · 하늘색 링=회수 시점</p>
            </div>
          </div>

          {sensitivity.length > 0 ? (
            <ul className="mt-10 grid gap-3 sm:grid-cols-3">
              {sensitivity.map((s) => (
                <li key={s.label} className="border-t border-slate-200 pt-3">
                  <p className="text-xs font-semibold text-slate-500">{s.label.replace("시장가격", "시장")}</p>
                  <p className="mt-1 text-xl font-extrabold text-navy">{formatPct(s.equityIrr)}</p>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="text-sm font-semibold text-sky-800 underline-offset-2 hover:underline"
              onClick={() => setAdvancedOpen((v) => !v)}
              aria-expanded={advancedOpen}
            >
              {advancedOpen ? "전문 지표 접기" : "전문 수익성 지표 · 가정 보기"}
            </button>
            <p className="text-sm text-slate-500">입력값과 적용 가정에 따른 추정치입니다.</p>
          </div>

          {advancedOpen ? (
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>
                NPV({(discountRate * 100).toFixed(1)}%): {formatManwon(result.npvWon ?? 0)} · 20년 누적{" "}
                {formatManwon(result.totalNetEquityCashflowWon)} · 금리 {(rate * 100).toFixed(2)}% · 거치{" "}
                {grace}년
              </p>
              <p>
                가격:{" "}
                {priceMode === "spot"
                  ? `현재 단가 단순 적용 (SMP ${metrics.market.smpPrice}원/kWh · REC ${metrics.market.recPrice.toLocaleString("ko-KR")}원/REC)`
                  : `장기 통합단가 ${fixedBlended}원/kWh`}
              </p>
              <p>성능저하 0.5%/년 · 인버터 교체 10년차 700만원 · 미포함: {result.assumptions.excludedItems.join(", ")}</p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
