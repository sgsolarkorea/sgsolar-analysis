/**
 * KEPCO 주소 파싱·응답 매핑 단위 테스트 (API 키 불필요)
 * npx tsx scripts/kepco-address-test.mjs
 */
import { parseKepcoAddress } from "../src/lib/grid/kepcoAddress.ts";
import { metroCdFromSigunguCd } from "../src/lib/grid/kepcoRegionCodes.ts";
import {
  mapKepcoItemsForTest,
  selectBestDispersedItem,
} from "../src/lib/grid/kepcoApi.ts";
import { pickDlRemainingMw } from "../src/lib/grid/evaluate.ts";

const TEST_ADDRESS = "충청남도 아산시 염치읍 방현리 258-7";
const TEST_PNU = "4420025031102580007";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const parsed = parseKepcoAddress(TEST_ADDRESS, TEST_PNU);
assert(parsed, "parseKepcoAddress returned null");
assert(parsed.addrLidong === "염치읍", `addrLidong expected 염치읍, got ${parsed.addrLidong}`);
assert(parsed.addrLi === "방현리", `addrLi expected 방현리, got ${parsed.addrLi}`);
assert(parsed.addrJibun === "258-7", `addrJibun expected 258-7, got ${parsed.addrJibun}`);
assert(parsed.sigunguCd === "44200", `sigunguCd expected 44200, got ${parsed.sigunguCd}`);
assert(metroCdFromSigunguCd(parsed.sigunguCd) === "44", "metroCd should be 44");

const mockItems = [
  {
    substNm: "아산변전소",
    mtrNo: "MTR-12",
    dlNm: "염치D/L-01",
    substPwr: 18400,
    mtrPwr: 7300,
    dlPwr: 2100,
    vol1: 6200,
    vol2: 3800,
    vol3: 1800,
    addrLidong: "염치읍",
    addrLi: "방현리",
    addrJibun: "258-7",
  },
  {
    substNm: "아산변전소",
    mtrNo: "MTR-99",
    dlCd: "DL-99",
    substPwr: 10000,
    mtrPwr: 5000,
    dlPwr: 1000,
    vol3: 500,
    addrLidong: "염치읍",
    addrLi: "방현리",
    addrJibun: "258-12",
  },
];

const target = {
  addrLidong: parsed.addrLidong,
  addrLi: parsed.addrLi,
  addrJibun: parsed.addrJibun,
};

const best = selectBestDispersedItem(mockItems, target);
assert(best?.addrJibun === "258-7", "best match should be 258-7");

const poles = mapKepcoItemsForTest(mockItems, TEST_ADDRESS, target);
assert(poles.length >= 1, "expected at least one pole");
assert(poles[0].poleId === "258-7", `poleId expected 258-7, got ${poles[0].poleId}`);
assert(poles[0].substation.name === "아산변전소", "substation name mismatch");
assert(poles[0].distributionLine.remainingMw === 1.8, "D/L remaining should use vol3 (1.8MW)");
assert(pickDlRemainingMw({ vol3: 1800, vol2: 3800, vol1: 6200 }) === 1.8, "vol3 fallback");

console.log("KEPCO address/mapping tests passed");
console.log("Parsed:", parsed);
console.log("Best pole:", poles[0]);
