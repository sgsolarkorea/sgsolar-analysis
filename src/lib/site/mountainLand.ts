/** 산번지(산 지번) 또는 임야 지목 여부 */
export function isMountainOrForestSite(
  address: string,
  jibunAddress: string,
  landCategory: string,
): boolean {
  if (landCategory === "임야" || landCategory === "임") return true;

  const text = `${address} ${jibunAddress}`;
  const mountainLotPattern = /(?:^|[\s,])산\s*[\d-]|(?:^|[\s,])산\d|-\s*산/;
  return mountainLotPattern.test(text);
}

export const MOUNTAIN_LAND_WARNING_TEXT =
  "본 부지는 산지(임야) 가능성이 확인됩니다.\n\n산지전용허가, 평균경사도, 입목축적, 보전산지 여부에 따라\n\n실제 사업성과 허가 가능 여부가 달라질 수 있습니다.\n\n본 결과는 참고용 1차 검토입니다.";

export const MOUNTAIN_REC_WEIGHT_NOTE = "산지 여부 확인 필요";
