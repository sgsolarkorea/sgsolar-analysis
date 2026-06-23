import type { ResolvedSiteReview } from "@/types/siteReview";
import type { MunicipalityOrdinanceData } from "@/types/regulatoryReview";
import { getFieldValue } from "@/lib/solar/calculate";
import {
  PDF_CONSULTATION_CHECKLIST,
  PDF_CTA,
  PDF_GRID_GUIDANCE,
  PDF_LEGAL_DISCLAIMER,
  PDF_SETBACK_FOOTER,
} from "@/lib/pdf/reportContent";
import {
  COLORS,
  MARGIN,
  drawDisclaimerBox,
  drawFlexibleTableRow,
  drawInfoCard,
  drawMetricCard,
  rgbColor,
  sanitizePdfText,
} from "@/lib/pdf/pdfHelpers";
import { PdfFlowLayout } from "@/lib/pdf/pdfFlowLayout";

export function drawSummaryBlock(flow: PdfFlowLayout, data: ResolvedSiteReview, overallStatus: string) {
  const contentW = flow.contentWidth;
  const kpiW = (contentW - 12) / 2;
  const kpiH = 52;

  const kpis = [
    { label: "분석 주소", value: data.address },
    { label: "분석일", value: data.analyzedAt },
    { label: "설치 유형", value: data.solarMetrics.installType },
    { label: "예상 설비용량", value: data.capacity },
    { label: "종합 검토 상태", value: overallStatus },
  ];

  let rowY = flow.y;
  for (let i = 0; i < kpis.length; i += 2) {
    flow.ensureSpace(kpiH + 8);
    rowY = flow.y;
    drawMetricCard(flow.currentPage, flow.font, flow.fontBold, MARGIN, rowY, kpiW, kpiH, kpis[i].label, kpis[i].value);
    if (kpis[i + 1]) {
      drawMetricCard(
        flow.currentPage,
        flow.font,
        flow.fontBold,
        MARGIN + kpiW + 12,
        rowY,
        kpiW,
        kpiH,
        kpis[i + 1].label,
        kpis[i + 1].value,
      );
    }
    flow.y = rowY - kpiH - 8;
  }

  flow.y = drawDisclaimerBox(flow.currentPage, flow.font, flow.y, PDF_LEGAL_DISCLAIMER);
  flow.drawSpacer(6);
}

function drawTableWithBreaks(
  flow: PdfFlowLayout,
  headerCols: { w: number; text: string; medium?: boolean }[],
  rows: { w: number; text: string; bold?: boolean; medium?: boolean }[][],
  rowEstimate = 48,
) {
  flow.ensureSpace(rowEstimate, rowEstimate + 20);
  flow.y = drawFlexibleTableRow(
    flow.currentPage,
    flow.font,
    flow.fontBold,
    flow.fontMedium,
    flow.y,
    headerCols,
    { header: true },
  );

  for (const cols of rows) {
    flow.ensureSpace(rowEstimate, rowEstimate);
    flow.y = drawFlexibleTableRow(
      flow.currentPage,
      flow.font,
      flow.fontBold,
      flow.fontMedium,
      flow.y,
      cols,
    );
  }
}

export function drawSiteOverviewSection(
  flow: PdfFlowLayout,
  data: ResolvedSiteReview,
  parcels?: import("@/types/parcelReview").ParcelSnapshot[],
) {
  flow.drawSectionHeading("입지분석 개요", "토지·건물 기준 설치 검토 요약");

  const m = data.solarMetrics;
  const landCategory = getFieldValue(data.landInfo, "지목");
  const zoning = getFieldValue(data.landInfo, "용도지역");
  const area = getFieldValue(data.landInfo, "면적");
  const buildingArea = getFieldValue(data.buildingInfo, "건축면적");
  const areaSqm = `${m.baseAreaLabel}: ${m.baseAreaSqm.toLocaleString("ko-KR")}m2`;

  const infoRows: { w: number; text: string; bold?: boolean }[][] = [
    [
      { w: 28, text: "분석 주소", bold: true },
      { w: 72, text: data.address },
    ],
    [
      { w: 28, text: "설치 유형", bold: true },
      { w: 72, text: m.installType },
    ],
    [
      { w: 28, text: "예상 설치 면적", bold: true },
      { w: 72, text: areaSqm },
    ],
    [
      { w: 28, text: "예상 설비용량", bold: true },
      { w: 72, text: data.capacity },
    ],
    [
      { w: 28, text: "지목", bold: true },
      { w: 72, text: landCategory },
    ],
    [
      { w: 28, text: "용도지역", bold: true },
      { w: 72, text: zoning },
    ],
    [
      { w: 28, text: "토지/건물 면적", bold: true },
      { w: 72, text: area !== "—" ? area : buildingArea },
    ],
    [
      { w: 28, text: "분석 기준", bold: true },
      { w: 72, text: m.formula || m.capacityDisclaimer },
    ],
  ];

  drawTableWithBreaks(
    flow,
    [
      { w: 28, text: "항목", medium: true },
      { w: 72, text: "내용", medium: true },
    ],
    infoRows,
    36,
  );

  if (parcels && parcels.length > 1) {
    flow.drawSpacer(6);
    flow.drawTextLine(`다중 필지 (${parcels.length}필지)`, { size: 10, font: flow.fontBold, color: COLORS.navy });
    for (const parcel of parcels.slice(0, 4)) {
      flow.drawTextLine(`- ${parcel.jibunAddress} ${parcel.areaLabel}`, { size: 9, indent: 4 });
    }
  }

  flow.drawSpacer(4);
  flow.ensureSpace(40);
  flow.y = drawDisclaimerBox(
    flow.currentPage,
    flow.font,
    flow.y,
    "위 용량·면적은 공공데이터와 입력 정보를 바탕으로 산정한 1차 참고값이며, 현장 조건에 따라 달라질 수 있습니다.",
  );
  flow.drawSpacer(8);
}

export function drawRegulatoryAnalysisSection(flow: PdfFlowLayout, data: ResolvedSiteReview) {
  flow.drawSectionHeading("법·규제 분석", "공공 토지이용계획 기반 1차 규제 검토");

  const rows = data.layerARegulatoryAnalysis?.rows ?? [];
  if (rows.length === 0) {
    flow.ensureSpace(36);
    flow.y = drawDisclaimerBox(
      flow.currentPage,
      flow.font,
      flow.y,
      "토지이용계획 GIS 데이터를 조회하지 못해 규제 1차 검토 결과가 없습니다. 상담 시 추가 확인합니다.",
    );
    flow.drawSpacer(8);
    return;
  }

  drawTableWithBreaks(
    flow,
    [
      { w: 18, text: "규제 항목", medium: true },
      { w: 18, text: "해당 구역", medium: true },
      { w: 14, text: "1차 판단", medium: true },
      { w: 50, text: "검토 의견", medium: true },
    ],
    rows.map((row) => [
      { w: 18, text: row.item, bold: true },
      { w: 18, text: row.matchedZone ?? "-" },
      { w: 14, text: row.level },
      { w: 50, text: row.summary },
    ]),
    44,
  );

  flow.drawSpacer(6);
  flow.ensureSpace(36);
  flow.y = drawDisclaimerBox(
    flow.currentPage,
    flow.font,
    flow.y,
    data.layerARegulatoryAnalysis?.sourceNote ??
      "공공 토지이용계획 기반 1차 규제 검토입니다. 최종 판단은 현장·조례·인허가 확인이 필요합니다.",
  );
  flow.drawSpacer(8);
}

export function drawSetbackReviewSection(flow: PdfFlowLayout, data: ResolvedSiteReview) {
  flow.drawSectionHeading("이격거리 검토", "주요 시설물·경계까지의 예상 거리");

  const review = data.setbackReview;
  if (review?.notice) {
    flow.ensureSpace(36);
    flow.y = drawDisclaimerBox(flow.currentPage, flow.font, flow.y, review.notice);
    flow.drawSpacer(6);
  }

  const rows = review?.rows ?? [];
  if (rows.length === 0) {
    flow.ensureSpace(28);
    flow.y = drawDisclaimerBox(
      flow.currentPage,
      flow.font,
      flow.y,
      "이격거리 검토 데이터가 없습니다. 상담 시 추가 확인합니다.",
    );
    flow.drawSpacer(8);
    return;
  }

  drawTableWithBreaks(
    flow,
    [
      { w: 16, text: "검토 항목", medium: true },
      { w: 12, text: "참고 기준", medium: true },
      { w: 12, text: "예상 거리", medium: true },
      { w: 14, text: "검토 상태", medium: true },
      { w: 46, text: "안내", medium: true },
    ],
    rows.map((row) => [
      { w: 16, text: row.detail ? `${row.item}\n${row.detail}` : row.item, bold: true },
      { w: 12, text: row.standard },
      { w: 12, text: row.measured },
      { w: 14, text: row.judgment },
      { w: 46, text: row.remark ?? "-" },
    ]),
    48,
  );

  flow.drawSpacer(6);
  flow.ensureSpace(32);
  flow.y = drawDisclaimerBox(flow.currentPage, flow.font, flow.y, PDF_SETBACK_FOOTER);
  flow.drawSpacer(8);
}

export function drawGridGuidanceSection(flow: PdfFlowLayout, data: ResolvedSiteReview) {
  flow.drawSectionHeading("계통 검토 안내", "한전 계통 연계 사전 확인");

  for (const line of PDF_GRID_GUIDANCE) {
    flow.ensureSpace(40);
    flow.drawWrappedText(line, { size: 9.5, color: COLORS.text, indent: 4 });
    flow.drawSpacer(4);
  }

  const grid = data.gridInfo;
  if (grid.reviewResult && grid.reviewResult !== "-") {
    flow.ensureSpace(68);
    drawInfoCard(
      flow.currentPage,
      flow.font,
      flow.fontBold,
      MARGIN,
      flow.y,
      flow.contentWidth,
      58,
      "공공데이터 1차 참고",
      grid.reviewResult,
    );
    flow.y -= 66;
  }

  flow.drawSpacer(8);
}

export function drawChecklistAndCtaSection(flow: PdfFlowLayout) {
  flow.drawSectionHeading("상담 전 확인사항", "SG SOLAR 전문 상담 준비");

  flow.drawTextLine("확인 체크리스트", { size: 10, font: flow.fontBold, color: COLORS.navy });
  flow.drawSpacer(2);

  for (const item of PDF_CONSULTATION_CHECKLIST) {
    flow.drawTextLine(`- ${item}`, { size: 9.5, indent: 4 });
  }

  flow.drawSpacer(8);
  flow.ensureSpace(56);

  const contentW = flow.contentWidth;
  const boxH = 50;
  flow.currentPage.drawRectangle({
    x: MARGIN,
    y: flow.y - boxH,
    width: contentW,
    height: boxH,
    color: rgbColor(COLORS.blueSoft),
    borderColor: rgbColor(COLORS.border),
    borderWidth: 0.75,
  });
  flow.currentPage.drawText("SG SOLAR 상담 안내", {
    x: MARGIN + 12,
    y: flow.y - 16,
    size: 10,
    font: flow.fontBold,
    color: rgbColor(COLORS.navy),
  });

  const ctaLines = sanitizePdfText(PDF_CTA)
    .split("\n")
    .flatMap((p) => p.trim())
    .filter(Boolean);
  let ctaY = flow.y - 32;
  for (const line of ctaLines.length ? ctaLines : [PDF_CTA]) {
    flow.currentPage.drawText(sanitizePdfText(line), {
      x: MARGIN + 12,
      y: ctaY,
      size: 9,
      font: flow.font,
      color: rgbColor(COLORS.text),
    });
    ctaY -= 12;
  }
  flow.y -= boxH + 10;

  flow.ensureSpace(36);
  flow.y = drawDisclaimerBox(flow.currentPage, flow.font, flow.y, PDF_LEGAL_DISCLAIMER);
}

export function drawOrdinanceAppendix(flow: PdfFlowLayout, ordinance: MunicipalityOrdinanceData) {
  flow.drawSectionHeading("지자체 조례 참고", ordinance.municipalityLabel);

  flow.drawWrappedText(ordinance.ordinanceTitle, { size: 9.5, font: flow.fontBold, color: COLORS.navy });
  flow.drawSpacer(6);

  if (ordinance.distanceRules.length > 0) {
    drawTableWithBreaks(
      flow,
      [
        { w: 35, text: "항목", medium: true },
        { w: 65, text: "기준", medium: true },
      ],
      ordinance.distanceRules.slice(0, 8).map((rule) => [
        { w: 35, text: rule.label },
        { w: 65, text: rule.distance },
      ]),
      32,
    );
  }
}
