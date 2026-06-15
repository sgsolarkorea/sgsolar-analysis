import { DEFAULT_ADDRESS, result } from "@/data/sampleData";
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
  pnu: string;
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

const KAKAO_ADDRESS_API = "https://dapi.kakao.com/v2/local/search/address.json";
const SUGGESTION_LIMIT = 8;

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
    pnu: result.pnu,
    buildingName: doc.road_address?.building_name ?? "",
    zoneNo: doc.road_address?.zone_no ?? "",
  };
}
