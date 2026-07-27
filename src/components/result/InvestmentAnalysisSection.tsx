"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
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

function CumulativeCashFlowChart({
  years,
  paybackYear,
  paybackExact,
}: {
  years: { year: number; cumulativeEquityCashFlowWon: number; equityCashFlowWon: number }[];
  paybackYear: number | null;
  paybackExact: number | null;
}) {
  const [hover, setHover] = useState<{
    year: number;
    annual: number;
    cumulative: number;
    xPct: number;
  } | null>(null);
  const series = years.slice(0, 21);
  const values = series.map((y) => y.cumulativeEquityCashFlowWon);
  const maxAbs = Math.max(...values.map((v) => Math.abs(v)), 1);
  const w = 640;
  const h = 240;
  const padX = 8;
  const padY = 16;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const zeroY = padY + (maxAbs / (maxAbs * 2)) * innerH;

  const coords = series.map((y, i) => {
    const x = padX + (series.length <= 1 ? 0 : (i / (series.length - 1)) * innerW);
    const ny = padY + ((maxAbs - y.cumulativeEquityCashFlowWon) / (maxAbs * 2)) * innerH;
    return { x, y: ny, data: y };
  });

  const paybackIndex =
    paybackExact != null
      ? Math.min(Math.max(Math.round(paybackExact), 0), series.length - 1)
      : paybackYear != null
        ? Math.min(paybackYear, series.length - 1)
        : null;

  const prePoints = paybackIndex != null ? coords.slice(0, paybackIndex + 1) : coords;
  const postPoints = paybackIndex != null ? coords.slice(paybackIndex) : [];

  const toPolyline = (pts: typeof coords) => pts.map((p) => `${p.x},${p.y}`).join(" ");

  const paybackX =
    paybackExact != null && series.length > 1
      ? padX + (Math.min(Math.max(paybackExact, 0), series.length - 1) / (series.length - 1)) * innerW
      : paybackYear != null && series.length > 1
        ? padX + (paybackYear / (series.length - 1)) * innerW
        : null;

  const last = series[series.length - 1];
  const areaPoints = `${padX},${zeroY} ${toPolyline(coords)} ${padX + innerW},${zeroY}`;

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(ratio * (series.length - 1));
    const y = series[idx];
    if (!y) return;
    setHover({
      year: y.year,
      annual: y.equityCashFlowWon,
      cumulative: y.cumulativeEquityCashFlowWon,
      xPct: (idx / Math.max(series.length - 1, 1)) * 100,
    });
  };

  const paybackLabel =
    paybackExact != null
      ? `${paybackExact.toFixed(1)}년`
      : paybackYear != null
        ? `${paybackYear}년차`
        : null;

  return (
    <div className="relative mt-2">
      {hover ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl bg-navy px-3 py-2 text-[12px] text-white shadow-lg"
          style={{ left: `${hover.xPct}%`, top: 0 }}
        >
          <p className="font-bold">{hover.year}년차</p>
          <p className="mt-1 text-slate-200">연간 {Math.round(hover.annual).toLocaleString("ko-KR")}원</p>
          <p className="text-slate-200">누적 {Math.round(hover.cumulative).toLocaleString("ko-KR")}원</p>
        </div>
      ) : null}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-[220px] w-full sm:h-[280px]"
        role="img"
        aria-label="20년 누적 자기자본 현금흐름"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <line x1={padX} y1={zeroY} x2={padX + innerW} y2={zeroY} stroke="#64748b" strokeWidth="1" />
        <polygon points={areaPoints} fill="rgba(14, 165, 233, 0.1)" />
        {prePoints.length > 1 ? (
          <polyline
            points={toPolyline(prePoints)}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {postPoints.length > 1 ? (
          <polyline
            points={toPolyline(postPoints)}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {paybackX != null ? (
          <>
            <line
              x1={paybackX}
              y1={padY}
              x2={paybackX}
              y2={padY + innerH}
              stroke="#0ea5e9"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text x={paybackX + 6} y={padY + 12} fill="#7dd3fc" fontSize="11" fontWeight="600">
              예상 투자금 회수 {paybackLabel}
            </text>
          </>
        ) : null}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>0년</span>
        <span>10년</span>
        <span>20년</span>
      </div>
      {last ? (
        <p className="mt-2 text-right text-[13px] font-semibold text-sky-200">
          20년 누적 {Math.round(last.cumulativeEquityCashFlowWon).toLocaleString("ko-KR")}원
        </p>
      ) : null}
    </div>
  );
}

/**
 * Long-term investment — default view = payback/IRR + cashflow curve.
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
    <div id="investment-analysis" className="mt-12 min-h-[600px] rounded-[22px] bg-[#0b1d3a] px-5 py-10 text-white sm:px-7 sm:py-12" aria-labelledby="investment-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-sky-300">장기 투자수익 시뮬레이션</p>
          <h3 id="investment-heading" className="mt-2 text-[30px] font-extrabold text-white sm:text-[36px]">
            20년 투자 수익성
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 items-center rounded-xl border border-white/25 px-4 text-sm font-bold text-white hover:bg-white/10"
        >
          투자조건 조정
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/50" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0" aria-label="닫기" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex h-full w-full max-w-[460px] flex-col bg-white text-slate-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h4 className="text-lg font-extrabold text-navy">투자조건 조정</h4>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-8 overflow-y-auto p-5 sm:p-6">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-slate-500">투자금</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <label className="text-sm">
                <span className="font-semibold text-slate-700">총 사업비 (원) · 참고</span>
                <input
                  type="number"
                  className="mt-1 w-full border-b border-slate-300 bg-transparent px-0 py-2 outline-none focus:border-navy"
                  value={totalCapex || ""}
                  onChange={(e) => setTotalCapex(Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700">자기자본 (원)</span>
                <input
                  type="number"
                  className="mt-1 w-full border-b border-slate-300 bg-transparent px-0 py-2 outline-none focus:border-navy"
                  value={equity || ""}
                  onChange={(e) => setEquity(Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700">대출금 (원)</span>
                <input
                  type="number"
                  className="mt-1 w-full border-b border-slate-300 bg-transparent px-0 py-2 outline-none focus:border-navy"
                  value={loan || ""}
                  onChange={(e) => setLoan(Number(e.target.value) || 0)}
                />
              </label>
            </div>
          </div>
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-slate-500">금융조건</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <label className="text-sm">
                <span className="font-semibold text-slate-700">대출금리 (연, 소수)</span>
                <input
                  type="number"
                  step="0.001"
                  className="mt-1 w-full border-b border-slate-300 bg-transparent px-0 py-2 outline-none focus:border-navy"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700">거치기간 (년)</span>
                <input
                  type="number"
                  className="mt-1 w-full border-b border-slate-300 bg-transparent px-0 py-2 outline-none focus:border-navy"
                  value={grace}
                  onChange={(e) => setGrace(Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700">대출기간 (년)</span>
                <input
                  type="number"
                  className="mt-1 w-full border-b border-slate-300 bg-transparent px-0 py-2 outline-none focus:border-navy"
                  value={term}
                  onChange={(e) => setTerm(Number(e.target.value) || 0)}
                />
              </label>
            </div>
          </div>
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-slate-500">운영조건 · 장기가정</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <label className="text-sm">
                <span className="font-semibold text-slate-700">연 유지보수비 (원)</span>
                <input
                  type="number"
                  className="mt-1 w-full border-b border-slate-300 bg-transparent px-0 py-2 outline-none focus:border-navy"
                  value={om}
                  onChange={(e) => setOm(Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700">연 보험/기타 (원)</span>
                <input
                  type="number"
                  className="mt-1 w-full border-b border-slate-300 bg-transparent px-0 py-2 outline-none focus:border-navy"
                  value={insurance}
                  onChange={(e) => setInsurance(Number(e.target.value) || 0)}
                />
              </label>
              <label className="text-sm">
                <span className="font-semibold text-slate-700">할인율 (NPV)</span>
                <input
                  type="number"
                  step="0.001"
                  className="mt-1 w-full border-b border-slate-300 bg-transparent px-0 py-2 outline-none focus:border-navy"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(Number(e.target.value) || 0)}
                />
              </label>
            </div>
            <div className="mt-4 text-sm">
              <span className="font-semibold text-slate-700">장기 가격 기준</span>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`px-3 py-2 text-sm font-semibold ${priceMode === "spot" ? "bg-navy text-white" : "bg-slate-100 text-slate-700"}`}
                  onClick={() => setPriceMode("spot")}
                >
                  현재 단가 단순 적용
                </button>
                <button
                  type="button"
                  className={`px-3 py-2 text-sm font-semibold ${priceMode === "fixed" ? "bg-navy text-white" : "bg-slate-100 text-slate-700"}`}
                  onClick={() => setPriceMode("fixed")}
                >
                  직접 장기단가
                </button>
              </div>
              {priceMode === "fixed" ? (
                <input
                  type="number"
                  className="mt-2 w-full max-w-xs border-b border-slate-300 bg-transparent px-0 py-2 outline-none focus:border-navy"
                  value={fixedBlended}
                  onChange={(e) => setFixedBlended(Number(e.target.value) || 0)}
                  aria-label="통합 원/kWh"
                />
              ) : null}
            </div>
          </div>
            </div>
          </div>
        </div>
      ) : null}

      {!canRun ? (
        <p className="mt-6 text-sm text-amber-200">
          총 사업비(참고)를 입력하면 장기 투자 시뮬레이션이 계산됩니다.
          {defaultCapex <= 0 ? " 회사 기본 원/kW가 없어 자동 채우지 않습니다." : ""}
        </p>
      ) : result ? (
        <>
          <div className="mt-10 grid items-start gap-10 lg:grid-cols-[0.38fr_0.62fr] lg:gap-12">
            <div>
              <p className="text-[14px] text-slate-300">예상 투자금 회수</p>
              <p className="mt-1 text-[58px] font-extrabold leading-none tracking-tight text-white sm:text-[68px]">
                {paybackLabel}
              </p>
              <p className="mt-8 text-[14px] text-slate-300">자기자본 IRR</p>
              <p className="mt-1 text-[48px] font-extrabold leading-none tracking-tight text-sky-300 sm:text-[54px]">
                {formatPct(result.equityIrr)}
              </p>

              <div className="mt-10 space-y-3 border-t border-white/20 pt-6 text-[14px]">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-300">참고 사업비</span>
                  <span className="font-bold text-white">{formatManwon(totalCapex)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-300">자기자본</span>
                  <span className="font-bold text-white">{formatManwon(equity)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-300">대출</span>
                  <span className="font-bold text-white">{formatManwon(loan)}</span>
                </div>
                {result.fundingGapWon > 0 ? (
                  <div className="flex justify-between gap-3 text-amber-800">
                    <span>추가 조달 필요</span>
                    <span className="font-bold">{formatManwon(result.fundingGapWon)}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-sky-200">
                20년 누적 현금흐름
              </p>
              <CumulativeCashFlowChart
                years={result.years}
                paybackYear={result.cashflowPaybackYear}
                paybackExact={result.cashflowPaybackYearsExact}
              />
            </div>
          </div>

          {sensitivity.length > 0 ? (
            <ul className="mt-12 grid gap-6 sm:grid-cols-3">
              {sensitivity.map((s) => (
                <li key={s.label} className="border-t border-white/20 pt-4">
                  <p className="text-[12px] font-semibold text-slate-300">
                    {s.label.replace("시장가격", "시장")}
                  </p>
                  <p className="mt-2 text-[30px] font-extrabold text-white">{formatPct(s.equityIrr)}</p>
                  <p className="mt-1 text-[13px] text-slate-300">자기자본 IRR</p>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="text-sm font-semibold text-sky-300 underline-offset-2 hover:underline"
              onClick={() => setAdvancedOpen((v) => !v)}
              aria-expanded={advancedOpen}
            >
              {advancedOpen ? "전문 지표 접기" : "전문 수익성 지표 · 가정 보기"}
            </button>
            <p className="text-sm text-slate-300">입력값과 적용 가정에 따른 추정치입니다.</p>
          </div>

          {advancedOpen ? (
            <div className="mt-4 space-y-3 text-sm text-slate-200">
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
