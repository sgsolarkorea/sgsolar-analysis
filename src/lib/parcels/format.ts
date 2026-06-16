/** "전라북도 음성군 운봉리 114" → "운봉리114" */
export function formatParcelShortLabel(jibunAddress: string): string {
  const match = jibunAddress.match(/([가-힣]+(?:리|동|가))\s*(\d+(?:-\d+)?)/);
  if (match) return `${match[1]}${match[2]}`;
  const parts = jibunAddress.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}${parts[parts.length - 1]}`;
  }
  return jibunAddress;
}

export function formatAreaSqmLabel(sqm: number): string {
  return `${Math.round(sqm).toLocaleString("ko-KR")}㎡`;
}
