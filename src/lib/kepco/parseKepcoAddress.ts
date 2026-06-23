import type { ParsedKepcoAddress } from "@/types/kepco";

export const SIDO_ALIASES: Record<string, string> = {
  경기: "경기도",
  경기도: "경기도",
  경남: "경상남도",
  경상남도: "경상남도",
  경북: "경상북도",
  경상북도: "경상북도",
  전남: "전라남도",
  전라남도: "전라남도",
  전북: "전라북도",
  전라북도: "전라북도",
  충남: "충청남도",
  충청남도: "충청남도",
  충북: "충청북도",
  충청북도: "충청북도",
  강원: "강원특별자치도",
  강원도: "강원특별자치도",
  강원특별자치도: "강원특별자치도",
  제주: "제주특별자치도",
  제주특별자치도: "제주특별자치도",
  서울: "서울특별시",
  서울특별시: "서울특별시",
  부산: "부산광역시",
  부산광역시: "부산광역시",
  대구: "대구광역시",
  대구광역시: "대구광역시",
  인천: "인천광역시",
  인천광역시: "인천광역시",
  광주: "광주광역시",
  광주광역시: "광주광역시",
  대전: "대전광역시",
  대전광역시: "대전광역시",
  울산: "울산광역시",
  울산광역시: "울산광역시",
  세종: "세종특별자치시",
  세종특별자치시: "세종특별자치시",
};

/** 시·군·구만 있을 때 시·도 추론 */
const SIGUNGU_SIDO: Record<string, string> = {
  전주시: "전라북도",
  군산시: "전라북도",
  김제시: "전라북도",
  익산시: "전라북도",
  목포시: "전라남도",
  여수시: "전라남도",
  순천시: "전라남도",
  창원시: "경상남도",
  진주시: "경상남도",
  통영시: "경상남도",
  사천시: "경상남도",
  논산시: "충청남도",
  서산시: "충청남도",
  평택시: "경기도",
};

function emptyParsed(raw: string): ParsedKepcoAddress {
  return {
    sido: null,
    sigungu: null,
    gu: null,
    eupmyeon: null,
    dong: null,
    ri: null,
    roadOrDong: null,
    raw,
  };
}

export function parseKepcoAddress(address: string): ParsedKepcoAddress {
  const normalized = address.trim().replace(/\s+/g, " ");
  if (!normalized) return emptyParsed(normalized);

  const result = emptyParsed(normalized);
  let rest = normalized;

  const sidoKeys = Object.keys(SIDO_ALIASES).sort((a, b) => b.length - a.length);
  for (const key of sidoKeys) {
    if (rest.startsWith(`${key} `) || rest === key) {
      result.sido = SIDO_ALIASES[key];
      rest = rest.slice(key.length).trim();
      break;
    }
  }

  const sigunguCityMatch = rest.match(/^([가-힣]+(?:시|군))/);
  if (sigunguCityMatch) {
    result.sigungu = sigunguCityMatch[1];
    rest = rest.slice(sigunguCityMatch[1].length).trim();
  } else {
    const guAsSigungu = rest.match(/^([가-힣]+구)/);
    if (guAsSigungu) {
      result.sigungu = guAsSigungu[1];
      rest = rest.slice(guAsSigungu[1].length).trim();
    }
  }

  if (!result.sido && result.sigungu && SIGUNGU_SIDO[result.sigungu]) {
    result.sido = SIGUNGU_SIDO[result.sigungu];
  }

  if (result.sigungu?.endsWith("시")) {
    const guMatch = rest.match(/^([가-힣]+구)/);
    if (guMatch) {
      result.gu = guMatch[1];
      rest = rest.slice(guMatch[1].length).trim();
    }
  }

  const eupMatch = rest.match(/^([가-힣]+(?:읍|면))/);
  if (eupMatch) {
    result.eupmyeon = eupMatch[1];
    rest = rest.slice(eupMatch[1].length).trim();
  }

  const riMatch = rest.match(/^([가-힣]+리)(?:\s|$|\d|-)/);
  if (riMatch) {
    result.ri = riMatch[1];
    rest = rest.slice(riMatch[1].length).trim();
  }

  const roadMatch = rest.match(/^([가-힣0-9]+(?:로|길))/);
  if (roadMatch) {
    result.roadOrDong = roadMatch[1];
    rest = rest.slice(roadMatch[1].length).trim();
  } else {
    const dongMatch = rest.match(/^([가-힣0-9]+동)(?:\s|$|\d|-)/);
    if (dongMatch && !/로$/.test(dongMatch[1])) {
      result.dong = dongMatch[1];
      rest = rest.slice(dongMatch[1].length).trim();
    }
  }

  if (!result.sigungu) {
    const fallback = normalized.match(/([가-힣]+(?:시|군|구))/);
    result.sigungu = fallback?.[1] ?? null;
    if (!result.sido && result.sigungu && SIGUNGU_SIDO[result.sigungu]) {
      result.sido = SIGUNGU_SIDO[result.sigungu];
    }
  }

  return result;
}

export function formatParsedAddressMeta(parsed: ParsedKepcoAddress): string {
  const parts = [
    parsed.sido,
    parsed.sigungu,
    parsed.gu,
    parsed.eupmyeon,
    parsed.dong,
    parsed.ri,
    parsed.roadOrDong,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : parsed.raw || "—";
}
