import type { ResolvedSiteReview } from "@/types/siteReview";
import { isHouseholdInstallType } from "@/lib/solar/householdSavings";
import { runInvestmentAnalysis } from "@/lib/investment/engine";
import { INVESTMENT_ENGINE_VERSION } from "@/lib/investment/types";
import type { InvestmentScenarioPayload } from "@/lib/investment/scenarioStorage";
import {
  PDF_INVESTMENT_DISCLAIMER,
  PDF_INVESTMENT_EXCLUDED,
} from "@/lib/pdf/reportContent";
import { htmlText } from "@/lib/pdf/html/escape";

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

function resolveScenario(
  data: ResolvedSiteReview,
  scenario?: InvestmentScenarioPayload | null,
) {
  const m = data.solarMetrics;
  const defaultCapex = m.constructionCostWon > 0 ? m.constructionCostWon : 0;
  const totalCapex = scenario?.totalCapexWon ?? defaultCapex;
  const equity =
    scenario?.equityWon ?? (totalCapex > 0 ? Math.round(totalCapex * 0.4) : 0);
  const loan =
    scenario?.loanWon ?? (totalCapex > 0 ? Math.round(totalCapex * 0.6) : 0);
  const fromWeb = Boolean(scenario);

  return {
    totalCapex,
    equity,
    loan,
    interestRate: scenario?.interestRate ?? 0.047,
    graceYears: scenario?.graceYears ?? 3,
    loanTermYears: scenario?.loanTermYears ?? 20,
    annualOmCostWon: scenario?.annualOmCostWon ?? 1_500_000,
    annualInsuranceCostWon: scenario?.annualInsuranceCostWon ?? 500_000,
    discountRate: scenario?.discountRate ?? 0.05,
    priceMode: scenario?.priceMode ?? "spot",
    blendedWonPerKwh: scenario?.blendedWonPerKwh ?? 193,
    fromWeb,
  };
}

/**
 * PDF investment block — prefers web UI scenario when provided.
 */
export function renderInvestmentSection(
  data: ResolvedSiteReview,
  scenario?: InvestmentScenarioPayload | null,
): string {
  const m = data.solarMetrics;
  if (isHouseholdInstallType(m.installType)) return "";

  const s = resolveScenario(data, scenario);
  if (!(s.totalCapex > 0) || !(m.annualGenerationKwh > 0)) {
    return `
    <div class="section-head" style="margin-top:18px">
      <div class="accent"></div>
      <div>
        <h2>투자 수익성 분석</h2>
        <p>장기 시뮬레이션 (엔진 v${htmlText(INVESTMENT_ENGINE_VERSION)})</p>
      </div>
    </div>
    <div class="notice compact">총 사업비(설치비) 입력이 필요합니다. 웹 결과의 「투자조건 조정」에서 확인하세요.</div>
    <div class="notice amber" style="margin-top:8px">${htmlText(PDF_INVESTMENT_DISCLAIMER)}</div>`;
  }

  const useFixed = s.priceMode === "fixed";
  const result = runInvestmentAnalysis({
    capacityKw: m.capacityKw,
    year1GenerationKwh: m.annualGenerationKwh,
    degradationRate: 0.005,
    revenueMode: useFixed ? "excel_blended_kwh" : "platform_market",
    smpPricePerKwh: m.market.smpPrice,
    recPricePerRec: m.market.recPrice,
    recWeight: m.recWeight,
    blendedWonPerKwh: s.blendedWonPerKwh,
    priceScenario: useFixed ? "user_fixed_price" : "current_spot_reference",
    totalCapexWon: s.totalCapex,
    equityWon: s.equity,
    loanWon: s.loan,
    interestRate: s.interestRate,
    graceYears: s.graceYears,
    loanTermYears: s.loanTermYears,
    analysisYears: 20,
    discountRate: s.discountRate,
    annualOmCostWon: s.annualOmCostWon,
    annualInsuranceCostWon: s.annualInsuranceCostWon,
    annualOtherCostWon: 0,
    inverterReplacementYear: 10,
    inverterReplacementCostWon: 7_000_000,
    businessType: "rps",
  });

  const marketDate = m.market.smpDate || m.market.recDate || "기준일 확인";
  const payback =
    result.cashflowPaybackYearsExact != null
      ? `약 ${result.cashflowPaybackYearsExact.toFixed(1)}년`
      : result.cashflowPaybackYear != null
        ? `${result.cashflowPaybackYear}년차`
        : "—";

  const equityLabel = s.fromWeb ? "자기자본" : "자기자본 (가정 40%)";
  const loanLabel = s.fromWeb ? "대출" : "대출 (가정 60%)";
  const priceLabel = useFixed
    ? `장기 통합단가 ${s.blendedWonPerKwh}원/kWh`
    : `현재 단가 단순 적용 · ${marketDate}`;

  return `
    <div class="section-head" style="margin-top:18px">
      <div class="accent"></div>
      <div>
        <h2>투자 수익성 분석</h2>
        <p>20년 장기 시뮬레이션 · 자기자본 IRR · 엔진 v${htmlText(INVESTMENT_ENGINE_VERSION)}${s.fromWeb ? " · 웹 투자조건 반영" : ""}</p>
      </div>
    </div>
    <div class="cap-grid avoid-break">
      <div class="cap-card">
        <div class="cap-label">참고 사업비</div>
        <div class="cap-value">${htmlText(formatManwon(s.totalCapex))}</div>
      </div>
      <div class="cap-card">
        <div class="cap-label">${htmlText(equityLabel)}</div>
        <div class="cap-value">${htmlText(formatManwon(s.equity))}</div>
      </div>
      <div class="cap-card">
        <div class="cap-label">${htmlText(loanLabel)}</div>
        <div class="cap-value">${htmlText(formatManwon(s.loan))}</div>
      </div>
      <div class="cap-card">
        <div class="cap-label">예상 투자금 회수</div>
        <div class="cap-value">${htmlText(payback)}</div>
      </div>
      <div class="cap-card">
        <div class="cap-label">자기자본 IRR</div>
        <div class="cap-value">${htmlText(formatPct(result.equityIrr))}</div>
      </div>
      <div class="cap-card">
        <div class="cap-label">NPV (할인율 ${(s.discountRate * 100).toFixed(1)}%)</div>
        <div class="cap-value">${htmlText(formatManwon(result.npvWon ?? 0))}</div>
      </div>
    </div>
    <div class="card avoid-break" style="margin-top:10px">
      <div class="row"><span class="label">시장가격 기준</span><span class="val">${htmlText(priceLabel)}</span></div>
      <div class="row"><span class="label">SMP / REC</span><span class="val">${m.market.smpPrice.toLocaleString("ko-KR")}원/kWh · ${m.market.recPrice.toLocaleString("ko-KR")}원/REC · 가중치 ${m.recWeight}</span></div>
      <div class="row"><span class="label">대출조건</span><span class="val">금리 ${(s.interestRate * 100).toFixed(2)}% · 거치 ${s.graceYears}년 · 기간 ${s.loanTermYears}년</span></div>
      <div class="row"><span class="label">20년 누적 순현금흐름</span><span class="val">${htmlText(formatManwon(result.totalNetEquityCashflowWon))}</span></div>
      <div class="row"><span class="label">성능저하</span><span class="val">0.5%/년 · 인버터 교체 10년차 700만원</span></div>
    </div>
    <div class="notice compact" style="margin-top:8px">${htmlText(PDF_INVESTMENT_EXCLUDED)}</div>
    <div class="notice amber" style="margin-top:6px">${htmlText(PDF_INVESTMENT_DISCLAIMER)}</div>`;
}
