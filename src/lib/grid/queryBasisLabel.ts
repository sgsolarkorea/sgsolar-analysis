import { formatNearbyDistanceKm } from "@/lib/grid/geo";
import type { GridDataSource } from "@/types/gridConnection";

export function buildQueryBasisLabel(
  dataSource: GridDataSource,
  nearbyDistanceKm: number | null | undefined,
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
    default:
      return null;
  }
}

export const NEARBY_GRID_NOTICE =
  "해당 위치의 직접 계통 데이터가 없어 인근 계통설비 기준으로 표시된 참고 정보입니다.";
