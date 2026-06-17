import { unavailableLandInfo } from "@/lib/api/infoFallbacks";
import { ADJACENT_CADASTRAL_FETCH_SIZE } from "@/lib/parcels/constants";
import { polygonAreaSqm } from "@/lib/solar/polygonGeometry";
import type { LatLngPoint } from "@/types/moduleLayout";
import type { LandInfoDetail } from "@/types/landInfo";
import type { InfoField } from "@/types/siteReview";

const VWORLD_DATA_API = "https://api.vworld.kr/req/data";
const VWORLD_LAND_API = "https://api.vworld.kr/ned/data/getLandCharacteristics";
const VWORLD_LAND_PRICE_API = "https://api.vworld.kr/ned/data/getIndvdLandPriceAttr";

export interface VworldLandResult {
  pnu: string | null;
  landInfo: InfoField[];
  landDetail: LandInfoDetail;
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
  pblntfPclnd?: string | number;
  lastUpdtDt?: string;
  stdrYear?: string | number;
  posesnSeCodeNm?: string;
}

interface IndvdLandPriceField {
  pblntfPclnd?: string | number;
  stdrYear?: string | number;
  lastUpdtDt?: string;
}

interface IndvdLandPriceResponse {
  indvdLandPrices?: { field?: IndvdLandPriceField | IndvdLandPriceField[] };
  indvdLandPrice?: { field?: IndvdLandPriceField | IndvdLandPriceField[] };
}

interface LandCharacteristicsResponse {
  landCharacteristics?: {
    field?: LandCharacteristicsField | LandCharacteristicsField[];
  };
  /** VWorld API 실제 응답 키 */
  landCharacteristicss?: {
    field?: LandCharacteristicsField | LandCharacteristicsField[];
  };
  response?: {
    status?: string;
    error?: { text?: string; code?: string };
  };
}

function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

/** VWorld 키 발급 시 등록한 도메인(VWORLD_API_DOMAIN) 우선 */
function getApiDomainCandidates(): string[] {
  const candidates: string[] = [];
  const add = (value?: string | null) => {
    if (!value) return;
    const normalized = normalizeDomain(value);
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  add(process.env.VWORLD_API_DOMAIN);
  add("sgsolar-analysis.vercel.app");
  add(process.env.VERCEL_URL);
  add("analysis.sgsolar.co.kr");
  add("localhost:3000");

  return candidates;
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

function buildDataApiParams(apiKey: string, domain: string): URLSearchParams {
  return new URLSearchParams({
    key: apiKey,
    format: "json",
    domain,
    version: "2.0",
  });
}

function buildLandApiParams(apiKey: string, domain: string): URLSearchParams {
  return new URLSearchParams({
    key: apiKey,
    format: "json",
    domain,
  });
}

function isVworldAuthError(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  const nested = record.landCharacteristicss as { resultCode?: string } | undefined;
  if (nested?.resultCode === "INCORRECT_KEY") return true;
  const response = record.response as { error?: { code?: string; text?: string } } | undefined;
  const code = response?.error?.code ?? "";
  const text = response?.error?.text ?? "";
  return /INCORRECT|AUTH|KEY|인증/i.test(`${code} ${text}`);
}

async function fetchVworldJson<T>(url: string, label: string): Promise<T | null> {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
        headers: {
          Accept: "application/json",
          Connection: "close",
        },
      });

      if (!response.ok) {
        console.warn(`[VWorld] ${label} HTTP ${response.status} (attempt ${attempt})`);
        if (response.status >= 400 && response.status < 500) break;
        continue;
      }

      const data = (await response.json()) as T;
      if (isVworldAuthError(data)) {
        console.warn(`[VWorld] ${label} domain/key mismatch`);
        return null;
      }
      return data;
    } catch (error) {
      console.warn(`[VWorld] ${label} attempt ${attempt} failed:`, error);
    }
  }

  return null;
}

/** 좌표 → PNU (연속지적도 필지 경계) */
async function fetchPnuByCoordinates(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<string | null> {
  for (const domain of getApiDomainCandidates()) {
    const params = buildDataApiParams(apiKey, domain);
    params.set("service", "data");
    params.set("request", "GetFeature");
    params.set("data", "LP_PA_CBND_BUBUN");
    params.set("size", "1");
    params.set("page", "1");
    params.set("geometry", "false");
    params.set("attribute", "true");
    params.set("crs", "EPSG:4326");
    params.set("geomFilter", `POINT(${lng} ${lat})`);

    const data = await fetchVworldJson<VworldDataResponse>(
      `${VWORLD_DATA_API}?${params.toString()}`,
      "PNU-by-coords",
    );

    const features = data?.response?.result?.featureCollection?.features;
    const pnu = features?.[0]?.properties?.pnu ?? features?.[0]?.properties?.PNU;
    if (pnu) return String(pnu);
  }

  return null;
}

/** PNU → 토지특성 (지목·면적·용도지역) */
async function fetchLandCharacteristics(
  pnu: string,
  apiKey: string,
): Promise<LandCharacteristicsField | null> {
  for (const domain of getApiDomainCandidates()) {
    for (const stdrYear of getStdrYears()) {
      const params = buildLandApiParams(apiKey, domain);
      params.set("pnu", pnu);
      params.set("stdrYear", stdrYear);

      const data = await fetchVworldJson<LandCharacteristicsResponse>(
        `${VWORLD_LAND_API}?${params.toString()}`,
        "land-characteristics",
      );

      const field = extractLandField(data);
      if (field?.lndcgrCodeNm || field?.lndpclAr || field?.prposArea1Nm) {
        return field;
      }
    }
  }

  console.warn("[VWorld] Land characteristics not found for PNU:", pnu);
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

function formatOfficialPrice(value: string | number | undefined): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return `${num.toLocaleString("ko-KR")}원/㎡`;
}

function extractIndvdPriceField(data: IndvdLandPriceResponse | null): IndvdLandPriceField | null {
  if (!data) return null;
  const field = data.indvdLandPrices?.field ?? data.indvdLandPrice?.field;
  if (!field) return null;
  return Array.isArray(field) ? (field[0] ?? null) : field;
}

async function fetchIndvdLandPrice(pnu: string, apiKey: string): Promise<IndvdLandPriceField | null> {
  for (const domain of getApiDomainCandidates()) {
    for (const stdrYear of getStdrYears()) {
      const params = buildLandApiParams(apiKey, domain);
      params.set("pnu", pnu);
      params.set("stdrYear", stdrYear);

      const data = await fetchVworldJson<IndvdLandPriceResponse>(
        `${VWORLD_LAND_PRICE_API}?${params.toString()}`,
        "indvd-land-price",
      );
      const field = extractIndvdPriceField(data);
      if (field?.pblntfPclnd) return field;
    }
  }
  return null;
}

function unavailableLandDetail(): LandInfoDetail {
  return {
    landCategory: "확인 필요",
    area: "확인 필요",
    zoning: "확인 필요",
    dataSource: "unavailable",
  };
}

function buildLandDetail(
  field: LandCharacteristicsField,
  priceField?: IndvdLandPriceField | null,
  stdrYear?: string,
): LandInfoDetail {
  const useZone = formatUseZone(field);
  const priceValue = field.pblntfPclnd ?? priceField?.pblntfPclnd;
  const year =
    field.stdrYear?.toString() ??
    priceField?.stdrYear?.toString() ??
    stdrYear ??
    undefined;

  const regionParts = [field.prposArea1Nm, field.prposArea2Nm]
    .filter(Boolean)
    .filter((v) => v !== "지정되지않음");

  return {
    landCategory: field.lndcgrCodeNm?.trim() || "확인 필요",
    area: formatArea(field.lndpclAr),
    zoning: field.prposArea1Nm?.trim() || useZone,
    zoningSecondary:
      field.prposArea2Nm && field.prposArea2Nm !== "지정되지않음"
        ? field.prposArea2Nm.trim()
        : undefined,
    landUseSituation: field.ladUseSittnNm?.trim() || undefined,
    officialLandPrice: formatOfficialPrice(priceValue),
    priceReferenceYear: year,
    priceReferenceDate: field.lastUpdtDt?.trim() || priceField?.lastUpdtDt?.trim(),
    ownershipType: field.posesnSeCodeNm?.trim() || undefined,
    regionDistrictSummary: regionParts.length > 0 ? regionParts.join(" · ") : undefined,
    dataSource: "api",
  };
}

async function resolveLandPayload(
  pnu: string,
  field: LandCharacteristicsField,
  apiKey: string,
  stdrYear?: string,
): Promise<{ landInfo: InfoField[]; landDetail: LandInfoDetail }> {
  let priceField: IndvdLandPriceField | null = null;
  if (!field.pblntfPclnd) {
    priceField = await fetchIndvdLandPrice(pnu, apiKey);
  }

  const landDetail = buildLandDetail(field, priceField, stdrYear);
  const useZone = formatUseZone(field);

  const landInfo: InfoField[] = [
    { label: "지목", value: landDetail.landCategory },
    { label: "용도지역", value: useZone },
    { label: "면적", value: landDetail.area },
    ...(landDetail.officialLandPrice
      ? [{ label: "공시지가", value: landDetail.officialLandPrice }]
      : []),
    ...(landDetail.priceReferenceYear
      ? [{ label: "공시지가 기준연도", value: `${landDetail.priceReferenceYear}년` }]
      : []),
    ...(landDetail.ownershipType ? [{ label: "소유구분", value: landDetail.ownershipType }] : []),
    ...(landDetail.regionDistrictSummary
      ? [{ label: "지역·지구", value: landDetail.regionDistrictSummary }]
      : []),
    {
      label: "토지이용계획",
      value: landDetail.landUseSituation || useZone,
    },
  ];

  return { landInfo, landDetail };
}

/** PNU로 토지특성 조회 */
export async function getLandInfoByPnu(pnu: string): Promise<VworldLandResult> {
  const fallback: VworldLandResult = {
    pnu,
    landInfo: unavailableLandInfo(),
    landDetail: unavailableLandDetail(),
  };
  const apiKey = process.env.VWORLD_API_KEY?.trim();

  if (!apiKey) {
    console.warn("[VWorld] VWORLD_API_KEY not configured");
    return fallback;
  }

  try {
    const characteristics = await fetchLandCharacteristics(pnu, apiKey);
    if (!characteristics) return fallback;

    const payload = await resolveLandPayload(pnu, characteristics, apiKey);
    return { pnu, ...payload };
  } catch (error) {
    console.error("[VWorld] getLandInfoByPnu error:", error);
    return fallback;
  }
}

/** 좌표 기반 토지정보 조회 (서버 전용) */
export async function getLandInfoByVworld(
  lat: number,
  lng: number,
): Promise<VworldLandResult> {
  const fallback: VworldLandResult = {
    pnu: null,
    landInfo: unavailableLandInfo(),
    landDetail: unavailableLandDetail(),
  };
  const apiKey = process.env.VWORLD_API_KEY?.trim();

  if (!apiKey) {
    console.warn("[VWorld] VWORLD_API_KEY not configured");
    return fallback;
  }

  try {
    const pnu = await fetchPnuByCoordinates(lat, lng, apiKey);
    if (!pnu) return fallback;

    const characteristics = await fetchLandCharacteristics(pnu, apiKey);
    if (!characteristics) {
      return { pnu, landInfo: unavailableLandInfo(), landDetail: unavailableLandDetail() };
    }

    const payload = await resolveLandPayload(pnu, characteristics, apiKey);
    return { pnu, ...payload };
  } catch (error) {
    console.error("[VWorld] getLandInfoByVworld error:", error);
    return fallback;
  }
}

interface VworldFeatureWithGeometry {
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
  properties?: Record<string, string>;
}

function extractPolygonRingFromGeometry(
  geometry?: VworldFeatureWithGeometry["geometry"],
): number[][] | null {
  if (!geometry?.coordinates) return null;

  const coords = geometry.coordinates;

  if (geometry.type === "Polygon" && Array.isArray(coords) && Array.isArray(coords[0])) {
    return coords[0] as number[][];
  }

  if (
    geometry.type === "MultiPolygon" &&
    Array.isArray(coords) &&
    Array.isArray(coords[0]) &&
    Array.isArray((coords[0] as number[][][])[0])
  ) {
    return (coords[0] as number[][][])[0];
  }

  return null;
}

function extractCentroidFromGeometry(geometry?: VworldFeatureWithGeometry["geometry"]): {
  lat: number;
  lng: number;
} | null {
  const ring = extractPolygonRingFromGeometry(geometry);
  if (!ring?.length) return null;

  let sumLng = 0;
  let sumLat = 0;
  for (const point of ring) {
    sumLng += point[0];
    sumLat += point[1];
  }

  return { lng: sumLng / ring.length, lat: sumLat / ring.length };
}

export interface CadastralPolygonResult {
  pnu: string;
  ring: Array<{ lat: number; lng: number }>;
}

/** PNU → 연속지적도 필지 경계 폴리곤 (lat/lng 링) */
export async function fetchCadastralPolygonByPnu(
  pnu: string,
  lat: number,
  lng: number,
): Promise<CadastralPolygonResult | null> {
  const apiKey = process.env.VWORLD_API_KEY?.trim();
  if (!apiKey || !pnu) return null;

  for (const domain of getApiDomainCandidates()) {
    const params = buildDataApiParams(apiKey, domain);
    params.set("service", "data");
    params.set("request", "GetFeature");
    params.set("data", "LP_PA_CBND_BUBUN");
    params.set("size", "5");
    params.set("page", "1");
    params.set("geometry", "true");
    params.set("attribute", "true");
    params.set("crs", "EPSG:4326");
    params.set("attrFilter", `pnu:EQ:${pnu}`);
    params.set("geomFilter", `POINT(${lng} ${lat})`);

    const data = await fetchVworldJson<
      VworldDataResponse & {
        response?: { result?: { featureCollection?: { features?: VworldFeatureWithGeometry[] } } };
      }
    >(`${VWORLD_DATA_API}?${params.toString()}`, "cadastral-polygon");

    const features = data?.response?.result?.featureCollection?.features ?? [];

    for (const feature of features) {
      const featurePnu = String(feature.properties?.pnu ?? feature.properties?.PNU ?? "");
      if (featurePnu && featurePnu !== pnu) continue;

      const ringCoords = extractPolygonRingFromGeometry(feature.geometry);
      if (!ringCoords?.length) continue;

      const ring = ringCoords.map(([lngCoord, latCoord]) => ({
        lat: latCoord,
        lng: lngCoord,
      }));

      return { pnu: featurePnu || pnu, ring };
    }
  }

  return null;
}

export interface CadastralParcelFeature {
  pnu: string;
  lat: number;
  lng: number;
  jibun?: string;
}

/** 대표 필지 기준 반경(m) 내 연속지적도 필지 탐색 */
export async function fetchAdjacentCadastralParcels(
  lat: number,
  lng: number,
  radiusM = 50,
  excludePnu?: string,
): Promise<CadastralParcelFeature[]> {
  const apiKey = process.env.VWORLD_API_KEY?.trim();
  if (!apiKey) return [];

  for (const domain of getApiDomainCandidates()) {
    const params = buildDataApiParams(apiKey, domain);
    params.set("service", "data");
    params.set("request", "GetFeature");
    params.set("data", "LP_PA_CBND_BUBUN");
    params.set("size", String(ADJACENT_CADASTRAL_FETCH_SIZE));
    params.set("page", "1");
    params.set("geometry", "true");
    params.set("attribute", "true");
    params.set("crs", "EPSG:4326");
    params.set("geomFilter", `BUFFER(POINT(${lng} ${lat}), ${radiusM})`);

    const data = await fetchVworldJson<VworldDataResponse & { response?: { result?: { featureCollection?: { features?: VworldFeatureWithGeometry[] } } } }>(
      `${VWORLD_DATA_API}?${params.toString()}`,
      "adjacent-parcels",
    );

    const features = data?.response?.result?.featureCollection?.features ?? [];
    const results: CadastralParcelFeature[] = [];
    const seen = new Set<string>();

    for (const feature of features) {
      const pnu = String(feature.properties?.pnu ?? feature.properties?.PNU ?? "");
      if (!pnu || pnu === excludePnu || seen.has(pnu)) continue;

      const centroid = extractCentroidFromGeometry(feature.geometry);
      if (!centroid) continue;

      seen.add(pnu);
      results.push({
        pnu,
        lat: centroid.lat,
        lng: centroid.lng,
        jibun: feature.properties?.jibun ?? feature.properties?.addr ?? undefined,
      });
    }

    if (results.length > 0) return results;
  }

  return [];
}

const BUILDING_DATA_LAYERS = ["LT_C_SPBD", "LT_L_SPRD", "LT_C_ADBD"] as const;

export interface BuildingPolygonResult {
  pnu: string;
  ring: LatLngPoint[];
}

function ringFromFeature(feature: VworldFeatureWithGeometry): LatLngPoint[] | null {
  const ringCoords = extractPolygonRingFromGeometry(feature.geometry);
  if (!ringCoords?.length) return null;
  return ringCoords.map(([lngCoord, latCoord]) => ({
    lat: latCoord,
    lng: lngCoord,
  }));
}

function pickLargestBuildingRing(features: VworldFeatureWithGeometry[]): LatLngPoint[] | null {
  let bestRing: LatLngPoint[] | null = null;
  let bestArea = 0;

  for (const feature of features) {
    const ring = ringFromFeature(feature);
    if (!ring?.length) continue;
    const area = polygonAreaSqm(ring);
    if (area > bestArea) {
      bestArea = area;
      bestRing = ring;
    }
  }

  return bestRing;
}

async function fetchBuildingPolygonFromDataLayer(
  pnu: string,
  lat: number,
  lng: number,
  dataLayer: string,
  apiKey: string,
): Promise<BuildingPolygonResult | null> {
  for (const domain of getApiDomainCandidates()) {
    const params = buildDataApiParams(apiKey, domain);
    params.set("service", "data");
    params.set("request", "GetFeature");
    params.set("data", dataLayer);
    params.set("size", "20");
    params.set("page", "1");
    params.set("geometry", "true");
    params.set("attribute", "true");
    params.set("crs", "EPSG:4326");
    params.set("attrFilter", `pnu:EQ:${pnu}`);
    params.set("geomFilter", `POINT(${lng} ${lat})`);

    const data = await fetchVworldJson<
      VworldDataResponse & {
        response?: { result?: { featureCollection?: { features?: VworldFeatureWithGeometry[] } } };
      }
    >(`${VWORLD_DATA_API}?${params.toString()}`, `building-polygon-${dataLayer}`);

    const features = data?.response?.result?.featureCollection?.features ?? [];
    const matching = features.filter((feature) => {
      const featurePnu = String(feature.properties?.pnu ?? feature.properties?.PNU ?? "");
      return !featurePnu || featurePnu === pnu;
    });
    const ring = pickLargestBuildingRing(matching);
    if (ring?.length) {
      return { pnu, ring };
    }
  }

  return null;
}

/** PNU → VWorld 건물 폴리곤 (lat/lng 링) — 면적 최대 건물 1건 */
export async function fetchBuildingPolygonByPnu(
  pnu: string,
  lat: number,
  lng: number,
): Promise<BuildingPolygonResult | null> {
  const apiKey = process.env.VWORLD_API_KEY?.trim();
  if (!apiKey || !pnu) return null;

  for (const dataLayer of BUILDING_DATA_LAYERS) {
    const result = await fetchBuildingPolygonFromDataLayer(pnu, lat, lng, dataLayer, apiKey);
    if (result?.ring?.length) return result;
  }

  return null;
}

/** 좌표 → PNU → 연속지적도 필지 경계 (pnu 미전달 시) */
export async function fetchCadastralPolygonAtCoordinates(
  lat: number,
  lng: number,
): Promise<CadastralPolygonResult | null> {
  const apiKey = process.env.VWORLD_API_KEY?.trim();
  if (!apiKey) return null;

  const pnu = await fetchPnuByCoordinates(lat, lng, apiKey);
  if (!pnu) return null;

  return fetchCadastralPolygonByPnu(pnu, lat, lng);
}

