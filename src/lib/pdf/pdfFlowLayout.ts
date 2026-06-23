import type { PDFDocument, PDFImage, PDFFont, PDFPage } from "pdf-lib";
import {
  COLORS,
  MARGIN,
  PAGE,
  drawBrandLogo,
  drawPageFooter,
  rgbColor,
  sanitizePdfText,
  wrapTextByWidth,
} from "@/lib/pdf/pdfHelpers";

const MIN_Y = 52;
const FOOTER_RESERVE = 36;
const COMPACT_HEADER_H = 44;

export class PdfFlowLayout {
  readonly pdfDoc: PDFDocument;
  readonly font: PDFFont;
  readonly fontMedium: PDFFont;
  readonly fontBold: PDFFont;
  readonly logoImage: PDFImage | null;

  private pages: PDFPage[] = [];
  currentPage!: PDFPage;
  y = 0;

  constructor(
    pdfDoc: PDFDocument,
    font: PDFFont,
    fontMedium: PDFFont,
    fontBold: PDFFont,
    logoImage: PDFImage | null,
  ) {
    this.pdfDoc = pdfDoc;
    this.font = font;
    this.fontMedium = fontMedium;
    this.fontBold = fontBold;
    this.logoImage = logoImage;
    this.startFirstPage();
  }

  get contentWidth(): number {
    return PAGE.width - MARGIN * 2;
  }

  private startFirstPage() {
    this.currentPage = this.pdfDoc.addPage([PAGE.width, PAGE.height]);
    this.pages.push(this.currentPage);
    this.drawThinBrandBar(this.currentPage);
    this.y = PAGE.height - COMPACT_HEADER_H - 20;
  }

  private addContinuationPage() {
    this.currentPage = this.pdfDoc.addPage([PAGE.width, PAGE.height]);
    this.pages.push(this.currentPage);
    this.drawThinBrandBar(this.currentPage);
    this.y = PAGE.height - COMPACT_HEADER_H - 16;
  }

  private drawThinBrandBar(page: PDFPage) {
    const { height } = page.getSize();
    page.drawRectangle({
      x: 0,
      y: height - COMPACT_HEADER_H,
      width: PAGE.width,
      height: COMPACT_HEADER_H,
      color: rgbColor(COLORS.navy),
    });
    drawBrandLogo(page, this.fontBold, MARGIN, height - COMPACT_HEADER_H + 10, this.logoImage, 24, true);
  }

  ensureSpace(needed: number, orphanBlock = 0) {
    const threshold = MIN_Y + FOOTER_RESERVE;
    if (orphanBlock > 0 && this.y - orphanBlock < threshold && this.y !== PAGE.height - COMPACT_HEADER_H - 20) {
      this.addContinuationPage();
      return;
    }
    if (this.y - needed < threshold) {
      this.addContinuationPage();
    }
  }

  drawTextLine(
    text: string,
    options: {
      size?: number;
      font?: PDFFont;
      color?: (typeof COLORS)[keyof typeof COLORS];
      x?: number;
      indent?: number;
    } = {},
  ) {
    const size = options.size ?? 10;
    const font = options.font ?? this.font;
    const color = options.color ?? COLORS.text;
    const x = (options.x ?? MARGIN) + (options.indent ?? 0);

    this.ensureSpace(size + 8);
    this.currentPage.drawText(sanitizePdfText(text), {
      x,
      y: this.y,
      size,
      font,
      color: rgbColor(color),
    });
    this.y -= size + 6;
  }

  drawWrappedText(
    text: string,
    options: {
      size?: number;
      font?: PDFFont;
      color?: (typeof COLORS)[keyof typeof COLORS];
      maxWidth?: number;
      lineGap?: number;
      indent?: number;
    } = {},
  ) {
    const size = options.size ?? 9;
    const font = options.font ?? this.font;
    const color = options.color ?? COLORS.text;
    const maxWidth = options.maxWidth ?? this.contentWidth - (options.indent ?? 0);
    const lineGap = options.lineGap ?? 4;
    const lines = wrapTextByWidth(text, font, size, maxWidth);

    this.ensureSpace(lines.length * (size + lineGap) + 4);
    for (const line of lines) {
      this.currentPage.drawText(line, {
        x: MARGIN + (options.indent ?? 0),
        y: this.y,
        size,
        font,
        color: rgbColor(color),
      });
      this.y -= size + lineGap;
    }
  }

  drawReportTitle(title: string, subtitle: string) {
    this.ensureSpace(52);
    this.currentPage.drawText(sanitizePdfText(title), {
      x: MARGIN,
      y: this.y,
      size: 18,
      font: this.fontBold,
      color: rgbColor(COLORS.navy),
    });
    this.y -= 22;

    this.currentPage.drawText(subtitle, {
      x: MARGIN,
      y: this.y,
      size: 9,
      font: this.font,
      color: rgbColor(COLORS.slateLight),
    });
    this.y -= 18;
  }

  drawSectionHeading(title: string, subtitle?: string) {
    const blockH = subtitle ? 44 : 28;
    this.ensureSpace(blockH, blockH + 24);

    this.currentPage.drawRectangle({
      x: MARGIN,
      y: this.y - 18,
      width: 3,
      height: 18,
      color: rgbColor(COLORS.navy),
    });

    this.currentPage.drawText(sanitizePdfText(title), {
      x: MARGIN + 10,
      y: this.y - 14,
      size: 12,
      font: this.fontBold,
      color: rgbColor(COLORS.navy),
    });
    this.y -= 24;

    if (subtitle) {
      this.drawWrappedText(subtitle, { size: 8.5, color: COLORS.slate, indent: 10 });
      this.y -= 4;
    } else {
      this.y -= 2;
    }

    this.currentPage.drawLine({
      start: { x: MARGIN, y: this.y + 4 },
      end: { x: PAGE.width - MARGIN, y: this.y + 4 },
      thickness: 0.5,
      color: rgbColor(COLORS.border),
    });
    this.y -= 10;
  }

  drawSpacer(px: number) {
    this.y -= px;
  }

  finalizeFooters(footerLabel = "태양광 입지분석 사전 검토 보고서") {
    const total = this.pages.length;
    for (let i = 0; i < this.pages.length; i++) {
      drawPageFooter(this.pages[i], this.font, i + 1, total, footerLabel);
    }
  }
}

export { MIN_Y, FOOTER_RESERVE };
