export function formatReferenceDataMonth(analyzedAt: string): string {
  const parsed = Date.parse(analyzedAt.replace(/\./g, "-"));
  if (!Number.isFinite(parsed)) return "최신";
  const date = new Date(parsed);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `최신 (${y}.${m})`;
}
