import type { PDFDocument, PDFImage, PDFFont, PDFPage } from "pdf-lib";
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
  PAGE,
  drawDisclaimerBox,
  drawFlexibleTableRow,
  drawInfoCard,
  drawPageFooter,
  drawPageHeader,
  rgbColor,
  sanitizePdfText,
  wrapTextByWidth,
} from "@/lib/pdf/pdfHelpers";

export interface PdfRenderContext {
  pdfDoc: PDFDocument;
  font: PDFFont;
  fontMedium: PDFFont;
  fontBold: PDFFont;
  logoImage: PDFImage | null;
  data: ResolvedSiteReview;
  pageNum: { value: number };
  totalPages: number;
}

const MIN_Y = 72;

function addContentPage(ctx: PdfRenderContext): PDFPage {
  const page = ctx.pdfDoc.addPage([PAGE.width, PAGE.height]);
  ctx.pageNum.value += 1;
  return page;
}

function finishPage(page: PDFPage, ctx: PdfRenderContext) {
  drawPageFooter(page, ctx.font, ctx.pageNum.value, ctx.totalPages);
}

function ensureSpace(ctx: PdfRenderContext, page: PDFPage, y: number, needed: number): {
  page: PDFPage;
  y: number;
} {
  if (y - needed >= MIN_Y) return { page, y };
  finishPage(page, ctx);
  const next = addContentPage(ctx);
  const yStart = drawPageHeader(next, ctx.font, ctx.fontBold, "계속", undefined, ctx.logoImage);
  return { page: next, y: yStart };
}

export function drawRegulatoryAnalysisSection(ctx: PdfRenderContext): PDFPage {
  let page = addContentPage(ctx);
  let y = drawPageHeader(
    page,
    ctx.font,
    ctx.fontBold,
    "법·규제 분석",
    "공공 토지이용계획 기반 1차 규제 검토",
    ctx.logoImage,
  );

  const rows = ctx.data.layerARegulatoryAnalysis?.rows ?? [];
  if (rows.length === 0) {
    y = drawDisclaimerBox(
      page,
      ctx.font,
      y,
      "토지이용계획 GIS 데이터를 조회하지 못해 규제 1차 검토 결과가 없습니다. 상담 시 추가 확인합니다.",
    );
    finishPage(page, ctx);
    return page;
  }

  y = drawFlexibleTableRow(
    page,
    ctx.font,
    ctx.fontBold,
    ctx.fontMedium,
    y,
    [
      { w: 18, text: "규제 항목", medium: true },
      { w: 18, text: "해당 구역", medium: true },
      { w: 14, text: "1차 판단", medium: true },
      { w: 50, text: "검토 의견", medium: true },
    ],
    { header: true },
  );

  for (const row of rows) {
    ({ page, y } = ensureSpace(ctx, page, y, 48));
    y = drawFlexibleTableRow(page, ctx.font, ctx.fontBold, ctx.fontMedium, y, [
      { w: 18, text: row.item, bold: true },
      { w: 18, text: row.matchedZone ?? "—" },
      { w: 14, text: row.level },
      { w: 50, text: row.summary },
    ]);
  }

  y -= 8;
  ({ page, y } = ensureSpace(ctx, page, y, 40));
  y = drawDisclaimerBox(
    page,
    ctx.font,
    y,
    ctx.data.layerARegulatoryAnalysis.sourceNote ??
      "공공 토지이용계획 기반 1차 규제 검토입니다. 최종 판단은 현장·조례·인허가 확인이 필요합니다.",
  );

  finishPage(page, ctx);
  return page;
}

export function drawSetbackReviewSection(ctx: PdfRenderContext): PDFPage {
  let page = addContentPage(ctx);
  let y = drawPageHeader(
    page,
    ctx.font,
    ctx.fontBold,
    "이격거리 검토",
    "주요 시설물·경계까지의 예상 거리",
    ctx.logoImage,
  );

  const review = ctx.data.setbackReview;
  if (review?.notice) {
    y = drawDisclaimerBox(page, ctx.font, y, review.notice);
  }

  const rows = review?.rows ?? [];
  y = drawFlexibleTableRow(
    page,
    ctx.font,
    ctx.fontBold,
    ctx.fontMedium,
    y,
    [
      { w: 16, text: "검토 항목", medium: true },
      { w: 12, text: "참고 기준", medium: true },
      { w: 12, text: "예상 거리", medium: true },
      { w: 14, text: "검토 상태", medium: true },
      { w: 46, text: "안내", medium: true },
    ],
    { header: true },
  );

  for (const row of rows) {
    ({ page, y } = ensureSpace(ctx, page, y, 52));
    y = drawFlexibleTableRow(page, ctx.font, ctx.fontBold, ctx.fontMedium, y, [
      { w: 16, text: row.detail ? `${row.item}\n${row.detail}` : row.item, bold: true },
      { w: 12, text: row.standard },
      { w: 12, text: row.measured },
      { w: 14, text: row.judgment },
      { w: 46, text: row.remark ?? "—" },
    ]);
  }

  ({ page, y } = ensureSpace(ctx, page, y, 36));
  drawDisclaimerBox(page, ctx.font, y, PDF_SETBACK_FOOTER);
  finishPage(page, ctx);
  return page;
}

export function drawGridGuidanceSection(ctx: PdfRenderContext): PDFPage {
  const page = addContentPage(ctx);
  let y = drawPageHeader(
    page,
    ctx.font,
    ctx.fontBold,
    "계통 검토 안내",
    "한전 계통 연계 사전 확인",
    ctx.logoImage,
  );

  const contentW = PAGE.width - MARGIN * 2;
  for (const line of PDF_GRID_GUIDANCE) {
    page.drawRectangle({
      x: MARGIN,
      y: y - 52,
      width: contentW,
      height: 52,
      color: rgbColor(COLORS.navyLight),
      borderColor: rgbColor(COLORS.border),
      borderWidth: 0.75,
    });
    for (const [index, textLine] of wrapTextByWidth(line, ctx.font, 10, contentW - 24).entries()) {
      page.drawText(sanitizePdfText(textLine), {
        x: MARGIN + 12,
        y: y - 18 - index * 13,
        size: 10,
        font: ctx.font,
        color: rgbColor(COLORS.text),
      });
    }
    y -= 62;
  }

  const grid = ctx.data.gridInfo;
  if (grid.reviewResult && grid.reviewResult !== "—") {
    drawInfoCard(
      page,
      ctx.font,
      ctx.fontBold,
      MARGIN,
      y,
      contentW,
      64,
      "공공데이터 1차 참고",
      grid.reviewResult,
    );
  }

  finishPage(page, ctx);
  return page;
}

export function drawChecklistAndCtaSection(ctx: PdfRenderContext): PDFPage {
  const page = addContentPage(ctx);
  let y = drawPageHeader(
    page,
    ctx.font,
    ctx.fontBold,
    "상담 전 확인사항",
    "SG SOLAR 전문 상담 준비",
    ctx.logoImage,
  );

  const contentW = PAGE.width - MARGIN * 2;
  page.drawText("확인 체크리스트", {
    x: MARGIN,
    y,
    size: 11,
    font: ctx.fontBold,
    color: rgbColor(COLORS.navy),
  });
  y -= 18;

  for (const item of PDF_CONSULTATION_CHECKLIST) {
    page.drawText(sanitizePdfText(`☐  ${item}`), {
      x: MARGIN + 4,
      y,
      size: 10,
      font: ctx.font,
      color: rgbColor(COLORS.text),
    });
    y -= 16;
  }

  y -= 12;
  page.drawRectangle({
    x: MARGIN,
    y: y - 56,
    width: contentW,
    height: 56,
    color: rgbColor(COLORS.blueSoft),
    borderColor: rgbColor(COLORS.border),
    borderWidth: 0.75,
  });
  page.drawText("SG SOLAR 상담 안내", {
    x: MARGIN + 12,
    y: y - 18,
    size: 11,
    font: ctx.fontBold,
    color: rgbColor(COLORS.navy),
  });
  for (const [index, line] of wrapTextByWidth(PDF_CTA, ctx.font, 10, contentW - 24).entries()) {
    page.drawText(line, {
      x: MARGIN + 12,
      y: y - 34 - index * 13,
      size: 10,
      font: ctx.font,
      color: rgbColor(COLORS.text),
    });
  }

  y -= 72;
  drawDisclaimerBox(page, ctx.font, y, PDF_LEGAL_DISCLAIMER);
  finishPage(page, ctx);
  return page;
}

export function drawOrdinanceAppendix(
  ctx: PdfRenderContext,
  ordinance: MunicipalityOrdinanceData,
): PDFPage {
  const page = addContentPage(ctx);
  let y = drawPageHeader(
    page,
    ctx.font,
    ctx.fontBold,
    "지자체 조례 참고",
    ordinance.municipalityLabel,
    ctx.logoImage,
  );

  page.drawText(sanitizePdfText(ordinance.ordinanceTitle), {
    x: MARGIN,
    y,
    size: 10,
    font: ctx.fontBold,
    color: rgbColor(COLORS.navy),
    maxWidth: PAGE.width - MARGIN * 2,
  });
  y -= 20;

  if (ordinance.distanceRules.length > 0) {
    y = drawFlexibleTableRow(
      page,
      ctx.font,
      ctx.fontBold,
      ctx.fontMedium,
      y,
      [
        { w: 35, text: "항목", medium: true },
        { w: 65, text: "기준", medium: true },
      ],
      { header: true },
    );
    for (const rule of ordinance.distanceRules.slice(0, 8)) {
      y = drawFlexibleTableRow(page, ctx.font, ctx.fontBold, ctx.fontMedium, y, [
        { w: 35, text: rule.label },
        { w: 65, text: rule.distance },
      ]);
      if (y < MIN_Y + 20) break;
    }
  }

  finishPage(page, ctx);
  return page;
}

export function drawSiteOverviewSection(
  ctx: PdfRenderContext,
  parcels?: import("@/types/parcelReview").ParcelSnapshot[],
): PDFPage {
  const page = addContentPage(ctx);
  let y = drawPageHeader(
    page,
    ctx.font,
    ctx.fontBold,
    "입지분석 개요",
    "토지·건물 기준 설치 검토 요약",
    ctx.logoImage,
  );

  const data = ctx.data;
  const m = data.solarMetrics;
  const landCategory = getFieldValue(data.landInfo, "지목");
  const zoning = getFieldValue(data.landInfo, "용도지역");
  const area = getFieldValue(data.landInfo, "면적");
  const buildingArea = getFieldValue(data.buildingInfo, "건축면적");

  const infoRows: [string, string][] = [
    ["분석 주소", data.address],
    ["설치 유형", m.installType],
    ["예상 설치 면적", `${m.baseAreaLabel}: ${m.baseAreaSqm.toLocaleString("ko-KR")}㎡`],
    ["예상 설비용량", data.capacity],
    ["지목", landCategory],
    ["용도지역", zoning],
    ["토지/건물 면적", area !== "—" ? area : buildingArea],
    ["분석 기준", m.formula || m.capacityDisclaimer],
  ];

  y = drawFlexibleTableRow(
    page,
    ctx.font,
    ctx.fontBold,
    ctx.fontMedium,
    y,
    [
      { w: 28, text: "항목", medium: true },
      { w: 72, text: "내용", medium: true },
    ],
    { header: true },
  );

  for (const [label, value] of infoRows) {
    y = drawFlexibleTableRow(page, ctx.font, ctx.fontBold, ctx.fontMedium, y, [
      { w: 28, text: label, bold: true },
      { w: 72, text: value },
    ]);
  }

  if (parcels && parcels.length > 1) {
    y -= 8;
    page.drawText(sanitizePdfText(`다중 필지 (${parcels.length}필지)`), {
      x: MARGIN,
      y,
      size: 10,
      font: ctx.fontBold,
      color: rgbColor(COLORS.navy),
    });
    y -= 16;
    for (const parcel of parcels.slice(0, 4)) {
      page.drawText(sanitizePdfText(`· ${parcel.jibunAddress} ${parcel.areaLabel}`), {
        x: MARGIN + 4,
        y,
        size: 9,
        font: ctx.font,
        color: rgbColor(COLORS.text),
      });
      y -= 13;
    }
  }

  y -= 8;
  drawDisclaimerBox(
    page,
    ctx.font,
    y,
    "위 용량·면적은 공공데이터와 입력 정보를 바탕으로 산정한 1차 참고값이며, 현장 조건에 따라 달라질 수 있습니다.",
  );

  finishPage(page, ctx);
  return page;
}
