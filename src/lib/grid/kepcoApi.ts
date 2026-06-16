import { parseKepcoAddress } from "@/lib/grid/kepcoAddress";
import {
  findNearbyKepcoItem,
} from "@/lib/grid/kepcoNearby";
import {
  getKepcoDispersedGenerationUrl,
  kepcoMetroCandidates,
  resolveKepcoRegionCodes,
} from "@/lib/grid/kepcoRegionCodes";
import { buildPoleLabel } from "@/lib/grid/poleFromAddress";
import { pickDlRemainingMw } from "@/lib/grid/evaluate";
import type { GridPoleOption } from "@/types/gridConnection";

export interface KepcoGridApiResult {
  dataAsOfDate: string;
  poles: GridPoleOption[];
  matchType: "direct" | "nearby";
  nearbyDistanceKm: number | null;
  nearbyReferenceAddress: string | null;
}

export interface KepcoDispersedGenerationItem {
  substCd?: string;
  substNm?: string;
  jsSubstPwr?: string | number;
  substPwr?: string | number;
  mtrNo?: string;
  jsMtrPwr?: string | number;
  mtrPwr?: string | number;
  dlCd?: string;
  dlNm?: string;
  jsDlPwr?: string | number;
  dlPwr?: string | number;
  vol1?: string | number;
  vol2?: string | number;
  vol3?: string | number;
  addrLidong?: string;
  addrLi?: string;
  addrJibun?: string;
  dataStdDt?: string;
  stdDt?: string;
}

interface KepcoDispersedGenerationResponse {
  data?: KepcoDispersedGenerationItem[];
  resultCode?: string;
  resultMessage?: string;
  errCd?: string;
  errMsg?: string;
}

function getKepcoApiKey(): string | null {
  return (
    process.env.KEPCO_DATA_API_KEY?.trim() ||
    process.env.BIGDATA_KEPCO_API_KEY?.trim() ||
    null
  );
}

function parsePowerMw(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  // KEPCO 분산전원 API 용량 단위는 kW — MW로 변환
  return Math.round((num / 1000) * 1000) / 1000;
}

function buildDirectParamAttempts(
  metroCandidates: string[],
  cityCd: string,
  parsed: { addrLidong: string; addrLi: string; addrJibun: string },
): Record<string, string | undefined>[] {
  const attempts: Record<string, string | undefined>[] = [];
  const seen = new Set<string>();

  for (const metroCd of metroCandidates) {
    const variants: Record<string, string | undefined>[] = [
      {
        metroCd,
        cityCd,
        addrLidong: parsed.addrLidong,
        addrLi: parsed.addrLi,
        addrJibun: parsed.addrJibun,
      },
      { metroCd, cityCd, addrLidong: parsed.addrLidong, addrLi: parsed.addrLi },
      { metroCd, cityCd, addrLidong: parsed.addrLidong },
    ];
    for (const variant of variants) {
      const key = JSON.stringify(variant);
      if (seen.has(key)) continue;
      seen.add(key);
      attempts.push(variant);
    }
  }

  return attempts;
}

function buildCityWideParamAttempts(
  metroCandidates: string[],
  cityCd: string,
): Record<string, string | undefined>[] {
  const attempts: Record<string, string | undefined>[] = [];
  const seen = new Set<string>();

  for (const metroCd of metroCandidates) {
    const variant = { metroCd, cityCd };
    const key = JSON.stringify(variant);
    if (seen.has(key)) continue;
    seen.add(key);
    attempts.push(variant);
  }

  return attempts;
}

function distributionLineName(item: KepcoDispersedGenerationItem): string {
  const name = item.dlNm?.trim();
  if (name) return name;
  const code = item.dlCd?.trim();
  return code || "미확인";
}

async function requestDispersedGeneration(
  apiKey: string,
  params: Record<string, string | undefined>,
): Promise<{ payload: KepcoDispersedGenerationResponse; httpStatus: number }> {
  const url = new URL(getKepcoDispersedGenerationUrl());
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("returnType", "json");
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const payload = (await response.json()) as KepcoDispersedGenerationResponse;
  return { payload, httpStatus: response.status };
}

function mapItemToPole(
  item: KepcoDispersedGenerationItem,
  referenceLocation: string,
): GridPoleOption {
  const poleId =
    item.addrJibun?.trim() ||
    referenceLocation.split(/\s+/).slice(-2).join("-") ||
    referenceLocation;
  const dlRemaining = pickDlRemainingMw(item);

  return {
    poleId,
    label: buildPoleLabel(poleId, referenceLocation),
    referenceLocation,
    substation: {
      name: item.substNm?.trim() || "미확인",
      cumulativeMw: parsePowerMw(item.substPwr),
      remainingMw: parsePowerMw(item.vol1),
    },
    transformer: {
      name: item.mtrNo?.trim() || "미확인",
      cumulativeMw: parsePowerMw(item.mtrPwr),
      remainingMw: parsePowerMw(item.vol2),
    },
    distributionLine: {
      name: distributionLineName(item),
      cumulativeMw: parsePowerMw(item.dlPwr),
      remainingMw: dlRemaining,
    },
  };
}

function scoreDispersedItem(
  item: KepcoDispersedGenerationItem,
  target: { addrLidong: string; addrLi: string; addrJibun: string },
): number {
  let score = 0;
  const jibun = item.addrJibun?.trim();
  const lidong = item.addrLidong?.trim();
  const li = item.addrLi?.trim();

  if (jibun && target.addrJibun && jibun === target.addrJibun) score += 100;
  if (li && target.addrLi && li === target.addrLi) score += 40;
  if (lidong && target.addrLidong && lidong === target.addrLidong) score += 30;

  if (jibun && target.addrJibun && jibun.startsWith(target.addrJibun.split("-")[0] ?? "")) {
    score += 10;
  }

  return score;
}

export function selectBestDispersedItem(
  items: KepcoDispersedGenerationItem[],
  target: { addrLidong: string; addrLi: string; addrJibun: string },
): KepcoDispersedGenerationItem | null {
  if (!items.length) return null;

  let best: KepcoDispersedGenerationItem | null = null;
  let bestScore = -1;

  for (const item of items) {
    const score = scoreDispersedItem(item, target);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  return best ?? items[0] ?? null;
}

function extractDataAsOfDate(items: KepcoDispersedGenerationItem[]): string {
  for (const item of items) {
    const date = item.dataStdDt?.trim() || item.stdDt?.trim();
    if (date) return date;
  }
  return new Date().toISOString().slice(0, 10);
}

export function mapKepcoResponseToPoles(
  items: KepcoDispersedGenerationItem[],
  referenceLocation: string,
  target: { addrLidong: string; addrLi: string; addrJibun: string },
): GridPoleOption[] {
  const best = selectBestDispersedItem(items, target);
  if (!best) return [];

  const pole = mapItemToPole(best, referenceLocation);
  const alternates = items
    .filter((item) => item !== best && item.addrJibun?.trim())
    .map((item) => mapItemToPole(item, referenceLocation));

  return [pole, ...alternates];
}

/** @internal 테스트·스크립트용 */
export function mapKepcoItemsForTest(
  items: KepcoDispersedGenerationItem[],
  jibunAddress: string,
  target: { addrLidong: string; addrLi: string; addrJibun: string },
): GridPoleOption[] {
  return mapKepcoResponseToPoles(items, jibunAddress, target);
}

async function fetchDispersedItems(
  apiKey: string,
  attempts: Record<string, string | undefined>[],
): Promise<KepcoDispersedGenerationItem[]> {
  for (const attempt of attempts) {
    try {
      const result = await requestDispersedGeneration(apiKey, attempt);
      if (result.payload.errCd === "401") {
        console.warn("[Grid/KepcoAPI] Invalid API key", { errMsg: result.payload.errMsg });
        return [];
      }
      const items = Array.isArray(result.payload.data) ? result.payload.data : [];
      if (items.length) return items;
    } catch (error) {
      console.warn("[Grid/KepcoAPI] Network error:", error);
      return [];
    }
  }
  return [];
}

function mapSingleItemToPole(
  item: KepcoDispersedGenerationItem,
  referenceLocation: string,
): GridPoleOption {
  return mapItemToPole(item, referenceLocation);
}

/**
 * 한전 전력데이터개방포털 분산전원연계정보 API
 * https://www.data.go.kr/data/15147381/openapi.do
 */
export async function fetchKepcoGridByLocation(input: {
  lat: number;
  lng: number;
  address: string;
  jibunAddress: string;
  pnu?: string;
  poleId?: string;
}): Promise<KepcoGridApiResult | null> {
  const apiKey = getKepcoApiKey();
  if (!apiKey) {
    return null;
  }

  const parsed = parseKepcoAddress(input.jibunAddress, input.pnu);
  if (!parsed) {
    console.warn("[Grid/KepcoAPI] Address parse failed", { jibunAddress: input.jibunAddress });
    return null;
  }

  const { metroCd, cityCd, cityNm, kepcoMetroCd } = await resolveKepcoRegionCodes({
    sido: parsed.sido,
    sigungu: parsed.sigungu,
    sigunguCd: parsed.sigunguCd,
    apiKey,
  });

  if (!metroCd || !cityCd) {
    console.warn("[Grid/KepcoAPI] Region codes unresolved", {
      address: input.jibunAddress,
      metroCd,
      cityCd,
      cityNm,
      sigungu: parsed.sigungu,
    });
    return null;
  }

  const metroCandidates = kepcoMetroCandidates(kepcoMetroCd, metroCd);
  const target = {
    addrLidong: parsed.addrLidong,
    addrLi: parsed.addrLi,
    addrJibun: parsed.addrJibun,
  };
  const referenceLocation = input.jibunAddress || input.address;

  // 1) 주소 기준 직접 조회
  const directItems = await fetchDispersedItems(
    apiKey,
    buildDirectParamAttempts(metroCandidates, cityCd, target),
  );

  if (directItems.length) {
    const best = selectBestDispersedItem(directItems, target) ?? directItems[0]!;
    const pole = mapSingleItemToPole(best, referenceLocation);
    return {
      dataAsOfDate: extractDataAsOfDate(directItems),
      poles: [pole],
      matchType: "direct",
      nearbyDistanceKm: null,
      nearbyReferenceAddress: null,
    };
  }

  // 2) 시군구 전체 조회 → 좌표 기반 근접 탐색 (1km → 3km → 5km)
  const cityItems = await fetchDispersedItems(
    apiKey,
    buildCityWideParamAttempts(metroCandidates, cityCd),
  );

  if (!cityItems.length) {
    console.info("[Grid/KepcoAPI] No city-wide data for nearby search", {
      address: input.jibunAddress,
      metroCd,
      cityCd,
      cityNm,
    });
    return null;
  }

  const nearby = await findNearbyKepcoItem({
    siteLat: input.lat,
    siteLng: input.lng,
    parsed,
    items: cityItems,
    target,
  });

  if (!nearby) {
    console.info("[Grid/KepcoAPI] Nearby search found no match within 5km", {
      address: input.jibunAddress,
      cityItemCount: cityItems.length,
    });
    return null;
  }

  const pole = mapSingleItemToPole(nearby.item, nearby.referenceAddress);
  return {
    dataAsOfDate: extractDataAsOfDate([nearby.item]),
    poles: [pole],
    matchType: "nearby",
    nearbyDistanceKm: nearby.distanceKm,
    nearbyReferenceAddress: nearby.referenceAddress,
  };
}

export interface KepcoDispersedGenerationDebugResult {
  keyConfigured: boolean;
  parsed: ReturnType<typeof parseKepcoAddress>;
  regionCodes: {
    metroCd: string | null;
    cityCd: string | null;
    cityNm?: string | null;
    kepcoMetroCd?: string | null;
  } | null;
  requestParams: Record<string, string> | null;
  httpStatus: number | null;
  rawResponse: KepcoDispersedGenerationResponse | null;
  selectedItem: KepcoDispersedGenerationItem | null;
  mappedPoles: GridPoleOption[];
}

/** Production 진단용 — API 키·원본 응답 확인 (키 값 미노출) */
export async function debugKepcoDispersedGeneration(input: {
  jibunAddress: string;
  pnu?: string;
}): Promise<KepcoDispersedGenerationDebugResult> {
  const apiKey = getKepcoApiKey();
  const parsed = parseKepcoAddress(input.jibunAddress, input.pnu);

  if (!apiKey || !parsed) {
    return {
      keyConfigured: !!apiKey,
      parsed,
      regionCodes: null,
      requestParams: null,
      httpStatus: null,
      rawResponse: null,
      selectedItem: null,
      mappedPoles: [],
    };
  }

  const regionCodes = await resolveKepcoRegionCodes({
    sido: parsed.sido,
    sigungu: parsed.sigungu,
    sigunguCd: parsed.sigunguCd,
    apiKey,
  });

  if (!regionCodes.metroCd || !regionCodes.cityCd) {
    return {
      keyConfigured: true,
      parsed,
      regionCodes,
      requestParams: null,
      httpStatus: null,
      rawResponse: null,
      selectedItem: null,
      mappedPoles: [],
    };
  }

  const metroCandidates = kepcoMetroCandidates(regionCodes.kepcoMetroCd, regionCodes.metroCd);
  const target = {
    addrLidong: parsed.addrLidong,
    addrLi: parsed.addrLi,
    addrJibun: parsed.addrJibun,
  };
  const paramAttempts = [
    ...buildDirectParamAttempts(metroCandidates, regionCodes.cityCd, target),
    ...buildCityWideParamAttempts(metroCandidates, regionCodes.cityCd),
  ];
  const requestParams: Record<string, string> = {
    returnType: "json",
    ...Object.fromEntries(
      Object.entries(paramAttempts[0] ?? {}).filter(([, value]) => Boolean(value)),
    ),
  };

  let rawResponse: KepcoDispersedGenerationResponse | null = null;
  let httpStatus: number | null = null;
  let usedParams: Record<string, string> | null = null;

  for (const attempt of paramAttempts) {
    try {
      const result = await requestDispersedGeneration(apiKey, attempt);
      rawResponse = result.payload;
      httpStatus = result.httpStatus;
      usedParams = Object.fromEntries(
        Object.entries(attempt).filter(([, value]) => Boolean(value)),
      ) as Record<string, string>;
      usedParams.returnType = "json";

      const items = Array.isArray(rawResponse.data) ? rawResponse.data : [];
      if (items.length) break;
      if (rawResponse.errCd === "401") break;
    } catch (error) {
      rawResponse = { errCd: "FETCH_ERROR", errMsg: String(error) };
      break;
    }
  }

  const items = Array.isArray(rawResponse?.data) ? rawResponse!.data! : [];
  const selectedItem = selectBestDispersedItem(items, target);
  const mappedPoles = items.length
    ? mapKepcoResponseToPoles(items, input.jibunAddress, target)
    : [];

  return {
    keyConfigured: true,
    parsed,
    regionCodes,
    requestParams: usedParams ?? requestParams,
    httpStatus,
    rawResponse,
    selectedItem,
    mappedPoles,
  };
}
