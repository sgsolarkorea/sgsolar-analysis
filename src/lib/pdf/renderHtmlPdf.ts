import { existsSync } from "node:fs";
import { join } from "node:path";

const MAP_WIDTH = 720;
const MAP_HEIGHT = 320;

/** Vercel 번들에 bin이 누락될 때 사용 — @sparticuz/chromium 버전과 맞춤 */
const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar";

export async function renderHtmlToPdf(html: string): Promise<Uint8Array> {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
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

async function waitForDocumentImages(page: import("puppeteer-core").Page) {
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    );
  });
}

async function resolveChromiumExecutable(chromium: {
  executablePath: (input?: string) => Promise<string>;
  setGraphicsMode: boolean;
}): Promise<string> {
  const localBin = join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin");

  if (existsSync(localBin)) {
    return chromium.executablePath(localBin);
  }

  return chromium.executablePath(CHROMIUM_PACK_URL);
}

export async function launchBrowser() {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const securityArgs = ["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"];

  if (isServerless) {
    const puppeteer = await import("puppeteer-core");
    const chromiumModule = await import("@sparticuz/chromium");
    const chromium = chromiumModule.default;

    chromium.setGraphicsMode = false;
    const executablePath = await resolveChromiumExecutable(chromium);

    return puppeteer.default.launch({
      args: [...chromium.args, "--hide-scrollbars", ...securityArgs, "--font-render-hinting=none"],
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
      executablePath,
      headless: true,
    });
  }

  const puppeteer = await import("puppeteer-core");
  const localChrome =
    process.env.CHROME_PATH ||
    (process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : "/usr/bin/google-chrome");

  try {
    return await puppeteer.default.launch({
      executablePath: localChrome,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none", ...securityArgs],
    });
  } catch {
    const chromiumModule = await import("@sparticuz/chromium");
    const chromium = chromiumModule.default;
    chromium.setGraphicsMode = false;
    const executablePath = await resolveChromiumExecutable(chromium);

    return puppeteer.default.launch({
      args: [...chromium.args, "--no-sandbox", ...securityArgs],
      executablePath,
      headless: true,
    });
  }
}

export { MAP_WIDTH, MAP_HEIGHT, waitForDocumentImages };
