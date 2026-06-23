import type { ResolvedSiteReview } from "@/types/siteReview";
import type { LayerARegulatoryLevel } from "@/types/landInfo";
import type { SetbackJudgment } from "@/types/regulatoryReview";
import type { GridConnectionStatus } from "@/types/gridConnection";
import { getFieldValue } from "@/lib/solar/calculate";
import { formatUnifiedCapacityKw } from "@/lib/solar/capacityResolution";
import { hasDetailedGridData, formatGridLevelName } from "@/lib/grid/display";
import {
  formatGridCapacityMwOrKw,
  formatSolarCapacityKw,
} from "@/lib/grid/evaluate";
import {
  PDF_CASE_STUDY_PLACEHOLDERS,
  PDF_CONSULTATION_CHECKLIST,
  PDF_CTA,
  PDF_CTA_BUTTON,
  PDF_LEGAL_DISCLAIMER,
  PDF_PROCESS_STEPS,
  PDF_REPORT_SUBTITLE,
  PDF_REPORT_TITLE,
  PDF_SETBACK_COMMON_NOTICE,
  PDF_SETBACK_FOOTER,
  PDF_SETBACK_STANDARD_COLUMN,
  deriveAssessmentItems,
  deriveExecutiveSummary,
  deriveOverallReviewStatus,
  formatInstallTypeForPdf,
  formatRecWeightForPdf,
} from "@/lib/pdf/reportContent";
import { htmlText } from "@/lib/pdf/html/escape";
import { reportBaseStyles } from "@/lib/pdf/html/reportStyles";
import {
  KEPCO_INQUIRY_CALL_GUIDE,
  KEPCO_INQUIRY_TOPICS,
  KEPCO_PREP_ITEMS,
} from "@/lib/kepco/inquiryContent";
import { resolveKepcoOffice } from "@/lib/kepco/resolveKepcoOffice";

export interface HtmlReportAssets {
  fontFacesCss: string;
  logoDataUrl: string | null;
  mapDataUrl: string | null;
  mapOverlaySvg: string | null;
  mapWidth: number;
  mapHeight: number;
  mapAvailable: boolean;
  mapFailureReason?: string | null;
}

const REGULATORY_BADGE: Record<LayerARegulatoryLevel, string> = {
  "제한 가능성 높음": "badge-amber",
  "추가 검토 필요": "badge-orange",
  "기본 확인": "badge-blue",
  "해당 없음": "badge-slate",
};

const SETBACK_BADGE: Record<SetbackJudgment, string> = {
  "기본 확인": "badge-blue",
  "거리 검토 필요": "badge-orange",
  "공공데이터 확인 필요": "badge-slate",
  "추가 검토 필요": "badge-orange",
  "조례 확인 필요": "badge-orange",
  "데이터 확인 필요": "badge-slate",
  적합: "badge-blue",
  "검토 필요": "badge-orange",
  "추가 확인": "badge-slate",
  "조례 기준 확인 필요": "badge-slate",
};

const GRID_DOT: Record<GridConnectionStatus, string> = {
  high: "dot-high",
  review: "dot-review",
  difficult: "dot-difficult",
  unknown: "dot-unknown",
};

function badge(level: string, map: Record<string, string>): string {
  const cls = map[level] ?? "badge-slate";
  return `<span class="badge ${cls}">${htmlText(level)}</span>`;
}

function cleanGridLabel(label: string): string {
  return label.replace(/[🟢🟡🔴⚫]/g, "").trim();
}

function barPct(remaining: number | null, cumulative: number | null): number {
  if (remaining == null || !Number.isFinite(remaining)) return 0;
  const total = (cumulative ?? 0) + remaining;
  const base = total > 0 ? total : Math.max(remaining, 1);
  return Math.min(100, Math.max(4, (remaining / base) * 100));
}

function barClass(remaining: number | null, expectedMw: number): string {
  if (remaining == null || !Number.isFinite(remaining)) return "rem";
  if (remaining <= expectedMw) return "bad";
  if (remaining <= expectedMw * 1.2) return "warn";
  return "rem";
}

function renderLocationFallback(data: ResolvedSiteReview, reason: string): string {
  const reasonNote =
    reason === "no-js-key"
      ? "지도 API 설정이 필요합니다."
      : "지도 이미지를 불러오지 못했습니다. 현장 상담 시 위치를 함께 재확인합니다.";

  return `
    <div class="location-card">
      <div class="loc-icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>
        </svg>
      </div>
      <div class="loc-body">
        <div class="loc-title">위치 확인 정보</div>
        <div class="loc-row"><span class="loc-label">주소</span><span class="loc-val">${htmlText(data.address)}</span></div>
        <div class="loc-row"><span class="loc-label">좌표</span><span class="loc-val">${htmlText(data.lat.toFixed(5))}, ${htmlText(data.lng.toFixed(5))}</span></div>
        <div class="loc-note">${htmlText(reasonNote)}</div>
      </div>
    </div>`;
}

function renderKepcoOfficeCard(data: ResolvedSiteReview): string {
  const office = resolveKepcoOffice(data.address, data.jibunAddress);
  const topics = KEPCO_INQUIRY_TOPICS.map((item) => `<li>${htmlText(item)}</li>`).join("");
  const prep = KEPCO_PREP_ITEMS.map((item) => `<li>${htmlText(item)}</li>`).join("");

  return `
    <div class="kepco-office-card avoid-break">
      <div class="kepco-office-head">
        <div>
          <div class="kepco-office-label">관할 한전 사업소 문의</div>
          <div class="kepco-office-name">${htmlText(office.officeName)}</div>
        </div>
        <span class="kepco-status badge ${office.statusLabel === "확인 필요" ? "badge-slate" : office.statusLabel === "관할 확인 권장" ? "badge-amber" : "badge-blue"}">${htmlText(office.statusLabel)}</span>
      </div>
      <div class="kepco-contact-grid">
        <div>
          <div class="kepco-field-label">지사 대표번호</div>
          <div class="kepco-field-val">${htmlText(office.officePhoneDisplay)}</div>
          ${office.phoneSourceDetail ? `<div class="kepco-field-meta">${htmlText(office.phoneSourceDetail)}</div>` : ""}
          ${office.officePhone ? `<div class="kepco-field-meta">${htmlText(office.phoneSource)}</div>` : ""}
        </div>
        <div>
          <div class="kepco-field-label">보조 연락수단</div>
          <div class="kepco-field-val">한전 ${htmlText(office.fallbackPhone)}</div>
        </div>
        <div>
          <div class="kepco-field-label">문의 부서</div>
          <div class="kepco-field-val">${htmlText(office.departmentHint)}</div>
        </div>
      </div>
      <div class="kepco-match-row">
        <div class="kepco-field-label">매칭 기준</div>
        <div class="kepco-field-val">${htmlText(office.matchBasisLabel)}</div>
      </div>
      <div class="kepco-match-row meta">
        <div class="kepco-field-label">기준 행정구역</div>
        <div class="kepco-field-val">${htmlText(office.parsedMeta)}</div>
      </div>
      ${office.verificationNote ? `<p class="kepco-note">${htmlText(office.verificationNote)}</p>` : ""}
      ${office.inquiryGuide ? `<p class="kepco-note warn">${htmlText(office.inquiryGuide)}</p>` : ""}
      <div class="kepco-lists">
        <div>
          <div class="kepco-field-label">문의 항목</div>
          <ul class="kepco-list">${topics}</ul>
        </div>
        <div>
          <div class="kepco-field-label">문의 전 준비</div>
          <ul class="kepco-list">${prep}</ul>
        </div>
      </div>
      <p class="kepco-call-guide">${htmlText(KEPCO_INQUIRY_CALL_GUIDE)}</p>
    </div>`;
}

function renderPageOneMapPanel(data: ResolvedSiteReview, assets: HtmlReportAssets): string {
  const mapInner =
    assets.mapAvailable && assets.mapDataUrl
      ? `<div class="map-stage map-stage-lg">
          <div class="map-wrap">
            <img src="${assets.mapDataUrl}" alt="입지 위치 지도" width="${assets.mapWidth}" height="${assets.mapHeight}" />
          </div>
          ${assets.mapOverlaySvg ? `<svg class="map-overlay" viewBox="0 0 ${assets.mapWidth} ${assets.mapHeight}" preserveAspectRatio="none">${assets.mapOverlaySvg}</svg>` : ""}
        </div>`
      : renderLocationFallback(data, assets.mapFailureReason ?? "no-key");

  return `
    <div class="page-one-map avoid-break">
      <div class="map-panel-head">
        <span class="map-panel-label">Site Location</span>
        <span class="map-panel-date">${htmlText(data.analyzedAt)}</span>
      </div>
      ${mapInner}
      <div class="map-caption">${htmlText(data.address)}</div>
    </div>`;
}

function renderPageOneKpiStack(data: ResolvedSiteReview): string {
  const grid = data.gridInfo;
  const gridLabel = cleanGridLabel(grid.statusLabel);
  const recWeight = formatRecWeightForPdf(data);

  const kpis = [
    { label: "예상 설비용량", value: data.capacity, variant: "primary" },
    { label: "예상 연매출", value: data.annualRevenue, variant: "revenue" },
    { label: "예상 시공비", value: data.constructionCost, variant: "cost" },
    { label: "REC 가중치", value: recWeight, variant: "rec" },
    { label: "계통 상태", value: gridLabel, variant: "grid", dot: GRID_DOT[grid.status] },
  ];

  return `
    <div class="page-one-kpis avoid-break">
      <div class="kpi-stack-title">핵심 지표</div>
      ${kpis
        .map(
          (kpi) => `
        <div class="hero-kpi hero-kpi-${kpi.variant}">
          <div class="hero-kpi-label">${htmlText(kpi.label)}</div>
          <div class="hero-kpi-value">
            ${kpi.dot ? `<span class="grid-status-dot ${kpi.dot}"></span>` : ""}
            ${htmlText(kpi.value)}
          </div>
        </div>`,
        )
        .join("")}
    </div>`;
}

function renderAssessmentCard(data: ResolvedSiteReview): string {
  const items = deriveAssessmentItems(data);
  const summary = deriveExecutiveSummary(data);

  return `
    <div class="assessment-card avoid-break">
      <div class="assessment-head">
        <div class="assessment-title">종합 평가</div>
        <div class="assessment-sub">${htmlText(deriveOverallReviewStatus(data))}</div>
      </div>
      <div class="assessment-pills">
        ${items
          .map(
            (item) =>
              `<span class="assessment-pill pill-${item.tone}">${htmlText(item.label)}</span>`,
          )
          .join("")}
      </div>
      <p class="assessment-note">${htmlText(summary)}</p>
    </div>`;
}

function renderCaseStudyCards(): string {
  return `
    <div class="case-study-grid avoid-break">
      ${PDF_CASE_STUDY_PLACEHOLDERS.map(
        (item) => `
        <div class="case-study-card">
          <div class="case-tag">Reference Project</div>
          <div class="case-title">${htmlText(item.title)}</div>
          <div class="case-region">${htmlText(item.region)}</div>
          <div class="case-desc">${htmlText(item.desc)}</div>
          <div class="case-placeholder">상담 시 유사 사례 자료 제공</div>
        </div>`,
      ).join("")}
    </div>`;
}

function renderChecklistSection(): string {
  return `
    <div class="check-section-wrap avoid-break">
      <div class="check-intro">상담 전 아래 항목을 준비하시면 보다 정확한 검토가 가능합니다.</div>
      <div class="check-grid">
        ${PDF_CONSULTATION_CHECKLIST.map(
          (item) => `
          <div class="check-card">
            <div class="check-box"></div>
            <div class="check-text">${htmlText(item)}</div>
          </div>`,
        ).join("")}
      </div>
    </div>`;
}

function renderProcessSteps(): string {
  return `
    <div class="process-grid avoid-break">
      ${PDF_PROCESS_STEPS.map(
        (step) => `
        <div class="process-card">
          <div class="step-num">${step.step}</div>
          <div class="step-title">${htmlText(step.title)}</div>
          <div class="step-desc">${htmlText(step.desc)}</div>
        </div>`,
      ).join("")}
    </div>`;
}

function renderGridBars(data: ResolvedSiteReview, expectedMw: number): string {
  const grid = data.gridInfo;
  if (!hasDetailedGridData(grid)) {
    return `
      <div class="notice amber" style="margin:12px 14px 14px">
        관할 한전 사업소 접속 가능 용량 확인이 필요합니다. 공개 계통 데이터가 없거나 불충분한 경우 상담 시 추가 확인합니다.
      </div>`;
  }

  const levels = [
    { key: "변전소", level: grid.substation },
    { key: "변압기 (MTR)", level: grid.transformer },
    { key: "배전선로 (D/L)", level: grid.distributionLine },
  ];

  const bars = levels
    .map(({ key, level }) => {
      const rem = level.remainingMw;
      const cum = level.cumulativeMw;
      const pct = barPct(rem, cum);
      const cls = barClass(rem, expectedMw);
      return `
        <div class="bar-row">
          <div class="bar-meta">
            <span class="bar-label">${htmlText(key)}</span>
            <span class="bar-val">잔여 ${htmlText(formatGridCapacityMwOrKw(rem))} · 누적 ${htmlText(formatGridCapacityMwOrKw(cum))}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill cum" style="width:100%"></div>
            <div class="bar-fill ${cls}" style="width:${pct.toFixed(1)}%"></div>
          </div>
        </div>`;
    })
    .join("");

  const reviewNote = grid.reviewResult
    ? htmlText(grid.reviewResult)
    : "계통 연계 가능 여부는 한전 접속 가능 용량 확인이 필요합니다.";

  return `
    <div class="bar-section avoid-break">
      <h3>잔여용량 (공공데이터 1차 참고)</h3>
      ${bars}
      <div class="bar-legend">
        <span class="legend-cum">누적연계용량</span>
        <span class="legend-rem">잔여용량</span>
      </div>
      <p style="margin-top:10px;font-size:7.5pt;color:#64748b;line-height:1.5">${reviewNote}</p>
    </div>`;
}

export function buildReportHtml(data: ResolvedSiteReview, assets: HtmlReportAssets): string {
  const m = data.solarMetrics;
  const installType = formatInstallTypeForPdf(m.installType);
  const expectedMw = Math.round((m.capacityKw / 1000) * 1000) / 1000;
  const grid = data.gridInfo;
  const hasGrid = hasDetailedGridData(grid);

  const moduleCountLabel =
    m.moduleCount > 0 ? `${m.moduleCount.toLocaleString("ko-KR")}장` : "확인 필요";

  const areaLabel =
    m.baseAreaSqm > 0
      ? `${m.baseAreaSqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}m²`
      : "확인 필요";

  const landCategory = getFieldValue(data.landInfo, "지목");
  const zoningField = getFieldValue(data.landInfo, "용도지역");
  const areaField = getFieldValue(data.landInfo, "면적");
  const buildingArea = getFieldValue(data.buildingInfo, "건축면적");

  const regulatoryRows = data.layerARegulatoryAnalysis?.rows ?? [];
  const setbackRows = data.setbackReview?.rows ?? [];

  const logoHtml = assets.logoDataUrl
    ? `<img src="${assets.logoDataUrl}" alt="SG SOLAR" />`
    : `<div class="brand-text">SG SOLAR</div>`;

  const regulatoryTable =
    regulatoryRows.length === 0
      ? `<div class="notice">토지이용계획 GIS 데이터를 조회하지 못해 규제 1차 검토 결과가 없습니다. 상담 시 추가 확인합니다.</div>`
      : `
        <div class="card avoid-break">
          <table>
            <thead><tr>
              <th style="width:18%">규제 항목</th>
              <th style="width:18%">해당 구역</th>
              <th style="width:14%">1차 판단</th>
              <th style="width:50%">검토 의견</th>
            </tr></thead>
            <tbody>
              ${regulatoryRows
                .map(
                  (row) => `
                <tr>
                  <td><strong>${htmlText(row.item)}</strong></td>
                  <td>${htmlText(row.matchedZone ?? "-")}</td>
                  <td>${badge(row.level, REGULATORY_BADGE)}</td>
                  <td>${htmlText(row.summary)}</td>
                </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        ${
          data.layerARegulatoryAnalysis?.sourceNote
            ? `<p class="notice compact" style="margin-top:8px">${htmlText(data.layerARegulatoryAnalysis.sourceNote)}</p>`
            : ""
        }`;

  const setbackStandardNotice =
    data.setbackReview?.appliedStandard?.notice ?? PDF_SETBACK_COMMON_NOTICE;
  const setbackColumnLabel =
    data.setbackReview?.appliedStandard?.columnLabel ?? PDF_SETBACK_STANDARD_COLUMN;
  const setbackStandardClass =
    data.setbackReview?.appliedStandard?.isFallback ||
    data.setbackReview?.appliedStandard?.confidence === "needs_verification"
      ? "notice compact amber"
      : data.setbackReview?.appliedStandard?.confidence === "ordinance_based"
        ? "notice compact blue"
        : "notice compact amber";

  const setbackTable = `
    ${data.setbackReview?.notice ? `<div class="notice blue">${htmlText(data.setbackReview.notice)}</div>` : ""}
    <div class="${setbackStandardClass}">${htmlText(setbackStandardNotice)}</div>
    <div class="card avoid-break">
      <table>
        <thead><tr>
          <th style="width:18%">검토 항목</th>
          <th style="width:11%">${htmlText(setbackColumnLabel)}</th>
          <th style="width:12%">예상 거리</th>
          <th style="width:13%">검토 상태</th>
          <th style="width:46%">안내</th>
        </tr></thead>
        <tbody>
          ${setbackRows
            .map(
              (row) => `
            <tr>
              <td>
                <strong>${htmlText(row.item)}</strong>
                ${row.detail ? `<div style="font-size:7.5pt;color:#64748b;margin-top:3px;line-height:1.45">${htmlText(row.detail)}</div>` : ""}
              </td>
              <td style="white-space:nowrap">${htmlText(row.standard)}</td>
              <td><strong>${htmlText(row.measured)}</strong></td>
              <td>${badge(row.judgment, SETBACK_BADGE)}</td>
              <td>${htmlText(row.remark ?? "-")}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <p class="notice compact" style="margin-top:8px">${htmlText(PDF_SETBACK_FOOTER)}</p>`;

  const gridEquipment = hasGrid
    ? `
      <div class="grid-eq-grid">
        ${[
          { label: "변전소", name: formatGridLevelName(grid.substation.name, true) },
          { label: "변압기 (MTR)", name: formatGridLevelName(grid.transformer.name, true) },
          { label: "배전선로 (D/L)", name: formatGridLevelName(grid.distributionLine.name, true) },
        ]
          .map(
            (eq) => `
          <div class="grid-eq">
            <div class="eq-label">${htmlText(eq.label)}</div>
            <div class="eq-name">${htmlText(eq.name)}</div>
          </div>`,
          )
          .join("")}
      </div>
      ${renderGridBars(data, expectedMw)}`
    : "";

  const gridBadgeClass =
    grid.status === "high"
      ? "badge-blue"
      : grid.status === "difficult"
        ? "badge-amber"
        : grid.status === "review"
          ? "badge-orange"
          : "badge-slate";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${htmlText(PDF_REPORT_TITLE)}</title>
  <style>
    ${assets.fontFacesCss}
    ${reportBaseStyles()}
  </style>
</head>
<body>
  <div class="report">
    <section class="page-one">
      <header class="cover-band avoid-break">
        <div class="cover-left">
          ${logoHtml}
          <div class="cover-meta">
            <div class="cover-tag">Solar Consulting Report</div>
            <h1>${htmlText(PDF_REPORT_TITLE)}</h1>
            <p class="cover-sub">${htmlText(PDF_REPORT_SUBTITLE)}</p>
          </div>
        </div>
        <div class="cover-right">
          <div class="cover-date-label">Analysis Date</div>
          <div class="cover-date">${htmlText(data.analyzedAt)}</div>
          <div class="cover-address">${htmlText(data.address)}</div>
        </div>
      </header>

      <div class="page-label page-one-label">01 Executive Summary</div>
      <div class="page-one-split avoid-break">
        ${renderPageOneMapPanel(data, assets)}
        ${renderPageOneKpiStack(data)}
      </div>

      ${renderAssessmentCard(data)}

      <div class="notice compact page-one-disclaimer">${htmlText(PDF_LEGAL_DISCLAIMER)}</div>
    </section>

    <section class="section page-break">
      <div class="section-head">
        <div class="accent"></div>
        <div>
          <div class="page-label">02 Technical Review</div>
          <h2>기술 검토</h2>
          <p>입지분석 · 용량 산정 · 계통 검토</p>
        </div>
      </div>

      <div class="cap-grid avoid-break">
        <div class="cap-card">
          <div class="cap-label">예상 설비용량</div>
          <div class="cap-value">${htmlText(formatUnifiedCapacityKw(m.capacityKw))}</div>
        </div>
        <div class="cap-card">
          <div class="cap-label">예상 설치 면적</div>
          <div class="cap-value">${htmlText(areaLabel)}</div>
        </div>
        <div class="cap-card">
          <div class="cap-label">설치 유형</div>
          <div class="cap-value">${htmlText(installType)}</div>
        </div>
        <div class="cap-card">
          <div class="cap-label">모듈 수량</div>
          <div class="cap-value">${htmlText(moduleCountLabel)}</div>
        </div>
        <div class="cap-card">
          <div class="cap-label">기준 (${htmlText(m.baseAreaLabel)})</div>
          <div class="cap-value">${htmlText(m.formula || "-")}</div>
        </div>
        <div class="cap-card">
          <div class="cap-label">모듈 출력</div>
          <div class="cap-value">${m.modulePowerW}W</div>
        </div>
      </div>

      <div class="card capacity-rows avoid-break" style="margin-bottom:14px">
        <div class="row highlight"><span class="label">지목</span><span class="val">${htmlText(landCategory)}</span></div>
        <div class="row"><span class="label">용도지역</span><span class="val">${htmlText(zoningField)}</span></div>
        <div class="row"><span class="label">토지/건물 면적</span><span class="val">${htmlText(areaField !== "—" ? areaField : buildingArea)}</span></div>
        <div class="row"><span class="label">분석 기준</span><span class="val">${htmlText(m.capacityDisclaimer)}</span></div>
      </div>

      <div class="section-head" style="margin-top:4px">
        <div class="accent"></div>
        <div>
          <h2>계통 검토</h2>
          <p>변전소 · 변압기 · 배전선로 1차 검토</p>
        </div>
      </div>

      <div class="card avoid-break">
        <div class="grid-summary">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="grid-status-dot ${GRID_DOT[grid.status]}"></span>
            <span class="badge ${gridBadgeClass}">${htmlText(cleanGridLabel(grid.statusLabel))}</span>
          </div>
          <div style="text-align:right;font-size:8pt;color:#64748b;line-height:1.45">
            <div>태양광 설치용량 ${htmlText(formatSolarCapacityKw(m.capacityKw))}</div>
            ${grid.queryBasisLabel ? `<div>조회 기준: ${htmlText(grid.queryBasisLabel)}</div>` : ""}
          </div>
        </div>
        ${gridEquipment}
      </div>
      ${renderKepcoOfficeCard(data)}
    </section>

    <section class="section page-break">
      <div class="section-head">
        <div class="accent accent-risk"></div>
        <div>
          <div class="page-label">03 Risk Review</div>
          <h2>리스크 검토</h2>
          <p>법·규제 · 이격거리 1차 검토</p>
        </div>
      </div>
      ${regulatoryTable}

      <div class="section-head" style="margin-top:18px">
        <div class="accent"></div>
        <div>
          <h2>이격거리 검토</h2>
          <p>주요 시설물·경계까지의 예상 거리</p>
        </div>
      </div>
      ${setbackTable}
    </section>

    <section class="section page-break avoid-break">
      <div class="section-head">
        <div class="accent accent-cta"></div>
        <div>
          <div class="page-label">04 Consultation</div>
          <h2>상담 전환</h2>
          <p>시공 사례 · 확인사항 · 진행 절차</p>
        </div>
      </div>

      <div class="subsection-head">
        <h3>시공 사례</h3>
        <p>유사 규모·유형 참고 사례 (상담 시 상세 자료 제공)</p>
      </div>
      ${renderCaseStudyCards()}

      <div class="subsection-head">
        <h3>상담 전 확인사항</h3>
      </div>
      ${renderChecklistSection()}

      <div class="section-head" style="margin-top:4px">
        <div class="accent"></div>
        <div>
          <h2>진행 절차</h2>
          <p>사전 검토부터 전문 상담까지</p>
        </div>
      </div>

      ${renderProcessSteps()}

      <div class="cta-box avoid-break">
        <h3>SG SOLAR 상담 안내</h3>
        <p>${htmlText(PDF_CTA)}</p>
        <span class="cta-button">${htmlText(PDF_CTA_BUTTON)}</span>
      </div>

      <div class="notice amber" style="margin-top:14px">${htmlText(PDF_LEGAL_DISCLAIMER)}</div>

      <div class="footer-note">SG SOLAR · ${htmlText(PDF_REPORT_TITLE)} · ${htmlText(data.address)}</div>
    </section>
  </div>
</body>
</html>`;
}
