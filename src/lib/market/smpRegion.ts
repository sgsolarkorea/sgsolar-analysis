/** Jeju address detection for SMP region selection */
export function isJejuAddress(address: string, jibunAddress?: string): boolean {
  const text = `${address} ${jibunAddress ?? ""}`;
  return /제주/.test(text);
}

export type SmpRegion = "mainland" | "jeju" | "unified";

export function resolveSmpRegionLabel(region: SmpRegion): string {
  if (region === "jeju") return "SMP · 제주";
  if (region === "mainland") return "SMP · 육지";
  return "SMP";
}
