import { hasLandRecord, unavailableLandInfo } from "@/lib/api/infoFallbacks";
import type { InfoField } from "@/types/siteReview";

const VWORLD_DATA_API = "https://api.vworld.kr/req/data";
const VWORLD_LAND_API = "https://api.vworld.kr/ned/data/getLandCharacteristics";

export interface VworldLandResult {
  pnu: string | null;
  landInfo: InfoField[];
}

export interface VworldFetchDiagnostic {
  url: string;
  httpStatus: number | null;
  apiStatus?: string;
  errorText?: string;
  bodyPreview?: string;
}

interface VworldFeatureCollection {
  features?: Array<{
    properties?: Record<string, string>;
  }>;
}

interface VworldDataResponse {
  response?: {
    status?: string;
    error?: { text?: string; code?: string };
    result?: {
      featureCollection?: VworldFeatureCollection;
    };
  };
}

interface LandCharacteristicsField {
  pnu?: string;
  lndcgrCodeNm?: string;
  lndpclAr?: string | number;
  prposArea1Nm?: string;
  prposArea2Nm?: string;
  ladUseSittnNm?: string;
}

interface LandCharacteristicsResponse {
  landCharacteristics?: {
    field?: LandCharacteristicsField | LandCharacteristicsField[];
  };
  /** VWorld API 실제 응답 키 (typo 포함) */
  landCharacteristicss?: {
    field?: LandCharacteristicsField | LandCharacteristicsField[];
  };
  response?: {
    status?: string;
    error?: { text?: string; code?: string };
  };
}

function getApiDomainCandidates(): string[] {
  const candidates = new Set<string>();
  const configured = process.env.VWORLD_API_DOMAIN?.trim();
  const vercelUrl = process.env.VERCEL_URL?.trim();
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (configured) candidates.add(configured);
  if (vercelUrl) candidates.add(vercelUrl);
  if (productionUrl) candidates.add(productionUrl);
  candidates.add("sgsolar-analysis.vercel.app");
  candidates.add("analysis.sgsolar.co.kr");
  candidates.add("localhost:3000");

  return [...candidates];
}

function getStdrYears(): string[] {
  if (process.env.VWORLD_STDR_YEAR?.trim()) {
    return [process.env.VWORLD_STDR_YEAR.trim()];
  }
  const year = new Date().getFullYear();
  return [String(year), String(year - 1), String(year - 2)];
}

function extractLandField(
  data: LandCharacteristicsResponse | null,
): LandCharacteristicsField | null {
  if (!data) return null;
  const field = data.landCharacteristicss?.field ?? data.landCharacteristics?.field;
  if (!field) return null;
  return Array.isArray(field) ? (field[0] ?? null) : field;
}

function buildSearchParams(apiKey: string, domain: string): URLSearchParams {
  return new URLSearchParams({
    key: apiKey,
    format: "json",
    domain,
    version: "2.0",
  });
}

function redactApiKey(url: string): string {
  return url.replace(/([?&](key|Key)=)[^&]+/gi, "$1***");
}

function previewBody(text: string, max = 600): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

async function fetchJsonWithDiagnostic<T>(
  url: string,
  label: string,
): Promise<{ data: T | null; diagnostic: VworldFetchDiagnostic }> {
  const maxAttempts = 3;
  const diagnostic: VworldFetchDiagnostic = {
    url: redactApiKey(url),
    httpStatus: null,
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
        headers: { Accept: "application/json" },
      });

      diagnostic.httpStatus = response.status;
      const text = await response.text();
      diagnostic.bodyPreview = previewBody(text);

      if (!response.ok) {
        console.warn(
          `[VWorld] ${label} HTTP ${response.status} (attempt ${attempt}/${maxAttempts})`,
          diagnostic.url,
        );
        continue;
      }

      try {
        const data = JSON.parse(text) as T & {
          response?: { status?: string; error?: { text?: string } };
        };
        diagnostic.apiStatus = data.response?.status;
        if (data.response?.error?.text) {
          diagnostic.errorText = data.response.error.text;
        }
        return { data, diagnostic };
      } catch {
        console.warn(`[VWorld] ${label} invalid JSON`, diagnostic.url);
        return { data: null, diagnostic };
      }
    } catch (error) {
      diagnostic.errorText = error instanceof Error ? error.message : String(error);
      console.warn(`[VWorld] ${label} fetch attempt ${attempt}/${maxAttempts} failed:`, error);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      }
    }
  }

  console.warn(`[VWorld] ${label} failed`, JSON.stringify(diagnostic));
  return { data: null, diagnostic };
}

/** 좌표 → PNU (연속지적도 필지 경계) */
export async function fetchPnuByCoordinates(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<string | null> {
  for (const domain of getApiDomainCandidates()) {
    const params = buildSearchParams(apiKey, domain);
    params.set("service", "data");
    params.set("request", "GetFeature");
    params.set("data", "LP_PA_CBND_BUBUN");
    params.set("size", "1");
    params.set("page", "1");
    params.set("geometry", "false");
    params.set("attribute", "true");
    params.set("crs", "EPSG:4326");
    params.set("geomFilter", `POINT(${lng} ${lat})`);

    const { data, diagnostic } = await fetchJsonWithDiagnostic<VworldDataResponse>(
      `${VWORLD_DATA_API}?${params.toString()}`,
      "PNU-by-coords",
    );

    const features = data?.response?.result?.featureCollection?.features;
    const pnu = features?.[0]?.properties?.pnu ?? features?.[0]?.properties?.PNU;

    if (pnu) {
      console.info(`[VWorld] PNU resolved with domain: ${domain}`, { pnu });
      return String(pnu);
    }

    console.warn(`[VWorld] PNU not found for domain: ${domain}`, JSON.stringify(diagnostic));
  }

  return null;
}

/** PNU → 토지특성 (지목·면적·용도지역) */
export async function fetchLandCharacteristics(
  pnu: string,
  apiKey: string,
): Promise<LandCharacteristicsField | null> {
  for (const domain of getApiDomainCandidates()) {
    for (const stdrYear of getStdrYears()) {
      const params = buildSearchParams(apiKey, domain);
      params.set("pnu", pnu);
      params.set("stdrYear", stdrYear);

      const { data, diagnostic } = await fetchJsonWithDiagnostic<LandCharacteristicsResponse>(
        `${VWORLD_LAND_API}?${params.toString()}`,
        "land-characteristics",
      );

      const field = extractLandField(data);
      if (field?.lndcgrCodeNm || field?.lndpclAr || field?.prposArea1Nm) {
        console.info(`[VWorld] Land characteristics resolved`, {
          domain,
          stdrYear,
          pnu,
          lndcgrCodeNm: field.lndcgrCodeNm,
          lndpclAr: field.lndpclAr,
          prposArea1Nm: field.prposArea1Nm,
        });
        return field;
      }

      console.warn(
        `[VWorld] Land characteristics empty for domain=${domain} year=${stdrYear}`,
        JSON.stringify(diagnostic),
      );
    }
  }

  return null;
}

function formatArea(value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "확인 필요";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `${num.toLocaleString("ko-KR")}㎡`;
}

function formatUseZone(field: LandCharacteristicsField): string {
  const zones = [field.prposArea1Nm, field.prposArea2Nm]
    .filter(Boolean)
    .filter((zone) => zone !== "지정되지않음");
  return zones.length > 0 ? zones.join(" / ") : "확인 필요";
}

function mapCharacteristicsToLandInfo(
  _pnu: string,
  field: LandCharacteristicsField,
): InfoField[] {
  const useZone = formatUseZone(field);

  return [
    {
      label: "지목",
      value: field.lndcgrCodeNm?.trim() || "확인 필요",
      status: field.lndcgrCodeNm ? "상담 시 확인" : "확인 필요",
    },
    {
      label: "용도지역",
      value: useZone,
      status: useZone !== "확인 필요" ? "추가 확인 필요" : "확인 필요",
    },
    {
      label: "면적",
      value: formatArea(field.lndpclAr),
      status: field.lndpclAr ? "상담 시 확인" : "확인 필요",
    },
    {
      label: "규제사항",
      value: useZone !== "확인 필요" ? `${useZone} 내 설치 검토` : "용도지역 확인 필요",
      status: "추가 확인 필요",
    },
    {
      label: "토지이용계획",
      value: field.ladUseSittnNm?.trim() || useZone,
      status: "확인 필요",
    },
  ];
}

/** PNU로 토지특성만 조회 (좌표→PNU 실패 후 재시도용) */
export async function getLandInfoByPnu(pnu: string): Promise<VworldLandResult> {
  const fallback: VworldLandResult = { pnu, landInfo: unavailableLandInfo() };
  const apiKey = process.env.VWORLD_API_KEY?.trim();

  if (!apiKey) {
    console.warn("[VWorld] VWORLD_API_KEY not configured — land info by PNU unavailable");
    return fallback;
  }

  try {
    const characteristics = await fetchLandCharacteristics(pnu, apiKey);
    if (!characteristics) {
      console.warn("[VWorld] Land characteristics not found for PNU:", pnu);
      return fallback;
    }

    return {
      pnu,
      landInfo: mapCharacteristicsToLandInfo(pnu, characteristics),
    };
  } catch (error) {
    console.error("[VWorld] getLandInfoByPnu error:", error);
    return fallback;
  }
}

/**
 * VWorld — 좌표 기반 토지정보 조회 (서버 전용)
 * 1) LP_PA_CBND_BUBUN: 좌표 → PNU
 * 2) getLandCharacteristics: PNU → 지목·면적·용도지역
 */
export async function getLandInfoByVworld(
  lat: number,
  lng: number,
): Promise<VworldLandResult> {
  const fallback: VworldLandResult = { pnu: null, landInfo: unavailableLandInfo() };
  const apiKey = process.env.VWORLD_API_KEY?.trim();

  console.info("[VWorld] getLandInfoByVworld start", {
    apiKeyLoaded: Boolean(apiKey),
    apiKeyLength: apiKey?.length ?? 0,
    domainConfigured: Boolean(process.env.VWORLD_API_DOMAIN?.trim()),
    lat,
    lng,
  });

  if (!apiKey) {
    console.warn("[VWorld] VWORLD_API_KEY not configured — land info unavailable");
    return fallback;
  }

  try {
    const pnu = await fetchPnuByCoordinates(lat, lng, apiKey);
    if (!pnu) {
      console.warn("[VWorld] PNU not found for coordinates — land info unavailable", { lat, lng });
      return fallback;
    }

    const characteristics = await fetchLandCharacteristics(pnu, apiKey);
    if (!characteristics) {
      console.warn("[VWorld] Land characteristics not found — partial PNU only", { pnu });
      return { pnu, landInfo: unavailableLandInfo() };
    }

    const landInfo = mapCharacteristicsToLandInfo(pnu, characteristics);
    console.info("[VWorld] getLandInfoByVworld success", {
      pnu,
      hasLandRecord: hasLandRecord(landInfo),
    });

    return { pnu, landInfo };
  } catch (error) {
    console.error("[VWorld] API error — land info unavailable:", error);
    return fallback;
  }
}

export async function diagnoseVworldForSite(
  lat: number,
  lng: number,
  pnuFallback: string | null,
): Promise<Record<string, unknown>> {
  const apiKey = process.env.VWORLD_API_KEY?.trim();
  const domains = getApiDomainCandidates();

  const pnuFromCoords = apiKey ? await fetchPnuByCoordinates(lat, lng, apiKey) : null;
  const landByCoords = await getLandInfoByVworld(lat, lng);
  const landByPnu = pnuFallback ? await getLandInfoByPnu(pnuFallback) : null;

  return {
    apiKeyLoaded: Boolean(apiKey),
    apiKeyLength: apiKey?.length ?? 0,
    domainCandidates: domains,
    configuredDomain: process.env.VWORLD_API_DOMAIN?.trim() ?? null,
    pnuFromCoordinates: pnuFromCoords,
    pnuFallback,
    landByCoordinates: {
      pnu: landByCoords.pnu,
      hasLandRecord: hasLandRecord(landByCoords.landInfo),
      landInfo: landByCoords.landInfo,
    },
    landByPnu: landByPnu
      ? {
          pnu: landByPnu.pnu,
          hasLandRecord: hasLandRecord(landByPnu.landInfo),
          landInfo: landByPnu.landInfo,
        }
      : null,
  };
}
