import { unavailableLandInfo } from "@/lib/api/infoFallbacks";
import type { InfoField } from "@/types/siteReview";

const VWORLD_DATA_API = "https://api.vworld.kr/req/data";
const VWORLD_LAND_API = "https://api.vworld.kr/ned/data/getLandCharacteristics";

export interface VworldLandResult {
  pnu: string | null;
  landInfo: InfoField[];
}

interface VworldFeatureCollection {
  features?: Array<{
    properties?: Record<string, string>;
  }>;
}

interface VworldDataResponse {
  response?: {
    status?: string;
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

async function fetchJson<T>(url: string): Promise<T | null> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        console.warn(`[VWorld] HTTP ${response.status} (attempt ${attempt}/${maxAttempts})`);
        continue;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.warn(`[VWorld] fetch attempt ${attempt}/${maxAttempts} failed:`, error);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      }
    }
  }

  return null;
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

    const data = await fetchJson<VworldDataResponse>(`${VWORLD_DATA_API}?${params.toString()}`);
    const features = data?.response?.result?.featureCollection?.features;
    const pnu = features?.[0]?.properties?.pnu ?? features?.[0]?.properties?.PNU;

    if (pnu) {
      console.info(`[VWorld] PNU resolved with domain: ${domain}`);
      return String(pnu);
    }

    console.warn(`[VWorld] PNU not found for domain: ${domain}`);
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

      const data = await fetchJson<LandCharacteristicsResponse>(
        `${VWORLD_LAND_API}?${params.toString()}`,
      );

      const field = extractLandField(data);
      if (field?.lndcgrCodeNm || field?.lndpclAr || field?.prposArea1Nm) {
        console.info(`[VWorld] Land characteristics resolved with domain: ${domain}`);
        return field;
      }
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

function buildPnuOnlyLandInfo(_pnu: string): InfoField[] {
  return unavailableLandInfo();
}

/**
 * VWorld API — 좌표 기반 토지정보 조회 (서버 전용)
 *
 * 1) LP_PA_CBND_BUBUN: 좌표 → PNU
 * 2) getLandCharacteristics: PNU → 지목·면적·용도지역
 *
 * 환경변수: VWORLD_API_KEY, VWORLD_API_DOMAIN (선택)
 * @see https://www.vworld.kr/dev/v4dv_2guide.do
 */
export async function getLandInfoByVworld(
  lat: number,
  lng: number,
): Promise<VworldLandResult> {
  const fallback: VworldLandResult = { pnu: null, landInfo: unavailableLandInfo() };
  const apiKey = process.env.VWORLD_API_KEY?.trim();

  if (!apiKey) {
    console.warn("[VWorld] VWORLD_API_KEY not configured — land info unavailable");
    return fallback;
  }

  try {
    const pnu = await fetchPnuByCoordinates(lat, lng, apiKey);
    if (!pnu) {
      console.warn("[VWorld] PNU not found for coordinates — land info unavailable");
      return fallback;
    }

    const characteristics = await fetchLandCharacteristics(pnu, apiKey);
    if (!characteristics) {
      console.warn("[VWorld] Land characteristics not found — partial PNU only");
      return { pnu, landInfo: buildPnuOnlyLandInfo(pnu) };
    }

    return {
      pnu,
      landInfo: mapCharacteristicsToLandInfo(pnu, characteristics),
    };
  } catch (error) {
    console.error("[VWorld] API error — land info unavailable:", error);
    return fallback;
  }
}
