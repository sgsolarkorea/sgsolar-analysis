import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";
import type { ResolvedSiteReview } from "@/types/siteReview";
import type { ParcelSnapshot } from "@/types/parcelReview";
import type { MunicipalityOrdinanceData } from "@/types/regulatoryReview";
import { formatParcelShortLabel } from "@/lib/parcels/format";
import { company, MARKETING_NAME, siteLinks } from "@/data/sampleData";
import { getFieldValue } from "@/lib/solar/calculate";
import { formatRecWeightDisplay } from "@/lib/solar/formatRecWeight";
import { yearlyGenerationPerKw } from "@/data/solarConfig";
import { hasDetailedGridData, formatGridLevelName } from "@/lib/grid/display";
import { formatMw } from "@/lib/grid/evaluate";
import {
  COLORS,
  MARGIN,
  PAGE,
  drawMetricCard,
  drawPageFooter,
  drawPageHeader,
  drawSunLogo,
  drawTableRow,
  embedPngImage,
  fetchKakaoStaticMap,
  fetchQrCodePng,
  rgbColor,
  wrapText,
} from "@/lib/pdf/pdfHelpers";

const KR_FONT_URL =
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-kr@latest/korean-400-normal.ttf";

const TOTAL_PAGES = 6;

let cachedFontBytes: ArrayBuffer | null = null;

export interface SiteReviewPdfOptions {
  parcels?: ParcelSnapshot[];
  ordinance?: MunicipalityOrdinanceData | null;
}

function todayFileDate(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

async function loadKoreanFontBytes(): Promise<ArrayBuffer> {
  if (cachedFontBytes) return cachedFontBytes;
  const response = await fetch(KR_FONT_URL, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`PDF font load failed: HTTP ${response.status}`);
  }
  cachedFontBytes = await response.arrayBuffer();
  return cachedFontBytes;
}

function drawCoverPage(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  data: ResolvedSiteReview,
  mapImage: PDFImage | null,
) {
  const { height } = page.getSize();

  page.drawRectangle({
    x: 0,
    y: height - 160,
    width: PAGE.width,
    height: 160,
    color: rgbColor(COLORS.navy),
  });

  drawSunLogo(page, MARGIN, height - 88, 40);

  page.drawText(company.brandName, {
    x: MARGIN + 50,
    y: height - 62,
    size: 22,
    font: fontBold,
    color: rgbColor(COLORS.white),
  });

  page.drawText(MARKETING_NAME, {
    x: MARGIN + 50,
    y: height - 82,
    size: 9,
    font,
    color: rgb(0.85, 0.88, 0.95),
  });

  page.drawText("태양광 입지검토 제안서", {
    x: MARGIN,
    y: height - 200,
    size: 26,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });

  page.drawText("Site Review Proposal", {
    x: MARGIN,
    y: height - 222,
    size: 11,
    font,
    color: rgbColor(COLORS.slateLight),
  });

  let y = height - 260;
  const addressLines = wrapText(data.address, 46);
  for (const line of addressLines) {
    page.drawText(line, {
      x: MARGIN,
      y,
      size: 12,
      font: fontBold,
      color: rgbColor(COLORS.text),
    });
    y -= 18;
  }

  if (data.jibunAddress && data.jibunAddress !== data.address) {
    page.drawText(`지번: ${data.jibunAddress}`, {
      x: MARGIN,
      y: y - 4,
      size: 10,
      font,
      color: rgbColor(COLORS.slate),
    });
    y -= 20;
  }

  page.drawText(`작성일: ${data.analyzedAt}`, {
    x: MARGIN,
    y: y - 8,
    size: 10,
    font,
    color: rgbColor(COLORS.slate),
  });

  const mapY = 120;
  const mapW = PAGE.width - MARGIN * 2;
  const mapH = 240;

  page.drawRectangle({
    x: MARGIN,
    y: mapY,
    width: mapW,
    height: mapH,
    borderColor: rgbColor(COLORS.border),
    borderWidth: 1,
    color: rgbColor(COLORS.navyLight),
  });

  if (mapImage) {
    page.drawImage(mapImage, {
      x: MARGIN + 1,
      y: mapY + 1,
      width: mapW - 2,
      height: mapH - 2,
    });
  } else {
    page.drawText("입지 위치 지도", {
      x: MARGIN + mapW / 2 - 40,
      y: mapY + mapH / 2 + 6,
      size: 12,
      font: fontBold,
      color: rgbColor(COLORS.slateLight),
    });
    page.drawText(`${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`, {
      x: MARGIN + mapW / 2 - 52,
      y: mapY + mapH / 2 - 12,
      size: 9,
      font,
      color: rgbColor(COLORS.slate),
    });
  }

  page.drawText(
    "본 제안서는 공공데이터 기반 1차 입지검토 결과이며, 최종 설치·수익은 현장 실사 후 확정됩니다.",
    {
      x: MARGIN,
      y: 72,
      size: 8,
      font,
      color: rgbColor(COLORS.slate),
      maxWidth: mapW,
    },
  );
}

function drawSiteSummaryPage(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  data: ResolvedSiteReview,
  parcels?: ParcelSnapshot[],
) {
  let y = drawPageHeader(page, font, fontBold, "입지 요약", data.address);

  const landCategory = getFieldValue(data.landInfo, "지목");
  const zoning = getFieldValue(data.landInfo, "용도지역");
  const area = getFieldValue(data.landInfo, "면적");

  const cardW = (PAGE.width - MARGIN * 2 - 12) / 2;
  const cardH = 88;
  const metrics = [
    { label: "지목", value: landCategory },
    { label: "용도지역", value: zoning },
    { label: "면적", value: area },
    { label: "예상 설치용량", value: data.capacity },
    { label: "예상 발전량", value: data.annualGeneration },
    { label: "예상 연매출", value: data.annualRevenue },
    { label: "예상 시공비", value: data.constructionCost },
  ];

  for (let i = 0; i < metrics.length; i += 2) {
    const rowY = y - (Math.floor(i / 2) + 1) * (cardH + 10);
    drawMetricCard(page, font, fontBold, MARGIN, rowY, cardW, cardH, metrics[i].label, metrics[i].value);
    if (metrics[i + 1]) {
      drawMetricCard(
        page,
        font,
        fontBold,
        MARGIN + cardW + 12,
        rowY,
        cardW,
        cardH,
        metrics[i + 1].label,
        metrics[i + 1].value,
      );
    }
  }

  y = y - Math.ceil(metrics.length / 2) * (cardH + 10) - 24;

  page.drawText("설치 유형 · 추천", {
    x: MARGIN,
    y,
    size: 11,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });
  y -= 18;
  page.drawText(data.recommendation, {
    x: MARGIN,
    y,
    size: 10,
    font,
    color: rgbColor(COLORS.text),
  });

  if (parcels && parcels.length > 1) {
    y -= 28;
    page.drawText(`다중 필지 (${parcels.length}필지)`, {
      x: MARGIN,
      y,
      size: 10,
      font: fontBold,
      color: rgbColor(COLORS.navy),
    });
    y -= 16;
    for (const parcel of parcels.slice(0, 5)) {
      page.drawText(
        `· ${formatParcelShortLabel(parcel.jibunAddress)} ${parcel.areaLabel}${parcel.isPrimary ? " (대표)" : ""}`,
        { x: MARGIN + 4, y, size: 9, font, color: rgbColor(COLORS.text) },
      );
      y -= 14;
    }
  }

  drawPageFooter(page, font, 2, TOTAL_PAGES);
}

function drawGridPage(page: PDFPage, font: PDFFont, fontBold: PDFFont, data: ResolvedSiteReview) {
  let y = drawPageHeader(
    page,
    font,
    fontBold,
    "한전 계통 연계",
    "변전소 · MTR · D/L · 잔여용량 · 예상 접속용량",
  );

  const grid = data.gridInfo;
  const hasDetails = hasDetailedGridData(grid);
  const fmtName = (name: string) => formatGridLevelName(name, hasDetails);

  if (!hasDetails) {
    page.drawRectangle({
      x: MARGIN,
      y: y - 120,
      width: PAGE.width - MARGIN * 2,
      height: 120,
      color: rgbColor(COLORS.navyLight),
      borderColor: rgbColor(COLORS.border),
      borderWidth: 0.75,
    });
    page.drawText("한전 공개 데이터 미확보", {
      x: MARGIN + 16,
      y: y - 48,
      size: 16,
      font: fontBold,
      color: rgbColor(COLORS.navy),
    });
    page.drawText(
      "해당 위치의 계통 공개 데이터가 아직 확보되지 않았습니다. 한전 선로용량 공개 시스템에서 별도 확인이 필요합니다.",
      {
        x: MARGIN + 16,
        y: y - 72,
        size: 9,
        font,
        color: rgbColor(COLORS.slate),
        maxWidth: PAGE.width - MARGIN * 2 - 32,
      },
    );
    y -= 140;
  } else {
    if (grid.queryBasisLabel) {
      page.drawText(`조회 기준: ${grid.queryBasisLabel}`, {
        x: MARGIN,
        y,
        size: 9,
        font: fontBold,
        color: rgbColor(COLORS.slate),
      });
      y -= 16;
    }
    if (grid.nearbyNotice) {
      page.drawText(`※ ${grid.nearbyNotice}`, {
        x: MARGIN,
        y,
        size: 8,
        font,
        color: rgbColor(COLORS.slate),
        maxWidth: PAGE.width - MARGIN * 2,
      });
      y -= 28;
    }

    const cols = [
      { label: "구분", substation: "변전소", transformer: "MTR", dl: "D/L" },
      {
        label: "설비명",
        substation: fmtName(grid.substation.name),
        transformer: fmtName(grid.transformer.name),
        dl: fmtName(grid.distributionLine.name),
      },
      {
        label: "잔여용량",
        substation: formatMw(grid.substation.remainingMw),
        transformer: formatMw(grid.transformer.remainingMw),
        dl: formatMw(grid.distributionLine.remainingMw),
      },
    ];

    const tableW = PAGE.width - MARGIN * 2;
    const colW = tableW / 4;

    y = drawTableRow(
      page,
      font,
      fontBold,
      y,
      [
        { x: MARGIN, w: colW, text: "구분", bold: true },
        { x: MARGIN + colW, w: colW, text: "변전소", bold: true },
        { x: MARGIN + colW * 2, w: colW, text: "MTR", bold: true },
        { x: MARGIN + colW * 3, w: colW, text: "D/L", bold: true },
      ],
      true,
    );

    for (const row of cols.slice(1)) {
      y = drawTableRow(page, font, fontBold, y, [
        { x: MARGIN, w: colW, text: row.label, bold: true },
        { x: MARGIN + colW, w: colW, text: row.substation },
        { x: MARGIN + colW * 2, w: colW, text: row.transformer },
        { x: MARGIN + colW * 3, w: colW, text: row.dl },
      ]);
    }

    y -= 16;
    drawMetricCard(
      page,
      font,
      fontBold,
      MARGIN,
      y,
      (tableW - 12) / 2,
      72,
      "예상 접속용량",
      grid.expectedCapacityDisplay,
    );
    drawMetricCard(
      page,
      font,
      fontBold,
      MARGIN + (tableW - 12) / 2 + 12,
      y,
      (tableW - 12) / 2,
      72,
      "계통 연계 상태",
      grid.statusLabel,
    );
    y -= 96;

    page.drawText(grid.reviewResult, {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: rgbColor(COLORS.text),
      maxWidth: tableW,
    });
    y -= 24;
  }

  page.drawText("한전 연락처", {
    x: MARGIN,
    y,
    size: 11,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });
  y -= 18;

  const contacts = [
    { title: "관할 한전 지사", name: grid.contacts.kepcoBranch, phone: grid.contacts.branchPhone },
    { title: "전력공급부 담당자", name: "전력공급부 담당자", phone: grid.contacts.supplyPhone },
    { title: "배전계통 담당자", name: "배전계통 담당자", phone: grid.contacts.operationsPhone },
  ];

  const contactW = (PAGE.width - MARGIN * 2 - 16) / 3;
  for (let i = 0; i < contacts.length; i++) {
    const cx = MARGIN + i * (contactW + 8);
    page.drawRectangle({
      x: cx,
      y: y - 72,
      width: contactW,
      height: 72,
      borderColor: rgbColor(COLORS.border),
      borderWidth: 0.75,
      color: rgbColor(COLORS.white),
    });
    page.drawText(contacts[i].title, {
      x: cx + 8,
      y: y - 18,
      size: 8,
      font,
      color: rgbColor(COLORS.slate),
    });
    page.drawText(contacts[i].name, {
      x: cx + 8,
      y: y - 36,
      size: 9,
      font: fontBold,
      color: rgbColor(COLORS.text),
      maxWidth: contactW - 16,
    });
    page.drawText(contacts[i].phone, {
      x: cx + 8,
      y: y - 54,
      size: 9,
      font,
      color: rgbColor(COLORS.navy),
    });
  }

  drawPageFooter(page, font, 3, TOTAL_PAGES);
}

function drawOrdinancePage(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  ordinance: MunicipalityOrdinanceData | null | undefined,
  municipalityFallback: string,
) {
  let y = drawPageHeader(page, font, fontBold, "법·조례 검토", "지자체 조례 및 허가기준");

  if (!ordinance) {
    page.drawRectangle({
      x: MARGIN,
      y: y - 80,
      width: PAGE.width - MARGIN * 2,
      height: 80,
      color: rgbColor(COLORS.navyLight),
      borderColor: rgbColor(COLORS.border),
      borderWidth: 0.75,
    });
    page.drawText(`${municipalityFallback} 조례 데이터 준비 중`, {
      x: MARGIN + 12,
      y: y - 36,
      size: 12,
      font: fontBold,
      color: rgbColor(COLORS.navy),
    });
    page.drawText("관련 조례 수집·검토 후 자동 반영됩니다. 상담 시 별도 안내드립니다.", {
      x: MARGIN + 12,
      y: y - 54,
      size: 9,
      font,
      color: rgbColor(COLORS.slate),
    });
    drawPageFooter(page, font, 4, TOTAL_PAGES);
    return;
  }

  page.drawText(ordinance.municipalityLabel, {
    x: MARGIN,
    y,
    size: 10,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });
  y -= 16;
  page.drawText(ordinance.ordinanceTitle, {
    x: MARGIN,
    y,
    size: 9,
    font,
    color: rgbColor(COLORS.text),
    maxWidth: PAGE.width - MARGIN * 2,
  });
  y -= 22;

  const colW = (PAGE.width - MARGIN * 2) / 3;
  y = drawTableRow(
    page,
    font,
    fontBold,
    y,
    [
      { x: MARGIN, w: colW, text: "조례", bold: true },
      { x: MARGIN + colW, w: colW, text: "재개정일", bold: true },
      { x: MARGIN + colW * 2, w: colW, text: "법령·링크", bold: true },
    ],
    true,
  );

  const revisedDate = ordinance.enforcedDate ?? ordinance.promulgatedDate ?? "—";
  const lawLink = ordinance.ordinanceUrl
    ? ordinance.ordinanceUrl.replace(/^https?:\/\//, "").slice(0, 42)
    : "조례 확인 필요";

  y = drawTableRow(page, font, fontBold, y, [
    { x: MARGIN, w: colW, text: ordinance.ordinanceTitle },
    { x: MARGIN + colW, w: colW, text: revisedDate },
    { x: MARGIN + colW * 2, w: colW, text: lawLink },
  ]);

  if (ordinance.relatedLaw) {
    y = drawTableRow(page, font, fontBold, y, [
      { x: MARGIN, w: colW, text: "관련 법령" },
      { x: MARGIN + colW, w: colW, text: "—" },
      { x: MARGIN + colW * 2, w: colW, text: ordinance.relatedLaw },
    ]);
  }

  y -= 12;
  page.drawText("이격거리 기준", {
    x: MARGIN,
    y,
    size: 10,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });
  y -= 14;

  y = drawTableRow(
    page,
    font,
    fontBold,
    y,
    [
      { x: MARGIN, w: colW, text: "항목", bold: true },
      { x: MARGIN + colW, w: colW * 2, text: "기준", bold: true },
    ],
    true,
  );

  for (const rule of ordinance.distanceRules.slice(0, 8)) {
    y = drawTableRow(page, font, fontBold, y, [
      { x: MARGIN, w: colW, text: rule.label },
      { x: MARGIN + colW, w: colW * 2, text: rule.distance },
    ]);
    if (y < 100) break;
  }

  if (ordinance.ordinanceUrl) {
    page.drawText(`조례 원문: ${ordinance.ordinanceUrl}`, {
      x: MARGIN,
      y: 56,
      size: 7.5,
      font,
      color: rgbColor(COLORS.slate),
      maxWidth: PAGE.width - MARGIN * 2,
    });
  }

  drawPageFooter(page, font, 4, TOTAL_PAGES);
}

function drawProfitabilityPage(page: PDFPage, font: PDFFont, fontBold: PDFFont, data: ResolvedSiteReview) {
  let y = drawPageHeader(page, font, fontBold, "수익성 분석", "SMP · REC · 가중치 · 발전량 기준");

  const m = data.solarMetrics;
  const p = data.profitability;
  const colW = (PAGE.width - MARGIN * 2) / 2;

  y = drawTableRow(
    page,
    font,
    fontBold,
    y,
    [
      { x: MARGIN, w: colW, text: "항목", bold: true },
      { x: MARGIN + colW, w: colW, text: "값", bold: true },
    ],
    true,
  );

  const rows: [string, string][] = [
    ["SMP 단가", `${m.market.smpPrice}원/kWh (${m.market.smpDate})`],
    ["REC 단가", `${m.market.recPrice.toLocaleString("ko-KR")}원/MWh (${m.market.recDate})`],
    ["REC 가중치", `${formatRecWeightDisplay(m.recWeight)} — ${m.recWeightReason}`],
    ["연간 발전량", data.annualGeneration],
    ["발전량 산출", `${yearlyGenerationPerKw.toLocaleString("ko-KR")}kWh/kW·년 × ${m.capacityKw.toFixed(1)}kW`],
    ["SMP 수익", p.smpRevenue],
    ["REC 수익", p.recRevenue],
    ["예상 연매출", p.totalRevenue],
    ["예상 시공비", p.estimatedInstallCost],
  ];

  for (const [label, value] of rows) {
    y = drawTableRow(page, font, fontBold, y, [
      { x: MARGIN, w: colW, text: label, bold: true },
      { x: MARGIN + colW, w: colW, text: value },
    ]);
  }

  y -= 8;
  page.drawRectangle({
    x: MARGIN,
    y: y - 36,
    width: PAGE.width - MARGIN * 2,
    height: 36,
    color: rgb(0.99, 0.96, 0.9),
    borderColor: rgb(0.92, 0.78, 0.45),
    borderWidth: 0.5,
  });
  page.drawText(
    "⚠ 예상 수익은 SMP, REC, 일사량, 자가소비 여부, 설비조건, 가중치, 금융조건에 따라 달라질 수 있습니다.",
    {
      x: MARGIN + 10,
      y: y - 22,
      size: 8,
      font,
      color: rgb(0.45, 0.32, 0.05),
      maxWidth: PAGE.width - MARGIN * 2 - 20,
    },
  );

  drawPageFooter(page, font, 5, TOTAL_PAGES);
}

function drawContactPage(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  data: ResolvedSiteReview,
  qrImage: PDFImage | null,
) {
  let y = drawPageHeader(page, font, fontBold, "SG SOLAR 상담 안내", company.companyName);

  page.drawText(
    "신재생에너지 전문기업 SG SOLAR는 태양광 발전사업 컨설팅, 설계·시공, 유지관리까지 원스톱으로 지원합니다.",
    {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: rgbColor(COLORS.text),
      maxWidth: PAGE.width - MARGIN * 2 - 120,
    },
  );
  y -= 36;

  const infoLines = [
    `대표전화: ${company.phone}`,
    `이메일: ${company.email}`,
    `웹사이트: ${company.website}`,
    `상담 링크: ${siteLinks.mainSite}`,
  ];

  for (const line of infoLines) {
    page.drawText(line, { x: MARGIN, y, size: 10, font, color: rgbColor(COLORS.text) });
    y -= 16;
  }

  if (qrImage) {
    page.drawImage(qrImage, {
      x: PAGE.width - MARGIN - 96,
      y: PAGE.height - 220,
      width: 96,
      height: 96,
    });
    page.drawText("웹사이트 QR", {
      x: PAGE.width - MARGIN - 96,
      y: PAGE.height - 232,
      size: 7,
      font,
      color: rgbColor(COLORS.slate),
    });
  }

  y -= 12;
  page.drawText("유사 시공사례 (자동 매칭)", {
    x: MARGIN,
    y,
    size: 11,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });
  y -= 18;

  const cases = data.recommendedCases.slice(0, 3);
  if (cases.length === 0) {
    page.drawText("해당 지역·유형과 유사한 시공사례를 상담 시 안내드립니다.", {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: rgbColor(COLORS.slate),
    });
  } else {
    for (const item of cases) {
      page.drawRectangle({
        x: MARGIN,
        y: y - 52,
        width: PAGE.width - MARGIN * 2,
        height: 52,
        borderColor: rgbColor(COLORS.border),
        borderWidth: 0.5,
        color: rgbColor(COLORS.white),
      });
      page.drawText(item.title, {
        x: MARGIN + 10,
        y: y - 18,
        size: 9,
        font: fontBold,
        color: rgbColor(COLORS.text),
        maxWidth: PAGE.width - MARGIN * 2 - 20,
      });
      page.drawText(`${item.capacity} · ${item.region} — ${item.recommendReason}`, {
        x: MARGIN + 10,
        y: y - 34,
        size: 8,
        font,
        color: rgbColor(COLORS.slate),
        maxWidth: PAGE.width - MARGIN * 2 - 20,
      });
      y -= 60;
    }
  }

  y -= 8;
  page.drawText("무료 입지검토 상담을 원하시면 위 연락처 또는 QR 코드를 이용해 주세요.", {
    x: MARGIN,
    y: Math.max(y, 80),
    size: 9,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });

  drawPageFooter(page, font, 6, TOTAL_PAGES);
}

export async function generateSiteReviewPdf(
  data: ResolvedSiteReview,
  options: SiteReviewPdfOptions = {},
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = await loadKoreanFontBytes();
  const font = await pdfDoc.embedFont(fontBytes);
  const fontBold = font;

  pdfDoc.setTitle("SG SOLAR 태양광 입지검토 제안서");
  pdfDoc.setSubject(`${data.address} 입지검토 결과`);
  pdfDoc.setCreator(MARKETING_NAME);

  const [mapBytes, qrBytes] = await Promise.all([
    fetchKakaoStaticMap(data.lat, data.lng),
    fetchQrCodePng(siteLinks.mainSite, 120),
  ]);

  const mapImage = await embedPngImage(pdfDoc, mapBytes);
  const qrImage = await embedPngImage(pdfDoc, qrBytes);

  const pages: PDFPage[] = [];
  for (let i = 0; i < TOTAL_PAGES; i++) {
    pages.push(pdfDoc.addPage([PAGE.width, PAGE.height]));
  }

  drawCoverPage(pages[0], font, fontBold, data, mapImage);
  drawSiteSummaryPage(pages[1], font, fontBold, data, options.parcels);
  drawGridPage(pages[2], font, fontBold, data);
  drawOrdinancePage(
    pages[3],
    font,
    fontBold,
    options.ordinance,
    data.address.split(" ")[1] ?? data.address,
  );
  drawProfitabilityPage(pages[4], font, fontBold, data);
  drawContactPage(pages[5], font, fontBold, data, qrImage);

  return pdfDoc.save();
}

export function siteReviewPdfFilename(): string {
  return `sgsolar-site-review-${todayFileDate().replace(/-/g, "")}.pdf`;
}
