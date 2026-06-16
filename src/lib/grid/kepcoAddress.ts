import { parseJibunLot } from "@/lib/api/jibunParser";
import { parsePnu } from "@/lib/api/pnu";

export interface ParsedKepcoAddress {
  sido: string;
  sigungu: string;
  addrLidong: string;
  addrLi: string;
  addrJibun: string;
  sigunguCd: string | null;
}

function formatJibun(lot: { bun: string; ji: string }): string {
  const bun = lot.bun.replace(/^0+/, "") || "0";
  const ji = lot.ji.replace(/^0+/, "") || "0";
  return ji === "0" ? bun : `${bun}-${ji}`;
}

function isSidoToken(token: string): boolean {
  return /(?:특별자치도|특별시|광역시|특별자치시)$/.test(token) || token.endsWith("도");
}

function isSigunguToken(token: string): boolean {
  return /[시군]$/.test(token) || (token.endsWith("구") && !token.endsWith("특별자치시"));
}

function isLidongToken(token: string): boolean {
  return /[읍면동]$/.test(token) || /[가]$/.test(token);
}

/**
 * 지번주소 → KEPCO 분산전원 API 주소 파라미터
 * 예: "충청남도 아산시 염치읍 방현리 258-7"
 */
export function parseKepcoAddressFromJibun(jibunAddress: string): ParsedKepcoAddress | null {
  const trimmed = jibunAddress.trim();
  if (!trimmed) return null;

  const lot = parseJibunLot(trimmed);
  if (!lot) return null;

  const addrJibun = formatJibun(lot);
  const withoutLot = trimmed.replace(/(?:^|\s)(산)?\s*\d+(?:-\d+)?\s*$/, "").trim();
  const parts = withoutLot.split(/\s+/).filter(Boolean);
  if (!parts.length) return null;

  let index = 0;
  let sido = parts[index] ?? "";
  if (parts[index + 1] && parts[index + 1].endsWith("특별자치도")) {
    sido = `${parts[index]} ${parts[index + 1]}`;
    index += 2;
  } else if (isSidoToken(sido)) {
    index += 1;
  }

  const sigunguParts: string[] = [];
  while (index < parts.length && isSigunguToken(parts[index] ?? "")) {
    sigunguParts.push(parts[index]!);
    index += 1;
    if (parts[index]?.endsWith("구") && !parts[index]?.endsWith("특별자치시")) {
      sigunguParts.push(parts[index]!);
      index += 1;
      break;
    }
    if (sigunguParts.some((part) => /[시군]$/.test(part))) break;
  }

  const rest = parts.slice(index);
  let addrLi = "";
  let addrLidong = "";

  if (rest.length >= 2 && rest[rest.length - 1]?.endsWith("리")) {
    addrLi = rest[rest.length - 1]!;
    addrLidong = rest.slice(0, -1).join(" ");
  } else if (rest.length === 1) {
    addrLidong = rest[0]!;
  } else if (rest.length > 1) {
    const last = rest[rest.length - 1]!;
    if (isLidongToken(last)) {
      addrLidong = last;
    } else {
      addrLidong = rest.join(" ");
    }
  }

  return {
    sido,
    sigungu: sigunguParts.join(" "),
    addrLidong,
    addrLi,
    addrJibun,
    sigunguCd: null,
  };
}

/** PNU(19자리)에서 시군구코드 추출 */
export function attachSigunguCdFromPnu(
  parsed: ParsedKepcoAddress,
  pnu: string | undefined,
): ParsedKepcoAddress {
  if (!pnu) return parsed;
  const pnuParts = parsePnu(pnu);
  if (!pnuParts) return parsed;
  return { ...parsed, sigunguCd: pnuParts.sigunguCd };
}

export function parseKepcoAddress(
  jibunAddress: string,
  pnu?: string,
): ParsedKepcoAddress | null {
  const parsed = parseKepcoAddressFromJibun(jibunAddress);
  if (!parsed) return null;
  return attachSigunguCdFromPnu(parsed, pnu);
}
