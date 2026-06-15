export interface ParsedJibunLot {
  platGbCd: "0" | "1";
  bun: string;
  ji: string;
}

/**
 * 지번주소 끝에서 본번·부번·산 구분을 추출합니다.
 * 예: "… 효자동3가 1638-16" → bun 1638, ji 16
 */
export function parseJibunLot(jibunAddress: string): ParsedJibunLot | null {
  const trimmed = jibunAddress.trim();
  if (!trimmed) return null;

  const lotMatch = trimmed.match(/(?:^|\s)(산)?\s*(\d+)(?:-(\d+))?\s*$/);
  if (!lotMatch) return null;

  const [, mountain, bunRaw, jiRaw] = lotMatch;
  const bun = bunRaw.replace(/^0+/, "") || "0";
  const ji = jiRaw?.replace(/^0+/, "") || "0";

  return {
    platGbCd: mountain ? "1" : "0",
    bun,
    ji,
  };
}
