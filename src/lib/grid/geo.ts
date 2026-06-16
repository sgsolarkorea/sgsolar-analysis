/** 두 WGS84 좌표 간 거리(km) — Haversine */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

/** UI 표시용 거리 (소수 1자리) */
export function formatNearbyDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 0.05) return "0.1";
  return (Math.round(km * 10) / 10).toFixed(1);
}

export const NEARBY_SEARCH_RADII_KM = [1, 3, 5] as const;
