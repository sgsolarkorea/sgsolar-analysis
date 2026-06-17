import { readFile } from "fs/promises";
import { join } from "path";
import { rgb, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";

export const PAGE = { width: 595, height: 842 } as const;
export const MARGIN = 48;

/** /public/sgsolar-logo.png — 없으면 텍스트·아이콘 로고로 대체 */
export const BRAND_LOGO_FILENAME = "sgsolar-logo.png";

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

/** PDF 출력용 — 이모지·제로폭 문자 등 깨짐 유발 문자 정리 */
export function sanitizePdfText(text: string): string {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/⚠\uFE0F?/g, "※")
    .trim();
}

export function wrapTextByWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const sanitized = sanitizePdfText(text);
  if (!sanitized) return [""];

  const lines: string[] = [];
  let current = "";

  for (const char of sanitized) {
    const test = current + char;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width > maxWidth && current.length > 0) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** @deprecated wrapTextByWidth 사용 */
export function wrapText(text: string, maxLen: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const char of sanitizePdfText(text)) {
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

export async function loadBrandLogoBytes(): Promise<Uint8Array | null> {
  try {
    const bytes = await readFile(join(process.cwd(), "public", BRAND_LOGO_FILENAME));
    return new Uint8Array(bytes);
  } catch {
    return null;
  }
}

export function drawBrandLogo(
  page: PDFPage,
  fontBold: PDFFont,
  x: number,
  y: number,
  logoImage: PDFImage | null,
  height = 28,
  onDark = true,
): number {
  if (logoImage) {
    const scale = height / logoImage.height;
    const width = logoImage.width * scale;
    page.drawImage(logoImage, { x, y, width, height });
    return width + 10;
  }

  drawSunLogo(page, x, y, height);
  page.drawText("SG SOLAR", {
    x: x + height + 8,
    y: y + height / 2 - 5,
    size: 14,
    font: fontBold,
    color: onDark ? rgbColor(COLORS.white) : rgbColor(COLORS.navy),
  });
  return height + 88;
}

export function drawPageHeader(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  title: string,
  subtitle?: string,
  logoImage: PDFImage | null = null,
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

  drawBrandLogo(page, fontBold, MARGIN, height - 52, logoImage, 28, true);

  page.drawText(sanitizePdfText(title), {
    x: MARGIN,
    y: height - 92,
    size: 16,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });

  y = height - 112;

  if (subtitle) {
    for (const line of wrapTextByWidth(subtitle, font, 9, PAGE.width - MARGIN * 2)) {
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

export function drawPageFooter(
  page: PDFPage,
  font: PDFFont,
  pageNum: number,
  total: number,
) {
  page.drawText(
    sanitizePdfText(`SG SOLAR 태양광 입지검토 제안서  ·  ${pageNum} / ${total}`),
    {
      x: MARGIN,
      y: 28,
      size: 8,
      font,
      color: rgbColor(COLORS.slateLight),
    },
  );
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

  page.drawText(sanitizePdfText(label), {
    x: x + 12,
    y: y - 22,
    size: 9,
    font,
    color: rgbColor(COLORS.slate),
  });

  const valueLines = wrapTextByWidth(sanitizePdfText(value), fontBold, 13, w - 24);
  let valueY = y - 46;
  for (const line of valueLines.slice(0, 2)) {
    page.drawText(line, {
      x: x + 12,
      y: valueY,
      size: 13,
      font: fontBold,
      color: rgbColor(COLORS.navy),
    });
    valueY -= 17;
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
    const f = col.bold || header ? fontBold : font;
    const fontSize = header ? 8.5 : 8;
    page.drawText(sanitizePdfText(col.text), {
      x: col.x + 6,
      y: y - (header ? 15 : 14),
      size: fontSize,
      font: f,
      color: rgbColor(COLORS.text),
      maxWidth: col.w - 10,
    });
  }

  return y - rowH;
}

export function drawInfoCard(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  body: string,
) {
  page.drawRectangle({
    x,
    y: y - h,
    width: w,
    height: h,
    borderColor: rgbColor(COLORS.border),
    borderWidth: 0.75,
    color: rgbColor(COLORS.white),
  });
  page.drawText(sanitizePdfText(title), {
    x: x + 12,
    y: y - 20,
    size: 9,
    font: fontBold,
    color: rgbColor(COLORS.navy),
  });
  const paragraphs = sanitizePdfText(body).split("\n");
  let lineY = y - 38;
  for (const paragraph of paragraphs) {
    const lines = wrapTextByWidth(paragraph, font, 8.5, w - 24);
    for (const line of lines.slice(0, 4)) {
      page.drawText(line, { x: x + 12, y: lineY, size: 8.5, font, color: rgbColor(COLORS.text) });
      lineY -= 13;
    }
  }
}

export async function fetchKakaoStaticMap(
  lat: number,
  lng: number,
  options?: {
    size?: string;
    level?: number;
    maptype?: "roadmap" | "skyview" | "hybrid";
    marker?: boolean;
  },
): Promise<Uint8Array | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY?.trim();
  if (!apiKey) return null;

  const size = options?.size ?? "480x160";
  const level = options?.level ?? 4;
  const maptype = options?.maptype ?? "roadmap";
  const marker = options?.marker !== false ? `&marker=${lng},${lat}` : "";
  const url =
    `https://apis.map.kakao.com/maps/v3/staticmap?center=${lng},${lat}` +
    `&level=${level}&size=${size}&maptype=${maptype}${marker}`;

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

const M_PER_DEG_LAT = 110_540;

function mPerDegLng(lat: number): number {
  return 111_320 * Math.cos((lat * Math.PI) / 180);
}

/** 정적 위성지도 위 lat/lng → 이미지 픽셀 (Kakao level 기준 근사) */
export function latLngToStaticMapPixel(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  level: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const scale = (156_543.03392 * Math.cos((centerLat * Math.PI) / 180)) / 2 ** (level + 1);
  const dx = (lng - centerLng) * mPerDegLng(centerLat);
  const dy = (centerLat - lat) * M_PER_DEG_LAT;
  return {
    x: width / 2 + dx / scale,
    y: height / 2 + dy / scale,
  };
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
