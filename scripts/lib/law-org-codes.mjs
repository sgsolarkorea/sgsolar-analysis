/**
 * Step 6.10 — optional org/sborg codes for Open API list filtering
 * Query-only search works without these; codes refine results when available.
 */
export const SIDO_ORG_CODES = {
  서울특별시: "6110000",
  부산광역시: "6260000",
  대구광역시: "6270000",
  인천광역시: "6280000",
  광주광역시: "6290000",
  대전광역시: "6300000",
  울산광역시: "6310000",
  세종특별자치시: "5690000",
  경기도: "6410000",
  강원특별자치도: "6420000",
  충청북도: "6430000",
  충청남도: "6440000",
  전라북도: "6450000",
  전라남도: "6460000",
  경상북도: "6470000",
  경상남도: "6480000",
  제주특별자치도: "6500000",
};

/** regionKey → sborg (시·군·구) — verification set + common priority regions */
export const REGION_SBORG_CODES = {
  "전라북도|전주시": "3680000",
  "충청남도|서산시": "3400000",
  "충청남도|논산시": "3300000",
  "전라북도|군산시": "3500000",
  "충청북도|음성군": "3700000",
  "경기도|평택시": "4122000",
  "경상남도|사천시": "4805000",
  "경상남도|통영시": "4803000",
};

export function resolveOrgCodes(sido, sigungu) {
  const regionKey = `${sido}|${sigungu}`;
  return {
    org: SIDO_ORG_CODES[sido] ?? null,
    sborg: REGION_SBORG_CODES[regionKey] ?? null,
    regionKey,
  };
}

export const VERIFICATION_REGION_KEYS = [
  "전라북도|전주시",
  "충청남도|서산시",
  "충청남도|논산시",
  "전라북도|군산시",
  "충청북도|음성군",
  "경기도|평택시",
  "경상남도|사천시",
  "경상남도|통영시",
];
