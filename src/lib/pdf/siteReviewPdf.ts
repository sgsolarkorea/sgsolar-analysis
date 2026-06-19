import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";
import type { ResolvedSiteReview } from "@/types/siteReview";
import type { ParcelSnapshot } from "@/types/parcelReview";
import type { MunicipalityOrdinanceData } from "@/types/regulatoryReview";
import { formatParcelShortLabel } from "@/lib/parcels/format";
import { company, MARKETING_NAME, siteLinks } from "@/data/sampleData";
import { getFieldValue } from "@/lib/solar/calculate";
import { formatRecWeightDisplay } from "@/lib/solar/formatRecWeight";
import { hasDetailedGridData, formatGridLevelName } from "@/lib/grid/display";
import { formatGridCapacityMwOrKw, formatRemainingWithStatus, formatSolarCapacityKw } from "@/lib/grid/evaluate";
import { isHouseholdInstallType, formatHouseholdMonthlySavings, HOUSEHOLD_SAVINGS_DISCLAIMER, HOUSEHOLD_SAVINGS_PER_KW } from "@/lib/solar/householdSavings";
import { isMountainOrForestSite, MOUNTAIN_REC_WEIGHT_NOTE } from "@/lib/site/mountainLand";
import {
  COLORS,
  MARGIN,
  PAGE,
  drawBrandLogo,
  drawInfoCard,
  drawMetricCard,
  drawPageFooter,
  drawPageHeader,
  drawTableRow,
  embedPngImage,
  fetchKakaoStaticMap,
  fetchQrCodePng,
  loadBrandLogoBytes,
  rgbColor,
  sanitizePdfText,
  wrapTextByWidth,
} from "@/lib/pdf/pdfHelpers";
import { disclaimer as solarDisclaimer } from "@/data/solarConfig";
import { formatInstallTypeDisplayLabel } from "@/data/resultUx";

const KR_FONT_REGULAR =
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-kr@latest/korean-400-normal.ttf";
const KR_FONT_BOLD =
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-kr@latest/korean-700-normal.ttf";

const fontCache = new Map<string, ArrayBuffer>();

export interface SiteReviewPdfOptions {
  parcels?: ParcelSnapshot[];
  ordinance?: MunicipalityOrdinanceData | null;
}

function todayFileDate(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

async function loadFontBytes(url: string): Promise<ArrayBuffer> {
  const cached = fontCache.get(url);
  if (cached) return cached;
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`PDF font load failed: HTTP ${response.status}`);
  }
  const bytes = await response.arrayBuffer();
  fontCache.set(url, bytes);
  return bytes;
}

function hasOrdinanceContent(ordinance?: MunicipalityOrdinanceData | null): boolean {
  if (!ordinance) return false;
  return Boolean(
    ordinance.ordinanceTitle?.trim() ||
      ordinance.distanceRules?.length ||
      ordinance.ordinanceUrl,
  );
}

function drawCoverPage(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  data: ResolvedSiteReview,
  mapImage: PDFImage | null,
  logoImage: PDFImage | null,
  pageNum: number,
  totalPages: number,
) {
  const { height } = page.getSize();

  page.drawRectangle({
    x: 0,
    y: height - 140,
    width: PAGE.width,
    height: 140,
    color: rgbColor(COLORS.navy),
  });

  drawBrandLogo(page, fontBold, MARGIN, height - 72, logoImage, 36, true);

  page.drawText("태양광 입지검토 제안서", {
    x: MARGIN,
    y: height - 168,
    size: 24,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });

  page.drawText("Site Review Proposal", {
    x: MARGIN,
    y: height - 186,
    size: 10,
    font,
    color: rgbColor(COLORS.slateLight),
  });

  const contentW = PAGE.width - MARGIN * 2;
  const kpiW = (contentW - 16) / 3;
  const kpiH = 72;
  let kpiY = height - 210;

  const isHousehold = isHouseholdInstallType(data.solarMetrics.installType);
  const kpis = [
    { label: "예상 설치용량", value: data.capacity },
    { label: "예상 발전량", value: data.annualGeneration },
    {
      label: isHousehold ? "월 예상 절감액" : "예상 연매출",
      value: isHousehold
        ? formatHouseholdMonthlySavings(data.solarMetrics.capacityKw)
        : data.annualRevenue,
    },
    { label: "예상 시공비", value: data.constructionCost },
    { label: "추천유형", value: data.recommendation },
    { label: "REC 가중치", value: formatRecWeightDisplay(data.solarMetrics.recWeight) },
  ];

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const i = row * 3 + col;
      drawMetricCard(
        page,
        font,
        fontBold,
        MARGIN + col * (kpiW + 8),
        kpiY,
        kpiW,
        kpiH,
        kpis[i].label,
        kpis[i].value,
      );
    }
    kpiY -= kpiH + 12;
  }

  kpiY -= 4;
  page.drawText(`작성일: ${data.analyzedAt}`, {
    x: MARGIN,
    y: kpiY,
    size: 9,
    font,
    color: rgbColor(COLORS.slate),
  });
  kpiY -= 14;
  const constructionExtra =
    data.solarMetrics.installType === "토지형"
      ? solarDisclaimer.constructionLandExtra
      : solarDisclaimer.constructionBuildingExtra;
  for (const line of [
    `※ ${solarDisclaimer.construction}`,
    `※ ${constructionExtra}`,
  ]) {
    page.drawText(sanitizePdfText(line), {
      x: MARGIN,
      y: kpiY,
      size: 7.5,
      font,
      color: rgbColor(COLORS.slate),
      maxWidth: contentW,
    });
    kpiY -= 11;
  }
  kpiY -= 3;
  page.drawText("검토 주소", {
    x: MARGIN,
    y: kpiY,
    size: 9,
    font: fontBold,
    color: rgbColor(COLORS.slate),
  });
  kpiY -= 14;

  for (const line of wrapTextByWidth(data.address, fontBold, 11, contentW)) {
    page.drawText(line, {
      x: MARGIN,
      y: kpiY,
      size: 11,
      font: fontBold,
      color: rgbColor(COLORS.text),
    });
    kpiY -= 15;
  }

  if (data.jibunAddress && data.jibunAddress !== data.address) {
    page.drawText(sanitizePdfText(`지번: ${data.jibunAddress}`), {
      x: MARGIN,
      y: kpiY - 2,
      size: 9,
      font,
      color: rgbColor(COLORS.slate),
    });
    kpiY -= 16;
  }

  const mapH = mapImage ? 100 : 48;
  const mapY = 88;

  page.drawRectangle({
    x: MARGIN,
    y: mapY,
    width: contentW,
    height: mapH,
    borderColor: rgbColor(COLORS.border),
    borderWidth: 0.75,
    color: rgbColor(COLORS.navyLight),
  });

  if (mapImage) {
    page.drawImage(mapImage, {
      x: MARGIN + 1,
      y: mapY + 1,
      width: contentW - 2,
      height: mapH - 2,
    });
  } else {
    page.drawText("입지 위치 지도는 준비 중입니다.", {
      x: MARGIN + 12,
      y: mapY + mapH / 2 - 4,
      size: 9,
      font,
      color: rgbColor(COLORS.slate),
    });
  }

  page.drawText(
    sanitizePdfText(
      "본 제안서는 공공데이터 기반 1차 입지검토 결과이며, 최종 설치·수익은 현장 실사 후 확정됩니다.",
    ),
    {
      x: MARGIN,
      y: 56,
      size: 7.5,
      font,
      color: rgbColor(COLORS.slate),
      maxWidth: contentW,
    },
  );

  drawPageFooter(page, font, pageNum, totalPages);
}

function drawSiteSummaryPage(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  data: ResolvedSiteReview,
  parcels: ParcelSnapshot[] | undefined,
  logoImage: PDFImage | null,
  pageNum: number,
  totalPages: number,
) {
  let y = drawPageHeader(page, font, fontBold, "입지 요약", data.address, logoImage);

  const landCategory = getFieldValue(data.landInfo, "지목");
  const zoning = getFieldValue(data.landInfo, "용도지역");
  const area = getFieldValue(data.landInfo, "면적");

  const cardW = (PAGE.width - MARGIN * 2 - 12) / 2;
  const cardH = 84;
  const metrics = [
    { label: "지목", value: landCategory },
    { label: "용도지역", value: zoning },
    { label: "면적", value: area },
    { label: "예상 설치용량", value: data.capacity },
    { label: "예상 발전량", value: data.annualGeneration },
    {
      label: isHouseholdInstallType(data.solarMetrics.installType) ? "월 예상 절감액" : "예상 연매출",
      value: isHouseholdInstallType(data.solarMetrics.installType)
        ? formatHouseholdMonthlySavings(data.solarMetrics.capacityKw)
        : data.annualRevenue,
    },
    { label: "예상 시공비", value: data.constructionCost },
    { label: "추천유형", value: data.recommendation },
    {
      label: "REC 가중치",
      value: formatRecWeightDisplay(data.solarMetrics.recWeight),
    },
  ];

  if (data.landInfoDetail.priceReferenceDate) {
    metrics.splice(3, 0, {
      label: "지적도 업데이트 기준일",
      value: data.landInfoDetail.priceReferenceDate,
    });
  }

  for (let i = 0; i < metrics.length; i += 2) {
    const rowY = y - (Math.floor(i / 2) + 1) * (cardH + 10);
    drawMetricCard(
      page,
      font,
      fontBold,
      MARGIN,
      rowY,
      cardW,
      cardH,
      metrics[i].label,
      metrics[i].value,
    );
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

  y = y - Math.ceil(metrics.length / 2) * (cardH + 10) - 20;

  if (parcels && parcels.length > 1) {
    page.drawText(sanitizePdfText(`다중 필지 (${parcels.length}필지)`), {
      x: MARGIN,
      y,
      size: 10,
      font: fontBold,
      color: rgbColor(COLORS.navy),
    });
    y -= 16;
    for (const parcel of parcels.slice(0, 5)) {
      page.drawText(
        sanitizePdfText(
          `· ${formatParcelShortLabel(parcel.jibunAddress)} ${parcel.areaLabel}${parcel.isPrimary ? " (대표)" : ""}`,
        ),
        { x: MARGIN + 4, y, size: 9, font, color: rgbColor(COLORS.text) },
      );
      y -= 14;
    }
  }

  drawPageFooter(page, font, pageNum, totalPages);
}

function drawGridPage(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  data: ResolvedSiteReview,
  logoImage: PDFImage | null,
  pageNum: number,
  totalPages: number,
) {
  let y = drawPageHeader(
    page,
    font,
    fontBold,
    "한전 계통 연계",
    "변전소 · MTR · D/L · 태양광 설치용량",
    logoImage,
  );

  const grid = data.gridInfo;
  const hasDetails = hasDetailedGridData(grid);
  const fmtName = (name: string) => formatGridLevelName(name, hasDetails);
  const contentW = PAGE.width - MARGIN * 2;

  if (!hasDetails) {
    drawInfoCard(
      page,
      font,
      fontBold,
      MARGIN,
      y,
      contentW,
      72,
      "한전 공개 데이터 미확보",
      "해당 위치의 계통 공개 데이터가 아직 확보되지 않았습니다. 한전 선로용량 공개 시스템에서 별도 확인이 필요합니다.",
    );
    y -= 88;
  } else {
    const rows: [string, string][] = [
      ["변전소", fmtName(grid.substation.name)],
      ["변압기 (MTR)", fmtName(grid.transformer.name)],
      ["배전선로 (D/L)", fmtName(grid.distributionLine.name)],
      ["태양광 설치용량", formatSolarCapacityKw(data.solarMetrics.capacityKw, "—")],
      [
        "D/L 잔여용량",
        formatGridCapacityMwOrKw(grid.distributionLine.remainingMw),
      ],
      ["검토결과", grid.reviewResult],
      ["데이터 출처", grid.dataSourceLabel],
    ];
    if (grid.queryBasisLabel) {
      rows.push(["조회 기준", grid.queryBasisLabel]);
    }

    const colW = contentW / 2;
    y = drawTableRow(
      page,
      font,
      fontBold,
      y,
      [
        { x: MARGIN, w: colW, text: "항목", bold: true },
        { x: MARGIN + colW, w: colW, text: "내용", bold: true },
      ],
      true,
    );

    for (const [label, value] of rows) {
      y = drawTableRow(page, font, fontBold, y, [
        { x: MARGIN, w: colW, text: label, bold: true },
        { x: MARGIN + colW, w: colW, text: value },
      ]);
    }

    if (grid.nearbyNotice) {
      y -= 8;
      page.drawText(sanitizePdfText(`※ ${grid.nearbyNotice}`), {
        x: MARGIN,
        y,
        size: 8,
        font,
        color: rgbColor(COLORS.slate),
        maxWidth: contentW,
      });
      y -= 20;
    }

    y -= 8;
    const detailRows = [
      ["변전소 잔여", formatRemainingWithStatus(grid.substation.remainingMw, grid.expectedCapacityMw)],
      ["MTR 잔여", formatRemainingWithStatus(grid.transformer.remainingMw, grid.expectedCapacityMw)],
      ["D/L 잔여", formatRemainingWithStatus(grid.distributionLine.remainingMw, grid.expectedCapacityMw)],
    ];
    const detailW = (contentW - 16) / 3;
    for (let i = 0; i < detailRows.length; i++) {
      drawMetricCard(
        page,
        font,
        fontBold,
        MARGIN + i * (detailW + 8),
        y,
        detailW,
        64,
        detailRows[i][0],
        detailRows[i][1],
      );
    }
    y -= 80;
  }

  page.drawText("한전 연락처", {
    x: MARGIN,
    y,
    size: 10,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });
  y -= 16;

  const contacts = [
    { title: "관할 한전 지사", name: grid.contacts.kepcoBranch, phone: grid.contacts.branchPhone },
    { title: "전력공급부", name: "전력공급부 담당", phone: grid.contacts.supplyPhone },
    { title: "배전계통", name: "배전계통 담당", phone: grid.contacts.operationsPhone },
  ];

  const contactW = (contentW - 16) / 3;
  for (let i = 0; i < contacts.length; i++) {
    const cx = MARGIN + i * (contactW + 8);
    drawInfoCard(
      page,
      font,
      fontBold,
      cx,
      y,
      contactW,
      68,
      contacts[i].title,
      `${contacts[i].name}\n${contacts[i].phone}`,
    );
  }

  drawPageFooter(page, font, pageNum, totalPages);
}

function drawOrdinancePage(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  ordinance: MunicipalityOrdinanceData,
  logoImage: PDFImage | null,
  pageNum: number,
  totalPages: number,
) {
  let y = drawPageHeader(page, font, fontBold, "법·조례 검토", "지자체 조례 및 허가기준", logoImage);

  page.drawText(sanitizePdfText(ordinance.municipalityLabel), {
    x: MARGIN,
    y,
    size: 10,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });
  y -= 16;
  page.drawText(sanitizePdfText(ordinance.ordinanceTitle), {
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

  if (ordinance.distanceRules.length > 0) {
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

    for (const rule of ordinance.distanceRules.slice(0, 10)) {
      y = drawTableRow(page, font, fontBold, y, [
        { x: MARGIN, w: colW, text: rule.label },
        { x: MARGIN + colW, w: colW * 2, text: rule.distance },
      ]);
      if (y < 100) break;
    }
  }

  if (ordinance.ordinanceUrl) {
    page.drawText(sanitizePdfText(`조례 원문: ${ordinance.ordinanceUrl}`), {
      x: MARGIN,
      y: 56,
      size: 7.5,
      font,
      color: rgbColor(COLORS.slate),
      maxWidth: PAGE.width - MARGIN * 2,
    });
  }

  drawPageFooter(page, font, pageNum, totalPages);
}

function drawProfitabilityPage(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  data: ResolvedSiteReview,
  logoImage: PDFImage | null,
  pageNum: number,
  totalPages: number,
) {
  const isHousehold = isHouseholdInstallType(data.solarMetrics.installType);
  let y = drawPageHeader(
    page,
    font,
    fontBold,
    isHousehold ? "전기요금 절감 안내" : "수익성 분석",
    isHousehold ? "상계거래(가정용) 기준" : "SMP · REC · 가중치 기준",
    logoImage,
  );

  const m = data.solarMetrics;
  const p = data.profitability;
  const colW = (PAGE.width - MARGIN * 2) / 2;
  const showMountainNote = isMountainOrForestSite(
    data.address,
    data.jibunAddress,
    getFieldValue(data.landInfo, "지목"),
  );

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

  const rows: [string, string][] = isHousehold
    ? [
        ["예상 설치용량", data.capacity],
        ["월 예상 절감액", formatHouseholdMonthlySavings(m.capacityKw)],
        [
          "절감 기준",
          `설치용량(kW) × ${HOUSEHOLD_SAVINGS_PER_KW.toLocaleString("ko-KR")}원/월`,
        ],
        ["참고 (3·6·9kW)", "약 5·10·15만원/월"],
      ]
    : [
        ["SMP 단가", `${m.market.smpPrice}원/kWh (${m.market.smpDate})`],
        ["REC 단가", `${m.market.recPrice.toLocaleString("ko-KR")}원/MWh (${m.market.recDate})`],
        [
          "REC 가중치",
          `${formatRecWeightDisplay(m.recWeight)}${showMountainNote ? ` · ${MOUNTAIN_REC_WEIGHT_NOTE}` : ""}`,
        ],
        ["연간 발전량", data.annualGeneration],
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

  y -= 12;
  page.drawRectangle({
    x: MARGIN,
    y: y - 40,
    width: PAGE.width - MARGIN * 2,
    height: 40,
    color: rgb(0.99, 0.96, 0.9),
    borderColor: rgb(0.92, 0.78, 0.45),
    borderWidth: 0.5,
  });
  page.drawText(
    sanitizePdfText(
      isHousehold
        ? `※ ${HOUSEHOLD_SAVINGS_DISCLAIMER}`
        : "※ 예상 수익은 SMP, REC, 일사량, 자가소비 여부, 설비조건, 가중치, 금융조건에 따라 달라질 수 있습니다.",
    ),
    {
      x: MARGIN + 10,
      y: y - 24,
      size: 8,
      font,
      color: rgb(0.45, 0.32, 0.05),
      maxWidth: PAGE.width - MARGIN * 2 - 20,
    },
  );

  drawPageFooter(page, font, pageNum, totalPages);
}

function drawContactPage(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  data: ResolvedSiteReview,
  qrImage: PDFImage | null,
  logoImage: PDFImage | null,
  pageNum: number,
  totalPages: number,
) {
  let y = drawPageHeader(page, font, fontBold, "SG SOLAR 상담 안내", company.companyName, logoImage);

  const introW = PAGE.width - MARGIN * 2 - (qrImage ? 112 : 0);
  page.drawRectangle({
    x: MARGIN,
    y: y - 56,
    width: introW,
    height: 56,
    color: rgbColor(COLORS.navyLight),
    borderColor: rgbColor(COLORS.border),
    borderWidth: 0.75,
  });
  page.drawText("SG SOLAR 소개", {
    x: MARGIN + 12,
    y: y - 18,
    size: 10,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });
  page.drawText(
    sanitizePdfText(
      "신재생에너지 전문기업 SG SOLAR는 태양광 발전사업 컨설팅, 설계·시공, 유지관리까지 원스톱으로 지원합니다.",
    ),
    {
      x: MARGIN + 12,
      y: y - 34,
      size: 8.5,
      font,
      color: rgbColor(COLORS.text),
      maxWidth: introW - 24,
    },
  );

  if (qrImage) {
    page.drawImage(qrImage, {
      x: PAGE.width - MARGIN - 96,
      y: y - 96,
      width: 96,
      height: 96,
    });
    page.drawText("웹사이트 QR", {
      x: PAGE.width - MARGIN - 96,
      y: y - 108,
      size: 7,
      font,
      color: rgbColor(COLORS.slate),
    });
  }

  y -= 72;

  const contactItems = [
    { label: "대표전화", value: company.phone },
    { label: "이메일", value: company.email },
    { label: "웹사이트", value: company.website },
  ];
  const itemW = (PAGE.width - MARGIN * 2 - 16) / 3;
  for (let i = 0; i < contactItems.length; i++) {
    drawMetricCard(
      page,
      font,
      fontBold,
      MARGIN + i * (itemW + 8),
      y,
      itemW,
      64,
      contactItems[i].label,
      contactItems[i].value,
    );
  }

  y -= 84;
  page.drawText("유사 시공사례", {
    x: MARGIN,
    y,
    size: 11,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });
  y -= 18;

  const cases = data.recommendedCases.slice(0, 3);
  const caseW = (PAGE.width - MARGIN * 2 - 16) / Math.min(cases.length || 1, 3);

  if (cases.length === 0) {
    page.drawText("해당 지역·유형과 유사한 시공사례를 상담 시 안내드립니다.", {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: rgbColor(COLORS.slate),
    });
  } else {
    for (let i = 0; i < cases.length; i++) {
      const item = cases[i];
      const cx = MARGIN + i * (caseW + 8);
      page.drawRectangle({
        x: cx,
        y: y - 72,
        width: caseW,
        height: 72,
        borderColor: rgbColor(COLORS.border),
        borderWidth: 0.75,
        color: rgbColor(COLORS.white),
      });
      page.drawText(sanitizePdfText(item.title), {
        x: cx + 10,
        y: y - 20,
        size: 8.5,
        font: fontBold,
        color: rgbColor(COLORS.navy),
        maxWidth: caseW - 20,
      });
      page.drawText(sanitizePdfText(item.capacity), {
        x: cx + 10,
        y: y - 36,
        size: 8,
        font,
        color: rgbColor(COLORS.text),
      });
      page.drawText(sanitizePdfText(item.region), {
        x: cx + 10,
        y: y - 50,
        size: 8,
        font,
        color: rgbColor(COLORS.slate),
      });
      page.drawText(sanitizePdfText(item.recommendReason), {
        x: cx + 10,
        y: y - 64,
        size: 7.5,
        font,
        color: rgbColor(COLORS.slate),
        maxWidth: caseW - 20,
      });
    }
    y -= 84;
  }

  page.drawText("무료 입지검토 상담을 원하시면 위 연락처 또는 QR 코드를 이용해 주세요.", {
    x: MARGIN,
    y: Math.max(y - 8, 72),
    size: 9,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });

  drawPageFooter(page, font, pageNum, totalPages);
}

export async function generateSiteReviewPdf(
  data: ResolvedSiteReview,
  options: SiteReviewPdfOptions = {},
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const [regularBytes, boldBytes, logoBytes, mapBytes, qrBytes] = await Promise.all([
    loadFontBytes(KR_FONT_REGULAR),
    loadFontBytes(KR_FONT_BOLD),
    loadBrandLogoBytes(),
    fetchKakaoStaticMap(data.lat, data.lng),
    fetchQrCodePng(siteLinks.mainSite, 120),
  ]);

  const font = await pdfDoc.embedFont(regularBytes);
  const fontBold = await pdfDoc.embedFont(boldBytes);

  pdfDoc.setTitle("SG SOLAR 태양광 입지검토 제안서");
  pdfDoc.setSubject(`${data.address} 입지검토 결과`);
  pdfDoc.setCreator(MARKETING_NAME);

  const logoImage = await embedPngImage(pdfDoc, logoBytes);
  const mapImage = await embedPngImage(pdfDoc, mapBytes);
  const qrImage = await embedPngImage(pdfDoc, qrBytes);

  const includeOrdinance = hasOrdinanceContent(options.ordinance);
  const totalPages = includeOrdinance ? 6 : 5;
  let pageNum = 1;

  const cover = pdfDoc.addPage([PAGE.width, PAGE.height]);
  drawCoverPage(cover, font, fontBold, data, mapImage, logoImage, pageNum++, totalPages);

  const summary = pdfDoc.addPage([PAGE.width, PAGE.height]);
  drawSiteSummaryPage(
    summary,
    font,
    fontBold,
    data,
    options.parcels,
    logoImage,
    pageNum++,
    totalPages,
  );

  const grid = pdfDoc.addPage([PAGE.width, PAGE.height]);
  drawGridPage(grid, font, fontBold, data, logoImage, pageNum++, totalPages);

  if (includeOrdinance && options.ordinance) {
    const ordinance = pdfDoc.addPage([PAGE.width, PAGE.height]);
    drawOrdinancePage(ordinance, font, fontBold, options.ordinance, logoImage, pageNum++, totalPages);
  }

  const profit = pdfDoc.addPage([PAGE.width, PAGE.height]);
  drawProfitabilityPage(profit, font, fontBold, data, logoImage, pageNum++, totalPages);

  const contact = pdfDoc.addPage([PAGE.width, PAGE.height]);
  drawContactPage(contact, font, fontBold, data, qrImage, logoImage, pageNum, totalPages);

  return pdfDoc.save();
}

export function siteReviewPdfFilename(): string {
  return `sgsolar-site-review-${todayFileDate().replace(/-/g, "")}.pdf`;
}
