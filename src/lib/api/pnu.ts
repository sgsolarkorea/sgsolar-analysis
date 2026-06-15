export interface ParsedPnu {
  sigunguCd: string;
  bjdongCd: string;
  platGbCd: string;
  bun: string;
  ji: string;
}

/**
 * 19자리 PNU → 건축물대장 API 파라미터
 * [시군구 5][법정동 5][대지구분 1][본번 4][부번 4]
 */
export function parsePnu(pnu: string): ParsedPnu | null {
  const normalized = pnu.replace(/\D/g, "");
  if (normalized.length !== 19) return null;

  const landType = normalized.charAt(10);
  const platGbCd = landType === "2" ? "1" : "0";

  return {
    sigunguCd: normalized.slice(0, 5),
    bjdongCd: normalized.slice(5, 10),
    platGbCd,
    bun: normalized.slice(11, 15),
    ji: normalized.slice(15, 19),
  };
}
