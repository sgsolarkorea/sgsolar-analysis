import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont } from "pdf-lib";
import type { ResolvedSiteReview } from "@/types/siteReview";
import type { ParcelSnapshot } from "@/types/parcelReview";
import type { MunicipalityOrdinanceData } from "@/types/regulatoryReview";
import { MARKETING_NAME } from "@/data/sampleData";
import { embedPngImage, loadBrandLogoBytes, loadKrFontBytes } from "@/lib/pdf/pdfHelpers";
import { PdfFlowLayout } from "@/lib/pdf/pdfFlowLayout";
import {
  PDF_REPORT_TITLE,
  deriveOverallReviewStatus,
  formatInstallTypeForPdf,
} from "@/lib/pdf/reportContent";
import {
  drawChecklistAndCtaSection,
  drawGridGuidanceSection,
  drawOrdinanceAppendix,
  drawRegulatoryAnalysisSection,
  drawSetbackReviewSection,
  drawSiteOverviewSection,
  drawSummaryBlock,
} from "@/lib/pdf/reportSections";

export interface SiteReviewPdfOptions {
  parcels?: ParcelSnapshot[];
  ordinance?: MunicipalityOrdinanceData | null;
}

function todayFileDate(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

function hasOrdinanceContent(ordinance?: MunicipalityOrdinanceData | null): boolean {
  if (!ordinance) return false;
  return Boolean(
    ordinance.ordinanceTitle?.trim() ||
      ordinance.distanceRules?.length ||
      ordinance.ordinanceUrl,
  );
}

export async function generateSiteReviewPdf(
  data: ResolvedSiteReview,
  options: SiteReviewPdfOptions = {},
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const [regularBytes, mediumBytes, boldBytes, logoBytes] = await Promise.all([
    loadKrFontBytes("regular"),
    loadKrFontBytes("medium"),
    loadKrFontBytes("bold"),
    loadBrandLogoBytes(),
  ]);

  const font: PDFFont = await pdfDoc.embedFont(regularBytes);
  const fontMedium: PDFFont = await pdfDoc.embedFont(mediumBytes);
  const fontBold: PDFFont = await pdfDoc.embedFont(boldBytes);
  const logoImage = await embedPngImage(pdfDoc, logoBytes);

  pdfDoc.setTitle(PDF_REPORT_TITLE);
  pdfDoc.setSubject(`${data.address} 사전 검토 결과`);
  pdfDoc.setCreator(MARKETING_NAME);

  const overallStatus = deriveOverallReviewStatus(data);
  const installType = formatInstallTypeForPdf(data.solarMetrics.installType);

  const flow = new PdfFlowLayout(pdfDoc, font, fontMedium, fontBold, logoImage);

  flow.drawReportTitle(PDF_REPORT_TITLE, "Solar Site Pre-Review Report");

  const summaryData = {
    ...data,
    solarMetrics: { ...data.solarMetrics, installType },
  };
  drawSummaryBlock(flow, summaryData, overallStatus);
  drawSiteOverviewSection(flow, data, options.parcels);
  drawRegulatoryAnalysisSection(flow, data);
  drawSetbackReviewSection(flow, data);
  drawGridGuidanceSection(flow, data);
  drawChecklistAndCtaSection(flow);

  if (hasOrdinanceContent(options.ordinance) && options.ordinance) {
    drawOrdinanceAppendix(flow, options.ordinance);
  }

  flow.finalizeFooters();

  return pdfDoc.save();
}

export function siteReviewPdfFilename(): string {
  return `sgsolar-pre-review-${todayFileDate().replace(/-/g, "")}.pdf`;
}
