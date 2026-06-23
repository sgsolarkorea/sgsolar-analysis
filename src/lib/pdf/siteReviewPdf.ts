import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";
import type { ResolvedSiteReview } from "@/types/siteReview";
import type { ParcelSnapshot } from "@/types/parcelReview";
import type { MunicipalityOrdinanceData } from "@/types/regulatoryReview";
import { MARKETING_NAME } from "@/data/sampleData";
import {
  COLORS,
  MARGIN,
  PAGE,
  drawBrandLogo,
  drawDisclaimerBox,
  drawMetricCard,
  drawPageFooter,
  embedPngImage,
  fetchKakaoStaticMap,
  loadBrandLogoBytes,
  loadKrFontBytes,
  rgbColor,
  sanitizePdfText,
} from "@/lib/pdf/pdfHelpers";
import {
  PDF_LEGAL_DISCLAIMER,
  PDF_REPORT_TITLE,
  deriveOverallReviewStatus,
  estimatePdfPageCount,
  formatInstallTypeForPdf,
} from "@/lib/pdf/reportContent";
import {
  drawChecklistAndCtaSection,
  drawGridGuidanceSection,
  drawOrdinanceAppendix,
  drawRegulatoryAnalysisSection,
  drawSetbackReviewSection,
  drawSiteOverviewSection,
  type PdfRenderContext,
} from "@/lib/pdf/reportSections";

export interface SiteReviewPdfOptions {
  parcels?: ParcelSnapshot[];
  ordinance?: MunicipalityOrdinanceData | null;
}

function todayFileDate(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

async function loadFontBytes(weight: "regular" | "medium" | "bold"): Promise<ArrayBuffer> {
  return loadKrFontBytes(weight);
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
  const contentW = PAGE.width - MARGIN * 2;
  const overallStatus = deriveOverallReviewStatus(data);

  page.drawRectangle({
    x: 0,
    y: height - 140,
    width: PAGE.width,
    height: 140,
    color: rgbColor(COLORS.navy),
  });

  drawBrandLogo(page, fontBold, MARGIN, height - 72, logoImage, 36, true);

  page.drawText(PDF_REPORT_TITLE, {
    x: MARGIN,
    y: height - 168,
    size: 20,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });

  page.drawText("Solar Site Pre-Review Report", {
    x: MARGIN,
    y: height - 186,
    size: 10,
    font,
    color: rgbColor(COLORS.slateLight),
  });

  const kpis = [
    { label: "분석 주소", value: data.address },
    { label: "분석일", value: data.analyzedAt },
    { label: "설치 유형", value: formatInstallTypeForPdf(data.solarMetrics.installType) },
    { label: "예상 설비용량", value: data.capacity },
    { label: "종합 검토 상태", value: overallStatus },
  ];

  const kpiW = (contentW - 16) / 2;
  const kpiH = 58;
  let kpiY = height - 210;

  for (let i = 0; i < kpis.length; i += 2) {
    drawMetricCard(page, font, fontBold, MARGIN, kpiY, kpiW, kpiH, kpis[i].label, kpis[i].value);
    if (kpis[i + 1]) {
      drawMetricCard(
        page,
        font,
        fontBold,
        MARGIN + kpiW + 16,
        kpiY,
        kpiW,
        kpiH,
        kpis[i + 1].label,
        kpis[i + 1].value,
      );
    }
    kpiY -= kpiH + 10;
  }

  kpiY -= 6;
  drawDisclaimerBox(page, font, kpiY, PDF_LEGAL_DISCLAIMER);

  const mapH = mapImage ? 96 : 48;
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
    sanitizePdfText("공공데이터 기반 사전 검토용 참고 보고서입니다. 상세 내용은 본문을 참고해 주세요."),
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

export async function generateSiteReviewPdf(
  data: ResolvedSiteReview,
  options: SiteReviewPdfOptions = {},
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const includeOrdinance = hasOrdinanceContent(options.ordinance);
  const totalPages = estimatePdfPageCount(data, includeOrdinance);

  const [regularBytes, mediumBytes, boldBytes, logoBytes, mapBytes] = await Promise.all([
    loadFontBytes("regular"),
    loadFontBytes("medium"),
    loadFontBytes("bold"),
    loadBrandLogoBytes(),
    fetchKakaoStaticMap(data.lat, data.lng),
  ]);

  const font = await pdfDoc.embedFont(regularBytes);
  const fontMedium = await pdfDoc.embedFont(mediumBytes);
  const fontBold = await pdfDoc.embedFont(boldBytes);

  pdfDoc.setTitle(PDF_REPORT_TITLE);
  pdfDoc.setSubject(`${data.address} 사전 검토 결과`);
  pdfDoc.setCreator(MARKETING_NAME);

  const logoImage = await embedPngImage(pdfDoc, logoBytes);
  const mapImage = await embedPngImage(pdfDoc, mapBytes);

  const cover = pdfDoc.addPage([PAGE.width, PAGE.height]);
  drawCoverPage(cover, font, fontBold, data, mapImage, logoImage, 1, totalPages);

  const ctx: PdfRenderContext = {
    pdfDoc,
    font,
    fontMedium,
    fontBold,
    logoImage,
    data,
    pageNum: { value: 1 },
    totalPages,
  };

  drawSiteOverviewSection(ctx, options.parcels);
  drawRegulatoryAnalysisSection(ctx);
  drawSetbackReviewSection(ctx);
  drawGridGuidanceSection(ctx);
  drawChecklistAndCtaSection(ctx);

  if (includeOrdinance && options.ordinance) {
    drawOrdinanceAppendix(ctx, options.ordinance);
  }

  return pdfDoc.save();
}

export function siteReviewPdfFilename(): string {
  return `sgsolar-pre-review-${todayFileDate().replace(/-/g, "")}.pdf`;
}
