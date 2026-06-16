import { parseJibunLot } from "@/lib/api/jibunParser";

/** 지번 주소에서 전주 번호 후보 생성 (예: 258-7) */
export function derivePoleCandidates(jibunAddress: string): string[] {
  const lot = parseJibunLot(jibunAddress);
  if (!lot) return [];

  const bun = lot.bun.replace(/^0+/, "") || "0";
  const ji = lot.ji.replace(/^0+/, "") || "0";
  const primary = ji === "0" ? bun : `${bun}-${ji}`;

  const candidates = [primary];
  if (ji !== "0" && `${bun}-${ji}` !== primary) {
    candidates.push(`${bun}-${ji}`);
  }
  return [...new Set(candidates)];
}

export function buildPoleLabel(poleId: string, referenceLocation: string): string {
  return referenceLocation ? `${poleId} (${referenceLocation})` : poleId;
}
