import type { ResolvedSiteReview } from "@/types/siteReview";
import { isHouseholdInstallType } from "@/lib/solar/householdSavings";
import { runInvestmentAnalysis } from "@/lib/investment/engine";
import { INVESTMENT_ENGINE_VERSION } from "@/lib/investment/types";
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

/**
 * PDF investment block — only when construction estimate exists (RPS).
 * Uses documented default financing (40% equity / 60% loan, Excel-like OPEX).
 */
export function renderInvestmentSection(data: ResolvedSiteReview): string {
  const m = data.solarMetrics;
  if (isHouseholdInstallType(m.installType)) return "";
  if (!(m.constructionCostWon > 0) || !(m.annualGenerationKwh > 0)) {
    return `
    <div class="section-head" style="margin-top:18px">
      <div class="accent"></div>
      <div>
        <h2>투자 수익성 분석</h2>
        <p>장기 시뮬레이션 (엔진 v${htmlText(INVESTMENT_ENGINE_VERSION)})</p>
      </div>
    </div>
    <div class="notice compact">총 사업비(설치비) 입력이 필요합니다. 웹 결과의 「투자조건 설정」에서 확인하세요.</div>
    <div class="notice amber" style="margin-top:8px">${htmlText(PDF_INVESTMENT_DISCLAIMER)}</div>`;
  }

  const totalCapex = m.constructionCostWon;
  const equity = Math.round(totalCapex * 0.4);
  const loan = Math.round(totalCapex * 0.6);
  const result = runInvestmentAnalysis({
    capacityKw: m.capacityKw,
    year1GenerationKwh: m.annualGenerationKwh,
    degradationRate: 0.005,
    revenueMode: "platform_market",
    smpPricePerKwh: m.market.smpPrice,
    recPricePerRec: m.market.recPrice,
    recWeight: m.recWeight,
    priceScenario: "current_spot_reference",
    totalCapexWon: totalCapex,
    equityWon: equity,
    loanWon: loan,
    interestRate: 0.047,
    graceYears: 3,
    loanTermYears: 20,
    analysisYears: 20,
    discountRate: 0.05,
    annualOmCostWon: 1_500_000,
    annualInsuranceCostWon: 500_000,
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

  return `
    <div class="section-head" style="margin-top:18px">
      <div class="accent"></div>
      <div>
        <h2>투자 수익성 분석</h2>
        <p>20년 장기 시뮬레이션 · 자기자본 IRR · 엔진 v${htmlText(INVESTMENT_ENGINE_VERSION)}</p>
      </div>
    </div>
    <div class="cap-grid avoid-break">
      <div class="cap-card">
        <div class="cap-label">총 예상 사업비</div>
        <div class="cap-value">${htmlText(formatManwon(totalCapex))}</div>
      </div>
      <div class="cap-card">
        <div class="cap-label">자기자본 (가정 40%)</div>
        <div class="cap-value">${htmlText(formatManwon(equity))}</div>
      </div>
      <div class="cap-card">
        <div class="cap-label">대출 (가정 60%)</div>
        <div class="cap-value">${htmlText(formatManwon(loan))}</div>
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
        <div class="cap-label">NPV (할인율 5%)</div>
        <div class="cap-value">${htmlText(formatManwon(result.npvWon ?? 0))}</div>
      </div>
    </div>
    <div class="card avoid-break" style="margin-top:10px">
      <div class="row"><span class="label">시장가격 기준</span><span class="val">현재 단가 단순 적용 · ${htmlText(String(marketDate))}</span></div>
      <div class="row"><span class="label">SMP / REC</span><span class="val">${m.market.smpPrice.toLocaleString("ko-KR")}원/kWh · ${m.market.recPrice.toLocaleString("ko-KR")}원/REC · 가중치 ${m.recWeight}</span></div>
      <div class="row"><span class="label">대출조건</span><span class="val">금리 4.7% · 거치 3년 · 기간 20년</span></div>
      <div class="row"><span class="label">20년 누적 순현금흐름</span><span class="val">${htmlText(formatManwon(result.totalNetEquityCashflowWon))}</span></div>
      <div class="row"><span class="label">성능저하</span><span class="val">0.5%/년 · 인버터 교체 10년차 700만원</span></div>
    </div>
    <div class="notice compact" style="margin-top:8px">${htmlText(PDF_INVESTMENT_EXCLUDED)}</div>
    <div class="notice amber" style="margin-top:6px">${htmlText(PDF_INVESTMENT_DISCLAIMER)}</div>`;
}
