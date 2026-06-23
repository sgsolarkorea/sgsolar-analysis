import { readFile } from "fs/promises";
import { join } from "path";

const fontCache = new Map<string, string>();

async function readBase64(relativePath: string): Promise<string | null> {
  try {
    const bytes = await readFile(
      join(/* turbopackIgnore: true */ process.cwd(), relativePath),
    );
    return Buffer.from(bytes).toString("base64");
  } catch {
    return null;
  }
}

export async function loadGmarketFontFacesCss(): Promise<string> {
  const cacheKey = "gmarket-fonts";
  const cached = fontCache.get(cacheKey);
  if (cached) return cached;

  const [light, medium, bold] = await Promise.all([
    readBase64("public/fonts/GmarketSansLight.woff"),
    readBase64("public/fonts/GmarketSansMedium.woff"),
    readBase64("public/fonts/GmarketSansBold.woff"),
  ]);

  const css = [
    light &&
      `@font-face{font-family:'Gmarket Sans';src:url(data:font/woff;base64,${light}) format('woff');font-weight:300;font-style:normal;}`,
    medium &&
      `@font-face{font-family:'Gmarket Sans';src:url(data:font/woff;base64,${medium}) format('woff');font-weight:500;font-style:normal;}`,
    bold &&
      `@font-face{font-family:'Gmarket Sans';src:url(data:font/woff;base64,${bold}) format('woff');font-weight:700;font-style:normal;}`,
  ]
    .filter(Boolean)
    .join("\n");

  fontCache.set(cacheKey, css);
  return css;
}

export async function loadLogoDataUrl(): Promise<string | null> {
  const b64 = await readBase64("public/sgsolar-logo.png");
  return b64 ? `data:image/png;base64,${b64}` : null;
}

export function pngToDataUrl(bytes: Uint8Array | null): string | null {
  if (!bytes?.length) return null;
  return `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
}
