/** Kakao JS SDK 도메인 제한 통과용 Puppeteer document URL */
export function getPdfDocumentOrigin(): string {
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, "")}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return appUrl.replace(/\/$/, "");

  return "https://sgsolar-analysis.vercel.app";
}
