/**
 * 한전ON 사업소정보 CSV → 시·군·구 registry JSON
 * Usage: node scripts/build-kepco-office-registry.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CSV_PATH = path.join(ROOT, "scripts", "tmp-kepco-on-offices.csv");
const OUT_PATH = path.join(ROOT, "src", "data", "kepco", "kepco-office-region-registry.json");

const SOURCE = "한전ON 관할구역";
const DATA_SOURCE = "한국전력공사_한전ON 사업소정보_20240913";
const GENERATED_AT = "2026-06-23";

const METRO_SIDOS = new Set([
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
]);

const SIDO_FROM_TEXT = [
  ["서울특별시", "서울특별시"],
  ["서울시", "서울특별시"],
  ["부산광역시", "부산광역시"],
  ["부산시", "부산광역시"],
  ["대구광역시", "대구광역시"],
  ["인천광역시", "인천광역시"],
  ["광주광역시", "광주광역시"],
  ["대전광역시", "대전광역시"],
  ["울산광역시", "울산광역시"],
  ["세종특별자치시", "세종특별자치시"],
  ["경기도", "경기도"],
  ["강원특별자치도", "강원특별자치도"],
  ["강원도", "강원특별자치도"],
  ["충청북도", "충청북도"],
  ["충북", "충청북도"],
  ["충청남도", "충청남도"],
  ["충남", "충청남도"],
  ["전라북도", "전라북도"],
  ["전북특별자치도", "전라북도"],
  ["전북", "전라북도"],
  ["전라남도", "전라남도"],
  ["전남", "전라남도"],
  ["경상북도", "경상북도"],
  ["경북", "경상북도"],
  ["경상남도", "경상남도"],
  ["경남", "경상남도"],
  ["제주특별자치도", "제주특별자치도"],
  ["제주도", "제주특별자치도"],
];

const SIGUNGU_SIDO = {
  수원시: "경기도", 성남시: "경기도", 고양시: "경기도", 용인시: "경기도", 부천시: "경기도",
  안산시: "경기도", 안양시: "경기도", 남양주시: "경기도", 화성시: "경기도", 평택시: "경기도",
  의정부시: "경기도", 시흥시: "경기도", 파주시: "경기도", 광주시: "경기도", 김포시: "경기도",
  군포시: "경기도", 광명시: "경기도", 하남시: "경기도", 오산시: "경기도", 이천시: "경기도",
  안성시: "경기도", 의왕시: "경기도", 양주시: "경기도", 포천시: "경기도", 여주시: "경기도",
  과천시: "경기도", 연천군: "경기도", 가평군: "경기도", 양평군: "경기도",
  춘천시: "강원특별자치도", 원주시: "강원특별자치도", 강릉시: "강원특별자치도", 동해시: "강원특별자치도",
  속초시: "강원특별자치도", 삼척시: "강원특별자치도", 태백시: "강원특별자치도",
  홍천군: "강원특별자치도", 횡성군: "강원특별자치도", 영월군: "강원특별자치도", 평창군: "강원특별자치도",
  정선군: "강원특별자치도", 철원군: "강원특별자치도", 화천군: "강원특별자치도", 양구군: "강원특별자치도",
  인제군: "강원특별자치도", 고성군: "강원특별자치도", 양양군: "강원특별자치도",
  청주시: "충청북도", 충주시: "충청북도", 제천시: "충청북도", 보은군: "충청북도", 옥천군: "충청북도",
  영동군: "충청북도", 증평군: "충청북도", 진천군: "충청북도", 괴산군: "충청북도", 음성군: "충청북도",
  단양군: "충청북도",
  천안시: "충청남도", 공주시: "충청남도", 보령시: "충청남도", 아산시: "충청남도", 서산시: "충청남도",
  논산시: "충청남도", 계룡시: "충청남도", 당진시: "충청남도", 금산군: "충청남도", 부여군: "충청남도",
  서천군: "충청남도", 청양군: "충청남도", 홍성군: "충청남도", 예산군: "충청남도", 태안군: "충청남도",
  전주시: "전라북도", 군산시: "전라북도", 익산시: "전라북도", 정읍시: "전라북도", 남원시: "전라북도",
  김제시: "전라북도", 완주군: "전라북도", 진안군: "전라북도", 무주군: "전라북도", 장수군: "전라북도",
  임실군: "전라북도", 순창군: "전라북도", 고창군: "전라북도", 부안군: "전라북도",
  목포시: "전라남도", 여수시: "전라남도", 순천시: "전라남도", 나주시: "전라남도", 광양시: "전라남도",
  담양군: "전라남도", 곡성군: "전라남도", 구례군: "전라남도", 고흥군: "전라남도", 보성군: "전라남도",
  화순군: "전라남도", 장흥군: "전라남도", 강진군: "전라남도", 해남군: "전라남도", 영암군: "전라남도",
  무안군: "전라남도", 함평군: "전라남도", 영광군: "전라남도", 장성군: "전라남도", 완도군: "전라남도",
  진도군: "전라남도", 신안군: "전라남도",
  창원시: "경상남도", 진주시: "경상남도", 통영시: "경상남도", 사천시: "경상남도", 김해시: "경상남도",
  밀양시: "경상남도", 거제시: "경상남도", 양산시: "경상남도", 의령군: "경상남도", 함안군: "경상남도",
  창녕군: "경상남도", 고성군: "경상남도", 남해군: "경상남도", 하동군: "경상남도", 산청군: "경상남도",
  함양군: "경상남도", 거창군: "경상남도", 합천군: "경상남도",
  포항시: "경상북도", 경주시: "경상북도", 김천시: "경상북도", 안동시: "경상북도", 구미시: "경상북도",
  영주시: "경상북도", 영천시: "경상북도", 상주시: "경상북도", 문경시: "경상북도", 경산시: "경상북도",
  군위군: "경상북도", 의성군: "경상북도", 청송군: "경상북도", 영양군: "경상북도", 영덕군: "경상북도",
  청도군: "경상북도", 고령군: "경상북도", 성주군: "경상북도", 칠곡군: "경상북도", 예천군: "경상북도",
  봉화군: "경상북도", 울진군: "경상북도", 울릉군: "경상북도",
  제주시: "제주특별자치도", 서귀포시: "제주특별자치도",
};

const INVALID_TOKENS = new Set([
  "본부", "지사", "전역", "전지역", "일부", "제외", "한정", "고객", "전력", "직할",
]);

const EXCLUDED_OFFICE = /본부직할|디지털|기획|전력관리|전력사업|전력지사$/;

const SIDO_SIGUNGU_BLOCKLIST = new Set([
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시", "울산광역시",
  "세종특별자치시", "제주특별자치도", "강원특별자치도", "경기도", "충청북도", "충청남도",
  "전라북도", "전라남도", "경상북도", "경상남도",
]);

function isValidSigungu(name) {
  if (INVALID_TOKENS.has(name)) return false;
  if (SIDO_SIGUNGU_BLOCKLIST.has(name)) return false;
  if (/(?:특별시|광역시|특별자치)/.test(name)) return false;
  return /^[가-힣]{1,6}구$|^[가-힣]{2,6}(?:시|군)$/.test(name);
}

function inferSidoFromText(text) {
  for (const [prefix, sido] of SIDO_FROM_TEXT) {
    if (text.includes(prefix)) return sido;
  }
  return null;
}

function inferSidoForSigungu(sigungu, jurisdiction, officeAddress) {
  if (sigungu === "광주시") {
    if (/경기/.test(jurisdiction) || /경기/.test(officeAddress)) return "경기도";
    if (/광주광역/.test(jurisdiction) || /광주광역/.test(officeAddress)) return "광주광역시";
  }
  if (sigungu === "고성군") {
    if (/경남|경상남도/.test(jurisdiction) || /경남|경상남도/.test(officeAddress)) return "경상남도";
    if (/강원/.test(jurisdiction) || /강원/.test(officeAddress)) return "강원특별자치도";
  }
  if (SIGUNGU_SIDO[sigungu]) return SIGUNGU_SIDO[sigungu];
  return inferSidoFromText(officeAddress) ?? inferSidoFromText(jurisdiction);
}

function officeTier(officeName) {
  if (officeName.endsWith("지사")) return 3;
  if (officeName.endsWith("본부") && !officeName.includes("직할")) return 2;
  return 1;
}

function isCustomerOffice(officeName) {
  if (EXCLUDED_OFFICE.test(officeName)) return false;
  if (officeName.endsWith("지사")) return true;
  if (officeName.endsWith("본부") && !officeName.includes("직할")) return true;
  return false;
}

function isAmbiguousJurisdiction(jurisdiction) {
  return /일부|제외|한정|분기|\(\s*[^)]*(?:제외|일부)/.test(jurisdiction);
}

function regionKey({ sido, sigungu, gu }) {
  return `${sido}|${sigungu}|${gu ?? ""}`;
}

function extractFromAddress(officeAddress) {
  const sido = inferSidoFromText(officeAddress);
  if (!sido) return [];

  const regions = [];
  const metroGu = officeAddress.match(/(?:특별시|광역시)\s+([가-힣]+구)/);
  if (metroGu && METRO_SIDOS.has(sido)) {
    regions.push({
      sido,
      sigungu: metroGu[1],
      matchLevel: "gu",
      confidence: "official_area",
    });
    return regions;
  }

  const sigunguMatch = officeAddress.match(/([가-힣]{2,5}(?:시|군))/);
  if (sigunguMatch) {
    regions.push({
      sido,
      sigungu: sigunguMatch[1],
      matchLevel: "sigungu",
      confidence: "official_area",
    });
  }
  return regions;
}

function extractRegions(jurisdiction, officeAddress) {
  const ambiguous = isAmbiguousJurisdiction(jurisdiction);
  const baseConfidence = ambiguous ? "needs_verification" : "official_area";
  const officeSido = inferSidoFromText(officeAddress);
  const contextSido = inferSidoFromText(jurisdiction) ?? officeSido;
  const regions = [];
  const seen = new Set();

  const add = (sido, sigungu, matchLevel, confidence = baseConfidence) => {
    if (!sido || !sigungu || !isValidSigungu(sigungu)) return;
    const key = regionKey({ sido, sigungu });
    if (seen.has(key)) return;
    seen.add(key);
    regions.push({ sido, sigungu, matchLevel, confidence });
  };

  for (const m of jurisdiction.matchAll(
    /(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시)\s+((?:[가-힣]+구\s*)+)/g,
  )) {
    for (const gu of m[2].match(/[가-힣]+구/g) ?? []) add(m[1], gu, "gu");
  }

  for (const m of jurisdiction.matchAll(/(?:서울시|서울특별시)\s+([가-힣]+구)/g)) {
    add("서울특별시", m[1], "gu");
  }

  for (const m of jurisdiction.matchAll(/(?:부산시|부산광역시)\s+([가-힣]+구)/g)) {
    add("부산광역시", m[1], "gu");
  }

  for (const m of jurisdiction.matchAll(/(?:울산시|울산광역시)[^가-힣]*([가-힣]+구)/g)) {
    add("울산광역시", m[1], "gu");
  }

  for (const m of jurisdiction.matchAll(/(?:대전광역시|대전시)\s+([가-힣]+구(?:\s+[가-힣]+구)*)/g)) {
    for (const gu of m[1].match(/[가-힣]+구/g) ?? []) add("대전광역시", gu, "gu");
  }

  for (const m of jurisdiction.matchAll(/([가-힣]{2,5}(?:시|군))\s*전(?:역|지역)/g)) {
    const sigungu = m[1];
    add(inferSidoForSigungu(sigungu, jurisdiction, officeAddress), sigungu, "sigungu");
  }

  for (const m of jurisdiction.matchAll(/(?:^|[\s,，(])([가-힣]{2,5}(?:시|군))(?:\s|일부|전역|,|$|\))/g)) {
    const sigungu = m[1];
    if (INVALID_TOKENS.has(sigungu) || !isValidSigungu(sigungu)) continue;
    const sido = inferSidoForSigungu(sigungu, jurisdiction, officeAddress);
    if (sido && !METRO_SIDOS.has(sido)) add(sido, sigungu, "sigungu");
  }

  const metroSido =
    contextSido && METRO_SIDOS.has(contextSido)
      ? contextSido
      : officeSido && METRO_SIDOS.has(officeSido)
        ? officeSido
        : null;

  if (metroSido) {
    for (const m of jurisdiction.matchAll(/(?:^|[\s,，(])([가-힣]{1,6}구)(?:\s|일부|전역|,|$|\))/g)) {
      add(metroSido, m[1], "gu");
    }
    for (const m of jurisdiction.matchAll(/\(([^(]*)\)/g)) {
      for (const gu of m[1].match(/[가-힣]+구/g) ?? []) {
        if (isValidSigungu(gu)) add(metroSido, gu, "gu", "needs_verification");
      }
    }
  } else if (contextSido === "대구광역시" || officeSido === "대구광역시") {
    for (const m of jurisdiction.matchAll(/(?:^|[\s,，(])([가-힣]{1,6}구)(?:\s|일부|전역|,|$|\))/g)) {
      add("대구광역시", m[1], "gu");
    }
    for (const m of jurisdiction.matchAll(/\(([^(]*)\)/g)) {
      for (const gu of m[1].match(/[가-힣]+구/g) ?? []) {
        if (isValidSigungu(gu)) add("대구광역시", gu, "gu", "needs_verification");
      }
    }
  }

  for (const r of extractFromAddress(officeAddress)) {
    add(r.sido, r.sigungu, r.matchLevel, r.confidence);
  }

  return regions;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length !== 10) continue;
    rows.push({
      officeName: cols[1],
      officeAddress: cols[2],
      jurisdiction: cols[4]?.trim() ?? "",
    });
  }
  return rows;
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Missing CSV: ${CSV_PATH}`);
    process.exit(1);
  }

  const text = new TextDecoder("euc-kr").decode(fs.readFileSync(CSV_PATH));
  const rows = parseCsv(text);

  /** @type {Map<string, { offices: Map<string, { tier: number, count: number }>, confidence: string, jurisdictionSample: string }>} */
  const regionMap = new Map();

  for (const row of rows) {
    if (!isCustomerOffice(row.officeName)) continue;
    const regions = row.jurisdiction
      ? extractRegions(row.jurisdiction, row.officeAddress)
      : extractFromAddress(row.officeAddress);

    for (const region of regions) {
      const key = regionKey(region);
      let bucket = regionMap.get(key);
      if (!bucket) {
        bucket = {
          offices: new Map(),
          confidence: region.confidence,
          jurisdictionSample: (row.jurisdiction || row.officeAddress).slice(0, 120),
        };
        regionMap.set(key, bucket);
      }

      const tier = officeTier(row.officeName);
      const prev = bucket.offices.get(row.officeName) ?? { tier, count: 0 };
      prev.count += 1;
      bucket.offices.set(row.officeName, prev);

      if (region.confidence === "needs_verification") bucket.confidence = "needs_verification";
    }
  }

  let conflictCount = 0;
  const entries = [];

  for (const [key, bucket] of regionMap) {
    const [sido, sigungu] = key.split("|");
    if (!isValidSigungu(sigungu)) continue;
    const ranked = [...bucket.offices.entries()].sort((a, b) => {
      const tierDiff = b[1].tier - a[1].tier;
      if (tierDiff !== 0) return tierDiff;
      return b[1].count - a[1].count;
    });

    const topTier = ranked[0][1].tier;
    const topOffices = ranked.filter(([, v]) => v.tier === topTier);
    let confidence = bucket.confidence;
    let officeName = ranked[0][0];

    if (topOffices.length > 1) {
      confidence = "needs_verification";
      conflictCount += 1;
    }

    const isMetroGu = METRO_SIDOS.has(sido);
    entries.push({
      sido,
      sigungu,
      officeName,
      matchLevel: isMetroGu ? "gu" : "sigungu",
      confidence,
      source: SOURCE,
      registryOrigin: "auto",
      jurisdictionSample: bucket.jurisdictionSample,
    });
  }

  entries.sort((a, b) =>
    `${a.sido}${a.sigungu}`.localeCompare(`${b.sido}${b.sigungu}`, "ko"),
  );

  const output = {
    meta: {
      source: DATA_SOURCE,
      generatedAt: GENERATED_AT,
      entryCount: entries.length,
      conflictRegionCount: conflictCount,
    },
    entries,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Entries: ${entries.length}, conflicts: ${conflictCount}`);
  console.log(`Coverage vs 229 sigungu: ${((entries.length / 229) * 100).toFixed(1)}%`);
}

main();
