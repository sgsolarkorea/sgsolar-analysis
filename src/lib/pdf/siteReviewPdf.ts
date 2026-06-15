import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ResolvedSiteReview } from "@/types/siteReview";
import { MARKETING_NAME, company } from "@/data/sampleData";
import { getFieldValue } from "@/lib/solar/calculate";

function todayFileDate(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

function wrapText(text: string, maxLen: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const char of text) {
    if (current.length >= maxLen) {
      lines.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Latin-safe PDF lines — Korean rendered via unicode if font supports; fallback transliteration in sections */
function sectionLines(data: ResolvedSiteReview): string[] {
  const m = data.solarMetrics;
  const landCategory = getFieldValue(data.landInfo, "지목");
  const zoning = getFieldValue(data.landInfo, "용도지역");
  const buildingArea = getFieldValue(data.buildingInfo, "건축면적");

  return [
    "=== Solar Site Review Report (1st) ===",
    "",
    `Company: ${MARKETING_NAME}`,
    `Date: ${data.analyzedAt}`,
    "",
    "[ Address ]",
    `Road: ${data.address}`,
    `Jibun: ${data.jibunAddress}`,
    `Lat/Lng: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`,
    data.zoneNo ? `Zip: ${data.zoneNo}` : "",
    "",
    "[ Land ]",
    `Category: ${landCategory}`,
    `Zoning: ${zoning}`,
    "",
    "[ Building ]",
    `Area: ${buildingArea}`,
    `Usage: ${getFieldValue(data.buildingInfo, "건물 용도")}`,
    "",
    "[ Install Type & Capacity ]",
    `Type: ${m.installType}`,
    `Base area: ${m.baseAreaLabel} ${m.baseAreaSqm} sqm`,
    `Formula: ${m.formula}`,
    `Capacity: ${data.capacity}`,
    `Module: ${m.modulePowerW}W x ${m.moduleCount}`,
    "",
    "[ Generation & Revenue ]",
    `Annual generation: ${data.annualGeneration}`,
    `SMP price: ${m.market.smpPrice} KRW/kWh (${m.market.smpDate})`,
    `REC price: ${m.market.recPrice} KRW/MWh (${m.market.recDate})`,
    `REC weight: ${m.recWeight} (${m.recWeightReason})`,
    `Annual revenue: ${data.annualRevenue}`,
    `20-year revenue: ${data.profitability.cumulative20YearRevenue ?? "N/A"}`,
    `Market source: ${m.market.source}${m.market.isFallback ? " (fallback)" : ""}`,
    "",
    "[ Construction Cost ]",
    `Estimate: ${data.constructionCost}`,
    `Unit: ${data.profitability.constructionCostPerKw ?? "N/A"}`,
    "",
    "[ Similar Cases ]",
    ...data.recommendedCases.slice(0, 3).map((c, i) => `${i + 1}. ${c.title} (${c.capacity})`),
    "",
    "[ Consultation ]",
    `Phone: ${company.phone}`,
    `Email: ${company.email}`,
    `Website: ${company.website}`,
    "",
    "Disclaimer: Reference only. Final install/revenue subject to site survey.",
  ].filter(Boolean);
}

export async function generateSiteReviewPdf(data: ResolvedSiteReview): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle("태양광 입지검토 1차 제안서");
  pdfDoc.setSubject(`${data.address} 입지검토 결과`);
  pdfDoc.setCreator(MARKETING_NAME);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595, 842]);
  const { height } = page.getSize();
  let y = height - 50;
  const margin = 50;
  const lineHeight = 14;

  page.drawText("Solar Site Review Proposal (1st)", {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.3),
  });
  y -= 28;

  for (const rawLine of sectionLines(data)) {
    const lines = wrapText(rawLine, 85);
    for (const line of lines) {
      if (y < 60) {
        page = pdfDoc.addPage([595, 842]);
        y = height - 50;
      }
      page.drawText(line, {
        x: margin,
        y,
        size: line.startsWith("===") || line.startsWith("[") ? 10 : 9,
        font: line.startsWith("[") ? fontBold : font,
        color: rgb(0.15, 0.15, 0.15),
        maxWidth: 495,
      });
      y -= lineHeight;
    }
  }

  return pdfDoc.save();
}

export function siteReviewPdfFilename(): string {
  return `sgsolar-site-review-${todayFileDate().replace(/-/g, "")}.pdf`;
}
