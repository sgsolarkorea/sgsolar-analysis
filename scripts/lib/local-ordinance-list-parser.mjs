/**
 * Step 6.10 — parse 자치법규 목록 API (XML/HTML)
 */
import { normalizeTitle } from "./regulation-source-resolver.mjs";

function decodeXmlText(value) {
  if (!value) return "";
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}

function parseXmlListItems(raw) {
  const items = [];
  for (const block of raw.matchAll(/<law[^>]*>([\s\S]*?)<\/law>/gi)) {
    const xml = block[1];
    const get = (tag) => {
      const cdata = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([^\\]]*)\\]\\]><\\/${tag}>`));
      if (cdata) return decodeXmlText(cdata[1]);
      const plain = xml.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`));
      return plain ? decodeXmlText(plain[1]) : "";
    };
    items.push({
      mst: get("자치법규일련번호") || get("법령일련번호") || get("MST"),
      id: get("자치법규ID") || get("법령ID"),
      name: get("자치법규명") || get("법령명한글"),
      orgName: get("지자체기관명") || get("소관부처명"),
      promulgationDate: get("공포일자"),
      enforcementDate: get("시행일자"),
      ordinanceType: get("자치법규종류") || get("자치법규구분"),
      sourceUrl: get("자치법규상세링크") || "",
    });
  }
  return items.filter((item) => item.mst || item.name);
}

function parseHtmlListItems(raw) {
  const items = [];
  for (const match of raw.matchAll(
    /<a[^>]+href="([^"]*lawService\.do[^"]*MST=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const href = match[1].replace(/&amp;/g, "&");
    const mst = match[2];
    const name = normalizeTitle(match[3].replace(/<[^>]+>/g, " "));
    if (!name) continue;
    items.push({
      mst,
      id: null,
      name,
      orgName: "",
      promulgationDate: "",
      enforcementDate: "",
      ordinanceType: "",
      sourceUrl: href.startsWith("http") ? href : `https://www.law.go.kr${href}`,
    });
  }
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.mst}|${item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseOrdinanceListResponse(raw) {
  const isXml = raw.trimStart().startsWith("<?xml") || raw.includes("<LawSearch");
  const totalMatch = raw.match(/<totalCnt>(\d+)<\/totalCnt>/i);
  const items = isXml ? parseXmlListItems(raw) : parseHtmlListItems(raw);
  return {
    totalCnt: totalMatch ? Number(totalMatch[1]) : items.length,
    items,
  };
}

export function scoreOrdinanceListItem(item, expectedName, sigungu) {
  const name = item.name ?? "";
  const normalize = (value) => value.replace(/\s+/g, "").trim();
  const core = normalize(expectedName);
  const nameCore = normalize(name);
  if (nameCore === core) return 120;
  if (nameCore.includes(core) || core.includes(nameCore)) return 110;
  if (name.includes(sigungu) && (name.includes("도시계획") || name.includes("도시 계획") || name.includes("군계획"))) {
    return 100;
  }
  if (name.includes(sigungu) && name.includes("조례")) return 70;
  if (name.includes(sigungu)) return 40;
  return 0;
}

export function pickBestOrdinanceListItem(items, expectedName, sigungu) {
  const scored = items
    .map((item) => ({
      item,
      score: scoreOrdinanceListItem(item, expectedName, sigungu),
    }))
    .filter((row) => row.score >= 70)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.item.mst || 0) - Number(a.item.mst || 0),
    );
  return scored[0]?.item ?? null;
}

export const ORDINANCE_SEARCH_KEYWORD_TIERS = [
  ["도시계획 조례", "군계획 조례"],
  ["개발행위허가", "개발행위허가의 기준"],
  ["태양광", "태양에너지", "발전시설", "신재생에너지"],
];

export function buildOrdinanceSearchQueries(sigungu, primaryName) {
  const queries = new Set([primaryName]);
  for (const tier of ORDINANCE_SEARCH_KEYWORD_TIERS) {
    for (const keyword of tier) {
      queries.add(`${sigungu} ${keyword}`.trim());
    }
  }
  return [...queries];
}
