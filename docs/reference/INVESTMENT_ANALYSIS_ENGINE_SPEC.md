# Investment Analysis Engine — Technical Spec (STEP B)

**Source workbook:** `수익분석 기본 작업.xlsx`  
**Extract dump:** `docs/reference/excel-revenue-analysis-dump.json`  
**Cell-level extract:** `docs/reference/INVESTMENT_ENGINE_EXCEL_EXTRACT.md`  
**Status:** Design only — do **not** expose IRR/NPV to production users until Excel cross-validation passes.

---

## 1. Excel Sheet Inventory

| Sheet | Role |
|---|---|
| `입력값` | Yellow user inputs + derived CAPEX/loan/generation/OPEX/monthly coefficients |
| `월별분석` | Year-1 monthly generation × blended price − monthly OPEX |
| `연간분석` | 20-year cash flow (gen, revenue, opex, inverter, debt, net, cumulative, payback flag) |
| `수익성요약` | KPI dashboard + mini cash-flow mirror + chart placeholders |

---

## 2. Inputs (Excel yellow / editable)

### CAPEX / Funding
| Cell | Label | Sample | Unit | Notes |
|---|---|---|---|---|
| B5 | 설비용량 | 100 | kW | Manual in Excel; **web: auto from site analysis** |
| B6 | 총 설치비 | 230,000,000 | 원 | Primary CAPEX input |
| B7 | kW당 설치비 | `=B6/B5` | 원/kW | Derived |
| B8 | 자기자본 | 90,000,000 | 원 | Equity |
| B9 | 대출금 | `=B6-B8` | 원 | Residual debt (forces equity + loan = CAPEX) |
| B10 | 대출금리 | 4.7% | 연이율 | |
| B11 | 대출기간 | 20 | 년 | Includes grace |
| B12 | 거치기간 | 3 | 년 | Interest-only years |
| B13 | 분석기간 | 20 | 년 | |
| B14 | 할인율(NPV용) | 5% | 연이율 | |

### Generation / Price
| Cell | Label | Sample | Notes |
|---|---|---|---|
| B17 | 평균 이용률 | 15% | → hours ≈ 3.6/day |
| B18 | 연간 예상 발전량 | `=B5*B17*24*365` | 131,400 kWh |
| B19 | SMP | 123 | **원/kWh** |
| B20 | REC | 70 | **원/kWh (blended adder)** — not 원/REC |
| B21 | 평균 판매단가 | `=B19+B20` | 193 원/kWh |
| B22 | 성능저하율 | 0.5%/yr | |
| B23 | 인버터 교체연도 | 10 | |

### OPEX
| Cell | Label | Sample |
|---|---|---|
| B26 | 연 유지보수비 | 1,500,000 원/년 |
| B27 | 연 보험/기타비 | 500,000 원/년 |
| B28 | 인버터 교체비용 | 7,000,000 원 (once) |
| B29 | 총 연간 운영비 | `=B26+B27` |

### Monthly coefficients B34:B45
Sum ≈ 0.995 (not forced to 1.0). Used only for year-1 monthly split.

---

## 3. Formula Structure (normalized)

### Generation year n
```
Gen(n) = Gen1 * (1 - degradation)^(n - 1)
```
Excel: `입력값!B18*(1-입력값!B22)^(year-1)`

### Revenue (Excel model)
```
Revenue(n) = Gen(n) * (SMP_per_kWh + REC_per_kWh)
```
Excel treats REC as **원/kWh adder**. No REC weight, no `/1000`.

### Web platform market model (current production — different)
```
SMP_rev = Gen * SMP_원/kWh
REC_rev = (Gen / 1000) * REC_원/REC * weight
Total   = SMP_rev + REC_rev
```
**Policy decision required before engine production:** keep web market formula for “today revenue”, map Excel blended price only for long-term investment scenarios, or convert Excel REC 원/kWh ↔ 원/REC.

### Debt service year n
```
if n <= grace:
  DebtService = Loan * Rate          # interest only
else if n <= loanTerm:
  DebtService = PMT(Rate, loanTerm - grace, Loan)   # Excel -PMT → positive outflow
else:
  DebtService = 0
```
Excel F column:
`IF(year<=거치, 대출*금리, IF(year<=대출기간, -PMT(금리, 대출기간-거치, 대출), 0))`

### Cash flow
```
Year0 EquityCF = -Equity
YearN EquityCF = Revenue - OPEX - Inverter(if year==replaceYear) - DebtService
Cumulative(n)  = Cumulative(n-1) + EquityCF(n)
```

### Payback
- **Simple:** `Equity / Year1_EquityCF` (Excel B12) — ignores changing CF
- **Cumulative:** first year where `Cumulative >= 0` (Excel MATCH on H column) — **preferred for web**

### IRR / NPV
```
EquityIRR = IRR([Year0..YearN EquityCF])     # Excel IRR(G4:G24) ≈ 11.86%
NPV       = NPV(discount, Year1..YearN) + Year0
```
Excel NPV ≈ 48,506,450 원 at 5% discount.

---

## 4. Hidden / Implicit Assumptions

1. Loan always fills `CAPEX − Equity` (no over/under financing UI).
2. Prices fixed for 20 years (no inflation, no SMP/REC path).
3. REC modeled as 원/kWh, not certificate market.
4. No tax, VAT, depreciation, REC weight, curtailment, or connection cost.
5. Monthly coefficients sum ≠ 1.0 → annual monthly sum slightly under Gen1.
6. Grace interest is cash outflow but principal unchanged until amortization.
7. PMT amortization starts after grace with remaining term = loanTerm − grace (principal not reduced during grace — Excel treats full principal into PMT after grace).
8. Inverter replacement is single year lump sum, not capitalized into debt.
9. “총 수익률” = `SUM(all EquityCF including Year0) / Equity` (not CAGR).

---

## 5–12. Model Mapping Summary

| Topic | Excel | Web engine design |
|---|---|---|
| Annual gen | utilization formula | Prefer **site analysis actual** Gen1 |
| Monthly | coefficient × Gen1 | Prefer **site monthlyGeneration** |
| Revenue | blended 원/kWh | Dual: spot market formula + optional long-term unit price |
| CAPEX | total or 원/kW | User input; optional estimate from capacity × default 원/kW |
| Debt | grace + PMT | Same semantics |
| OPEX | fixed + inverter year | Same; no escalation unless Excel adds it |
| Payback | simple + cumulative | **Cumulative primary** |
| IRR | Equity IRR only | Equity IRR; Project IRR later |
| NPV | Equity CF @ discount | Same; show 만원/억 |

---

## 13. Excel Model Gaps to Improve (before prod)

1. Align REC unit with real market (원/REC × weight).
2. Force monthly coefficients to sum to 1.0.
3. Clarify grace-period principal accounting vs real bank schedules.
4. Add price scenario paths (flat / user long-term / avg30).
5. Separate Project vs Equity cash flows.
6. Optional DSCR (define numerator policy first).
7. Document tax/VAT exclusion explicitly in UI.

---

## 14. Auto-filled from Site Analysis

- capacityKw
- annualGenerationKwh (+ monthly series)
- installType
- base/usable area
- SMP, REC, REC weight, dates (from market API / fallback)
- optional constructionCostWon estimate

## 15. User Inputs (advanced form)

- totalCapex **or** costPerKw
- equityAmount (loan = capex − equity)
- loanRate, graceYears, loanTermYears
- annualOpex (or O&M + insurance split)
- inverterReplaceYear / cost
- analysisYears, discountRate
- longTermUnitPrice (optional scenario)
- degradationRate (default 0.5%)

---

## 16. TypeScript Types (proposed)

```ts
type PriceMode = "spot_market" | "blended_unit" | "user_long_term";

interface InvestmentInputs {
  capacityKw: number;
  year1GenerationKwh: number;
  monthlyGenerationKwh?: number[]; // length 12
  degradationRate: number;
  priceMode: PriceMode;
  smpWonPerKwh?: number;
  recWonPerRec?: number;
  recWeight?: number;
  blendedWonPerKwh?: number; // Excel-compatible
  userLongTermWonPerKwh?: number;
  totalCapexWon: number;
  equityWon: number; // loan = totalCapex - equity
  loanRate: number;
  graceYears: number;
  loanTermYears: number;
  annualOpexWon: number;
  inverterReplaceYear: number | null;
  inverterReplaceCostWon: number;
  analysisYears: number;
  discountRate: number;
}

interface YearCashFlow {
  year: number; // 0..N
  generationKwh: number;
  revenueWon: number;
  opexWon: number;
  inverterWon: number;
  debtServiceWon: number;
  equityCashFlowWon: number;
  cumulativeEquityWon: number;
}

interface InvestmentResult {
  years: YearCashFlow[];
  simplePaybackYears: number | null;
  cumulativePaybackYear: number | null;
  equityIrr: number | null;
  npvWon: number | null;
  totalEquityMultiple: number | null; // sum(CF)/equity
}
```

---

## 17. Utility Modules (proposed)

| Module | Responsibility |
|---|---|
| `lib/investment/generation.ts` | Gen(n), monthly split |
| `lib/investment/revenue.ts` | spot vs blended revenue |
| `lib/investment/debt.ts` | grace + PMT schedule |
| `lib/investment/cashflow.ts` | assemble YearCashFlow[] |
| `lib/investment/metrics.ts` | payback, IRR (Newton/bisection), NPV |
| `lib/investment/format.ts` | 원/만원/억 |
| `lib/investment/scenarios.ts` | price/gen/rate sensitivities |

Do **not** hardcode Excel sample outputs.

---

## 18. Test Plan

### Unit
0 capacity, 0 generation, 0 debt, 100% debt, grace edge, PMT after grace, REC weight 1.0/1.2/1.5 (spot mode), degradation, inverter year, negative CF, no payback, IRR failure, NPV≈0.

### Excel cross-validation (min 3 scenarios)
| # | Capacity | Capex | Equity | Rate | Notes |
|---|---|---|---|---|---|
| S1 | 100kW | 230M | 90M | 4.7% | Workbook default |
| S2 | 100kW | 230M | 230M | — | 0 debt |
| S3 | 50kW | scaled | 50% | 4.7% | Half scale |

Compare within tolerance (1원 for money, 1e-6 for rates): year1 revenue, debt Y1/Y4, CF, cumulative, payback year, IRR, NPV.

---

## 19. UI Architecture (post-validation)

Place **below** Market Revenue section:

1. **Investment Summary** (primary): Capex / Equity / Loan · Cumulative payback · Equity IRR  
2. Mini cumulative curve (20y) with break-even marker  
3. Accordion **전문 수익성 분석**: NPV, CF table, sensitivity (±20% price, ±10% gen, +1/+2% rate)  
4. Advanced inputs collapsed by default  

**Do not ship** IRR/NPV numbers to production until S1–S3 match.

---

## 20. Policies to Confirm Before Production

1. REC unit model: Excel 원/kWh vs platform 원/REC×weight — which is source of truth for investment?
2. Should long-term analysis use today’s spot forever, or require user long-term price?
3. Is loan always `Capex − Equity`?
4. Grace interest-only with full principal into post-grace PMT — confirm with finance?
5. Tax / VAT / connection cost excluded — disclaimer text?
6. DSCR numerator definition (if shown)?
7. Default 원/kW for CAPEX estimate when user has not entered cost?
8. Whether household/net-metering uses a different investment module (savings-based) vs RPS.

---

## Sample Workbook Anchors (S1)

- Year0 CF: −90,000,000  
- Year1 Gen: 131,400 · Revenue: 25,360,200 · Debt: 6,580,000 · CF: 16,780,200  
- Cumulative payback year: **7**  
- Equity IRR ≈ **11.86%**  
- NPV(5%) ≈ **48.5M 원**
