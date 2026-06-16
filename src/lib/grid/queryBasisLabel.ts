import { formatNearbyDistanceKm } from "@/lib/grid/geo";
import type { GridDataSource } from "@/types/gridConnection";

/** 지번 주소에서 "해상리 112" 형태의 짧은 위치 라벨 추출 */
export function extractShortLocationLabel(jibunAddress: string): string | null {
  const trimmed = jibunAddress.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/([가-힣]+(?:리|동|가|읍|면|로|길)?)\s*(\d+(?:-\d+)?)\s*$/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
  }

  return trimmed;
}

export function buildLocationQueryBasisLabel(jibunAddress: string): string {
  const short = extractShortLocationLabel(jibunAddress);
  return short ? `${short} 기준` : "해당 위치 기준";
}

export function buildQueryBasisLabel(
  dataSource: GridDataSource,
  nearbyDistanceKm: number | null | undefined,
  jibunAddress?: string,
): string | null {
  switch (dataSource) {
    case "kepco-api-direct":
      return "해당 위치 기준";
    case "kepco-api-nearby": {
      if (nearbyDistanceKm != null && Number.isFinite(nearbyDistanceKm)) {
        return `인근 ${formatNearbyDistanceKm(nearbyDistanceKm)}km 변압기 기준`;
      }
      return "인근 계통설비 기준";
    }
    case "admin":
    case "none":
      return jibunAddress ? buildLocationQueryBasisLabel(jibunAddress) : "해당 위치 기준";
    default:
      return null;
  }
}

export const NEARBY_GRID_NOTICE =
  "해당 위치의 직접 계통 데이터가 없어 인근 계통설비 기준으로 표시된 참고 정보입니다.";
