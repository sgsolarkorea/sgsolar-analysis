import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const MAP_WIDTH = 720;
const MAP_HEIGHT = 320;

export async function renderHtmlToPdf(html: string): Promise<Uint8Array> {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });

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

async function launchBrowser() {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless) {
    return puppeteer.launch({
      args: [...chromium.args, "--hide-scrollbars", "--disable-web-security", "--font-render-hinting=none"],
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const localChrome =
    process.env.CHROME_PATH ||
    (process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : "/usr/bin/google-chrome");

  try {
    return await puppeteer.launch({
      executablePath: localChrome,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
    });
  } catch {
    return puppeteer.launch({
      args: [...chromium.args, "--no-sandbox"],
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
}

export { MAP_WIDTH, MAP_HEIGHT };
