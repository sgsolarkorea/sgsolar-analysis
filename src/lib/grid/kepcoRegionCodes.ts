const DEFAULT_KEPCO_API_ORIGIN = "https://bigdata.kepco.co.kr";

/** 자주 쓰는 시군구 — commonCode API 실패 시 최후 폴백 */
const STATIC_CITY_CODES: Record<string, string> = {
  "44:홍성군": "131",
  "44:홍성": "131",
};

/** 시도명 → KEPCO metroCd (PNU 없을 때 폴백) */
const SIDO_TO_METRO: Record<string, string> = {
  서울특별시: "11",
  서울: "11",
  부산광역시: "26",
  부산: "26",
  대구광역시: "27",
  대구: "27",
  인천광역시: "28",
  인천: "28",
  광주광역시: "29",
  광주: "29",
  대전광역시: "30",
  대전: "30",
  울산광역시: "31",
  울산: "31",
  세종특별자치시: "36",
  세종: "36",
  경기도: "41",
  경기: "41",
  강원특별자치도: "51",
  강원도: "51",
  강원: "51",
  충청북도: "43",
  충북: "43",
  충청남도: "44",
  충남: "44",
  전북특별자치도: "52",
  전라북도: "52",
  전북: "52",
  전라남도: "46",
  전남: "46",
  경상북도: "47",
  경북: "47",
  경상남도: "48",
  경남: "48",
  제주특별자치도: "50",
  제주: "50",
};

interface KepcoCommonCodeItem {
  codeTy?: string;
  code?: string;
  codeNm?: string;
  uppoCd?: string;
  uppoCdNm?: string;
}

interface KepcoCommonCodeResponse {
  data?: KepcoCommonCodeItem[];
  resultCode?: string;
  resultMessage?: string;
}

const cityCodeCache = new Map<string, KepcoCommonCodeItem[]>();

export function getKepcoApiOrigin(): string {
  const base = process.env.KEPCO_DATA_API_BASE?.trim();
  if (!base) return DEFAULT_KEPCO_API_ORIGIN;
  if (base.includes("/openapi/")) {
    return base.split("/openapi/")[0] ?? DEFAULT_KEPCO_API_ORIGIN;
  }
  return base.replace(/\/$/, "");
}

export function getKepcoDispersedGenerationUrl(): string {
  const base = process.env.KEPCO_DATA_API_BASE?.trim();
  if (base?.endsWith(".do")) return base;
  const origin = getKepcoApiOrigin();
  return `${origin}/openapi/v1/dispersedGeneration.do`;
}

function normalizeRegionName(name: string): string {
  return name.replace(/\s+/g, "").replace(/특별자치/g, "");
}

/** 법정 시군구코드 앞 2자리 → KEPCO metroCd */
export function metroCdFromSigunguCd(sigunguCd: string | null | undefined): string | null {
  if (!sigunguCd || sigunguCd.length < 2) return null;
  return sigunguCd.slice(0, 2);
}

function metroCdFromSido(sido: string): string | null {
  const normalized = normalizeRegionName(sido);
  for (const [key, code] of Object.entries(SIDO_TO_METRO)) {
    if (normalized.startsWith(normalizeRegionName(key))) return code;
  }
  return null;
}

function staticCityLookup(metroCd: string, sigungu: string): string | null {
  const normalized = normalizeRegionName(sigungu);
  const keys = [`${metroCd}:${sigungu}`, `${metroCd}:${normalized}`];
  for (const key of keys) {
    const hit = STATIC_CITY_CODES[key];
    if (hit) return hit;
  }

  const shortName = sigungu.replace(/\s+/g, " ").split(" ").pop() ?? sigungu;
  return STATIC_CITY_CODES[`${metroCd}:${normalizeRegionName(shortName)}`] ?? null;
}

async function fetchCommonCodes(
  codeTy: "metroCd" | "cityCd",
  apiKey: string,
): Promise<KepcoCommonCodeItem[]> {
  const origin = getKepcoApiOrigin();
  const url = new URL(`${origin}/openapi/v1/commonCode.do`);
  url.searchParams.set("codeTy", codeTy);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("returnType", "json");

  const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  if (!response.ok) {
    console.warn(`[Grid/KepcoAPI] commonCode ${codeTy} HTTP ${response.status}`);
    return [];
  }

  const payload = (await response.json()) as KepcoCommonCodeResponse;
  return Array.isArray(payload.data) ? payload.data : [];
}

function normalizeMetroCode(code: string | null | undefined): string {
  return (code ?? "").trim().replace(/^0+/, "");
}

async function getCityCodesForMetro(
  metroCd: string,
  apiKey: string,
  sido?: string,
): Promise<KepcoCommonCodeItem[]> {
  const cacheKey = `${metroCd}:${sido ?? ""}`;
  const cached = cityCodeCache.get(cacheKey);
  if (cached) return cached;

  const allCityCodes = await fetchCommonCodes("cityCd", apiKey);
  const normalizedMetro = normalizeMetroCode(metroCd);

  let filtered = allCityCodes.filter(
    (item) => normalizeMetroCode(item.uppoCd) === normalizedMetro,
  );

  if (!filtered.length && sido) {
    const normalizedSido = normalizeRegionName(sido);
    filtered = allCityCodes.filter((item) => {
      const uppoNm = normalizeRegionName(item.uppoCdNm ?? "");
      return uppoNm.includes(normalizedSido);
    });
  }

  cityCodeCache.set(cacheKey, filtered);
  return filtered;
}

function matchCityCode(sigungu: string, candidates: KepcoCommonCodeItem[]): string | null {
  const normalizedSigungu = normalizeRegionName(sigungu);
  const shortName = normalizeRegionName((sigungu.split(/\s+/).pop() ?? sigungu).replace(/(시|군|구)$/, ""));

  for (const item of candidates) {
    const code = item.code?.trim();
    const name = normalizeRegionName(item.codeNm?.trim() ?? "");
    if (!code || !name) continue;
    const shortCodeName = name.replace(/(시|군|구)$/, "");
    if (name === normalizedSigungu || shortCodeName === shortName) return code;
  }

  return null;
}

export async function resolveKepcoRegionCodes(input: {
  sido: string;
  sigungu: string;
  sigunguCd: string | null;
  apiKey: string;
}): Promise<{ metroCd: string | null; cityCd: string | null; cityNm: string | null }> {
  const metroCd =
    metroCdFromSigunguCd(input.sigunguCd) ?? metroCdFromSido(input.sido);
  if (!metroCd) {
    console.warn("[Grid/KepcoAPI] metroCd unresolved", { sido: input.sido, sigungu: input.sigungu });
    return { metroCd: null, cityCd: null, cityNm: null };
  }

  try {
    const cityCodes = await getCityCodesForMetro(metroCd, input.apiKey, input.sido);
    const cityCd = matchCityCode(input.sigungu, cityCodes);
    if (cityCd) {
      const cityNm =
        cityCodes.find((item) => item.code?.trim() === cityCd)?.codeNm?.trim() ?? null;
      return { metroCd, cityCd, cityNm };
    }
  } catch (error) {
    console.warn("[Grid/KepcoAPI] cityCd lookup failed:", error);
  }

  const staticCity = staticCityLookup(metroCd, input.sigungu);
  if (staticCity) {
    return { metroCd, cityCd: staticCity, cityNm: input.sigungu };
  }

  return { metroCd, cityCd: null, cityNm: null };
}

/** 진단용 — metroCd 하위 cityCd 목록 */
export async function listKepcoCityCodes(
  metroCd: string,
  apiKey: string,
): Promise<Array<{ code: string; name: string; uppoCd?: string; uppoCdNm?: string }>> {
  const items = await getCityCodesForMetro(metroCd, apiKey);
  return items
    .map((item) => ({
      code: item.code?.trim() ?? "",
      name: item.codeNm?.trim() ?? "",
      uppoCd: item.uppoCd,
      uppoCdNm: item.uppoCdNm,
    }))
    .filter((item) => item.code && item.name);
}
