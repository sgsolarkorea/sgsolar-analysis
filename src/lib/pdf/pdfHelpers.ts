import { rgb, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";

export const PAGE = { width: 595, height: 842 } as const;
export const MARGIN = 48;

export const COLORS = {
  navy: { r: 0.08, g: 0.12, b: 0.28 },
  navyLight: { r: 0.92, g: 0.94, b: 0.97 },
  slate: { r: 0.35, g: 0.38, b: 0.42 },
  slateLight: { r: 0.55, g: 0.58, b: 0.62 },
  text: { r: 0.12, g: 0.14, b: 0.16 },
  white: { r: 1, g: 1, b: 1 },
  amber: { r: 0.92, g: 0.72, b: 0.2 },
  border: { r: 0.88, g: 0.9, b: 0.92 },
} as const;

export function rgbColor(c: (typeof COLORS)[keyof typeof COLORS]) {
  return rgb(c.r, c.g, c.b);
}

export function wrapText(text: string, maxLen: number): string[] {
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

export function drawPageHeader(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  title: string,
  subtitle?: string,
): number {
  const { height } = page.getSize();
  let y = height - MARGIN;

  page.drawRectangle({
    x: 0,
    y: height - 72,
    width: PAGE.width,
    height: 72,
    color: rgbColor(COLORS.navy),
  });

  drawSunLogo(page, MARGIN, height - 52, 28);

  page.drawText("SG SOLAR", {
    x: MARGIN + 36,
    y: height - 38,
    size: 14,
    font: fontBold,
    color: rgbColor(COLORS.white),
  });

  page.drawText(title, {
    x: MARGIN,
    y: height - 92,
    size: 16,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });

  y = height - 112;

  if (subtitle) {
    for (const line of wrapText(subtitle, 52)) {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 9,
        font,
        color: rgbColor(COLORS.slate),
      });
      y -= 13;
    }
    y -= 4;
  }

  page.drawLine({
    start: { x: MARGIN, y: y + 6 },
    end: { x: PAGE.width - MARGIN, y: y + 6 },
    thickness: 0.75,
    color: rgbColor(COLORS.border),
  });

  return y - 8;
}

export function drawPageFooter(page: PDFPage, font: PDFFont, pageNum: number, total: number) {
  page.drawText(`SG SOLAR 태양광 입지검토 제안서  ·  ${pageNum} / ${total}`, {
    x: MARGIN,
    y: 28,
    size: 8,
    font,
    color: rgbColor(COLORS.slateLight),
  });
}

export function drawSunLogo(page: PDFPage, x: number, y: number, size: number) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.18;

  page.drawCircle({
    x: cx,
    y: cy,
    size: r * 2,
    color: rgbColor(COLORS.white),
  });

  const rayLen = size * 0.12;
  const directions = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const;

  for (const [dx, dy] of directions) {
    page.drawLine({
      start: { x: cx + dx * (r + 2), y: cy + dy * (r + 2) },
      end: { x: cx + dx * (r + rayLen + 4), y: cy + dy * (r + rayLen + 4) },
      thickness: 1.5,
      color: rgbColor(COLORS.white),
    });
  }
}

export function drawMetricCard(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
) {
  page.drawRectangle({
    x,
    y: y - h,
    width: w,
    height: h,
    borderColor: rgbColor(COLORS.border),
    borderWidth: 0.75,
    color: rgbColor(COLORS.navyLight),
  });

  page.drawText(label, {
    x: x + 12,
    y: y - 22,
    size: 9,
    font,
    color: rgbColor(COLORS.slate),
  });

  const valueLines = wrapText(value, Math.floor(w / 11));
  let valueY = y - 48;
  for (const line of valueLines.slice(0, 2)) {
    page.drawText(line, {
      x: x + 12,
      y: valueY,
      size: 14,
      font: fontBold,
      color: rgbColor(COLORS.navy),
    });
    valueY -= 18;
  }
}

export function drawTableRow(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  y: number,
  cols: { x: number; w: number; text: string; bold?: boolean }[],
  header = false,
): number {
  const rowH = header ? 22 : 20;
  const bg = header ? COLORS.navyLight : COLORS.white;

  page.drawRectangle({
    x: MARGIN,
    y: y - rowH,
    width: PAGE.width - MARGIN * 2,
    height: rowH,
    color: rgbColor(bg),
    borderColor: rgbColor(COLORS.border),
    borderWidth: 0.5,
  });

  for (const col of cols) {
    const lines = wrapText(col.text, Math.floor(col.w / 6));
    page.drawText(lines[0] ?? "", {
      x: col.x + 6,
      y: y - (header ? 15 : 14),
      size: header ? 8.5 : 8,
      font: col.bold || header ? fontBold : font,
      color: rgbColor(COLORS.text),
      maxWidth: col.w - 10,
    });
  }

  return y - rowH;
}

export async function fetchKakaoStaticMap(lat: number, lng: number): Promise<Uint8Array | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY?.trim();
  if (!apiKey) return null;

  const size = "480x280";
  const url =
    `https://apis.map.kakao.com/maps/v3/staticmap?center=${lng},${lat}` +
    `&level=4&size=${size}&marker=${lng},${lat}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export async function fetchQrCodePng(data: string, size = 100): Promise<Uint8Array | null> {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=4`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export async function embedPngImage(
  pdfDoc: { embedPng: (bytes: Uint8Array) => Promise<PDFImage> },
  bytes: Uint8Array | null,
): Promise<PDFImage | null> {
  if (!bytes) return null;
  try {
    return await pdfDoc.embedPng(bytes);
  } catch {
    return null;
  }
}
