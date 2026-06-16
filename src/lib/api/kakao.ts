import { DEFAULT_ADDRESS } from "@/data/sampleData";
import type { AddressSuggestion } from "@/types/address";
import {
  KakaoAddressNotFoundError,
  KakaoApiKeyMissingError,
  KakaoNetworkError,
} from "@/lib/api/kakaoErrors";

export interface KakaoAddressResult {
  /** 도로명주소 */
  address: string;
  /** 지번주소 */
  jibunAddress: string;
  lat: number;
  lng: number;
  pnu: string | null;
  buildingName: string;
  zoneNo: string;
}

interface KakaoRoadAddress {
  address_name: string;
  building_name?: string;
  zone_no?: string;
}

interface KakaoRegionAddress {
  address_name: string;
}

interface KakaoAddressDocument {
  address_name: string;
  address_type: string;
  x: string;
  y: string;
  address?: KakaoRegionAddress;
  road_address?: KakaoRoadAddress | null;
}

interface KakaoAddressResponse {
  documents: KakaoAddressDocument[];
}

interface KakaoRegionDocument {
  region_type: "B" | "H";
  code: string;
  address_name: string;
}

interface KakaoRegionResponse {
  documents: KakaoRegionDocument[];
}

const KAKAO_ADDRESS_API = "https://dapi.kakao.com/v2/local/search/address.json";
const KAKAO_COORD2REGION_API = "https://dapi.kakao.com/v2/local/geo/coord2regioncode.json";
const KAKAO_COORD2ADDRESS_API = "https://dapi.kakao.com/v2/local/geo/coord2address.json";
const SUGGESTION_LIMIT = 8;

export interface LegalDongCodes {
  sigunguCd: string;
  bjdongCd: string;
}

function mapDocumentToSuggestion(doc: KakaoAddressDocument, index: number): AddressSuggestion {
  const roadAddress = doc.road_address?.address_name?.trim() || null;
  const jibunAddress =
    doc.address?.address_name?.trim() || doc.address_name?.trim() || roadAddress || "";
  const selectedAddress = roadAddress || jibunAddress;

  return {
    id: `${doc.x}-${doc.y}-${index}`,
    jibunAddress,
    roadAddress,
    selectedAddress,
  };
}

async function fetchKakaoAddressDocuments(query: string): Promise<KakaoAddressDocument[]> {
  const apiKey = process.env.KAKAO_REST_API_KEY;

  if (!apiKey) {
    throw new KakaoApiKeyMissingError();
  }

  const url = `${KAKAO_ADDRESS_API}?query=${encodeURIComponent(query)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      cache: "no-store",
    });
  } catch {
    throw new KakaoNetworkError();
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new KakaoApiKeyMissingError();
    }
    throw new KakaoNetworkError();
  }

  let data: KakaoAddressResponse;
  try {
    data = (await response.json()) as KakaoAddressResponse;
  } catch {
    throw new KakaoNetworkError();
  }

  return data.documents ?? [];
}

async function fetchKakaoRegionDocuments(lat: number, lng: number): Promise<KakaoRegionDocument[]> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) return [];

  const url = `${KAKAO_COORD2REGION_API}?x=${lng}&y=${lat}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `KakaoAK ${apiKey}` },
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`[Kakao] coord2region HTTP ${response.status}`);
      return [];
    }

    const data = (await response.json()) as KakaoRegionResponse;
    return data.documents ?? [];
  } catch (error) {
    console.warn("[Kakao] coord2region failed:", error);
    return [];
  }
}

/** 좌표 → 법정동코드 (시군구 5 + 법정동 5) */
export async function fetchLegalDongCodesByCoord(
  lat: number,
  lng: number,
): Promise<LegalDongCodes | null> {
  const documents = await fetchKakaoRegionDocuments(lat, lng);
  const legal = documents.find((doc) => doc.region_type === "B" && /^\d{10}$/.test(doc.code));

  if (!legal) {
    console.warn("[Kakao] Legal dong code not found for coordinates");
    return null;
  }

  return {
    sigunguCd: legal.code.slice(0, 5),
    bjdongCd: legal.code.slice(5, 10),
  };
}

/**
 * 주소 자동완성 후보 조회 (서버 전용)
 */
export async function searchAddressSuggestions(
  query: string,
  limit = SUGGESTION_LIMIT,
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const documents = await fetchKakaoAddressDocuments(trimmed);
  return documents.slice(0, limit).map(mapDocumentToSuggestion);
}

/**
 * 카카오 주소검색 API (서버 전용)
 * @see https://developers.kakao.com/docs/latest/ko/local/dev-guide
 *
 * 환경변수: KAKAO_REST_API_KEY (.env.local)
 */
export async function searchAddressByKakao(address: string): Promise<KakaoAddressResult> {
  const query = address.trim() || DEFAULT_ADDRESS;
  const documents = await fetchKakaoAddressDocuments(query);
  const doc = documents[0];

  if (!doc) {
    throw new KakaoAddressNotFoundError();
  }

  const roadAddress = doc.road_address?.address_name ?? "";
  const jibunAddress = doc.address?.address_name ?? doc.address_name;
  const addressName = roadAddress || doc.address_name;

  const lat = Number.parseFloat(doc.y);
  const lng = Number.parseFloat(doc.x);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new KakaoNetworkError();
  }

  return {
    address: addressName,
    jibunAddress,
    lat,
    lng,
    pnu: null,
    buildingName: doc.road_address?.building_name ?? "",
    zoneNo: doc.road_address?.zone_no ?? "",
  };
}

interface KakaoCoord2AddressDocument {
  address?: { address_name?: string };
  road_address?: { address_name?: string };
}

interface KakaoCoord2AddressResponse {
  documents: KakaoCoord2AddressDocument[];
}

/** 좌표 → 지번/도로명 주소 (연속지적 인접 필지용) */
export async function reverseGeocodeKakao(
  lat: number,
  lng: number,
): Promise<{ address: string; jibunAddress: string }> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return { address: "", jibunAddress: "" };
  }

  const params = new URLSearchParams({
    x: String(lng),
    y: String(lat),
    input_coord: "WGS84",
  });

  const response = await fetch(`${KAKAO_COORD2ADDRESS_API}?${params.toString()}`, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return { address: "", jibunAddress: "" };
  }

  const data = (await response.json()) as KakaoCoord2AddressResponse;
  const doc = data.documents?.[0];
  const jibunAddress = doc?.address?.address_name?.trim() ?? "";
  const roadAddress = doc?.road_address?.address_name?.trim() ?? "";

  return {
    address: roadAddress || jibunAddress,
    jibunAddress: jibunAddress || roadAddress,
  };
}
