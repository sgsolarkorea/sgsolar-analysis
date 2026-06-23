export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** PDF/HTML 출력용 — 깨짐·금지 표현 정리 */
export function sanitizeReportText(text: string): string {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/☐|☑|✓|✔|●|■|□|▪|▫|•|·/g, "-")
    .replace(/[🟢🟡🔴⚫⚠️⚠]/g, "")
    .replace(/—/g, "-")
    .trim();
}

export function htmlText(text: string): string {
  return escapeHtml(sanitizeReportText(text));
}
