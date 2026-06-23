import type { LatLngPoint } from "@/types/moduleLayout";
import type { ResolvedSiteReview } from "@/types/siteReview";
import type { ParcelSnapshot } from "@/types/parcelReview";
import type { MunicipalityOrdinanceData } from "@/types/regulatoryReview";
import { MARKETING_NAME } from "@/data/sampleData";
import { latLngToStaticMapPixel } from "@/lib/pdf/pdfHelpers";
import { captureKakaoStaticMapOnPage } from "@/lib/pdf/captureKakaoMap";
import { loadGmarketFontFacesCss, loadLogoDataUrl, pngToDataUrl } from "@/lib/pdf/html/assets";
import { buildReportHtml } from "@/lib/pdf/html/buildReportHtml";
import { getPdfDocumentOrigin } from "@/lib/pdf/html/documentOrigin";
import {
  launchBrowser,
  MAP_HEIGHT,
  MAP_WIDTH,
  waitForDocumentImages,
} from "@/lib/pdf/renderHtmlPdf";
import { PDF_REPORT_TITLE } from "@/lib/pdf/reportContent";

export interface SiteReviewPdfOptions {
  parcels?: ParcelSnapshot[];
  ordinance?: MunicipalityOrdinanceData | null;
}

function todayFileDate(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

function buildPolygonOverlaySvg(
  polygon: LatLngPoint[],
  centerLat: number,
  centerLng: number,
  level: number,
  width: number,
  height: number,
): string {
  if (polygon.length < 3) return "";

  const points = polygon
    .map((p) => {
      const { x, y } = latLngToStaticMapPixel(p.lat, p.lng, centerLat, centerLng, level, width, height);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return `<polygon points="${points}" fill="rgba(249,115,22,0.22)" stroke="#ea580c" stroke-width="2.5"/>`;
}

export async function generateSiteReviewPdf(
  data: ResolvedSiteReview,
  _options: SiteReviewPdfOptions = {},
): Promise<Uint8Array> {
  const mapLevel = 3;
  const [fontFacesCss, logoDataUrl] = await Promise.all([
    loadGmarketFontFacesCss(),
    loadLogoDataUrl(),
  ]);

  const polygon =
    data.siteGeometryBundle?.cadastralPolygon ??
    data.siteGeometryBundle?.buildingPolygon ??
    null;

  const mapOverlaySvg = polygon
    ? buildPolygonOverlaySvg(polygon, data.lat, data.lng, mapLevel, MAP_WIDTH, MAP_HEIGHT)
    : null;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    const mapCapture = await captureKakaoStaticMapOnPage(
      page,
      data.lat,
      data.lng,
      MAP_WIDTH,
      MAP_HEIGHT,
      mapLevel,
    );

    const html = buildReportHtml(data, {
      fontFacesCss,
      logoDataUrl,
      mapDataUrl: pngToDataUrl(mapCapture.bytes),
      mapOverlaySvg,
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      mapAvailable: Boolean(mapCapture.bytes?.length),
      mapFailureReason: mapCapture.bytes?.length ? null : mapCapture.status,
    });

    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
      url: getPdfDocumentOrigin(),
    } as Parameters<typeof page.setContent>[1]);
    await waitForDocumentImages(page);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "10mm", right: "10mm", bottom: "12mm", left: "10mm" },
    });

    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
}

export function siteReviewPdfFilename(): string {
  return `sgsolar-pre-review-${todayFileDate().replace(/-/g, "")}.pdf`;
}

export const PDF_DOCUMENT_TITLE = PDF_REPORT_TITLE;
export const PDF_DOCUMENT_CREATOR = MARKETING_NAME;
