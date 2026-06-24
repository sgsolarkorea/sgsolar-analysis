/**
 * Step 6.10 — parse 별표·서식(자치법규) 목록 API response
 */
import { normalizeTitle } from "./regulation-source-resolver.mjs";

const SOLAR_APPENDIX_RE =
  /태양광|태양\s*에너지|발전시설|신재생|이격거리|개발행위.*허가/i;

function parseXmlAppendixItems(raw) {
  const items = [];
  for (const block of raw.matchAll(/<ordinbyl[^>]*>([\s\S]*?)<\/ordinbyl>/gi)) {
    const xml = block[1];
    const get = (tag) => {
      const cdata = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([^\\]]*)\\]\\]><\\/${tag}>`));
      if (cdata) return cdata[1].trim();
      const plain = xml.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`));
      return plain ? plain[1].trim() : "";
    };
    items.push({
      appendixSeq: get("별표일련번호"),
      relatedMst: get("관련자치법규일련번호"),
      title: get("별표명"),
      relatedOrdinanceName: get("관련자치법규명"),
      appendixNumber: get("별표번호"),
      appendixKind: get("별표종류"),
      orgName: get("지자체기관명") || get("전체기관명"),
      fileUrl: get("별표서식파일링크"),
      detailUrl: get("별표자치법규상세링크"),
    });
  }
  return items.filter((item) => item.title || item.appendixSeq);
}

function parseHtmlAppendixItems(raw) {
  const items = [];
  for (const match of raw.matchAll(
    /<a[^>]+href="([^"]*target=ordinbyl[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const href = match[1].replace(/&amp;/g, "&");
    const title = normalizeTitle(match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
    if (!title || title.length < 4) continue;
    if (!SOLAR_APPENDIX_RE.test(title)) continue;

    const rowContext = raw.slice(
      Math.max(0, match.index - 400),
      Math.min(raw.length, match.index + 800),
    );
    const fileMatch = rowContext.match(/href="([^"]*flDownload[^"]*)"/i);

    items.push({
      appendixSeq: href.match(/[&?]ID=(\d+)/)?.[1] ?? null,
      relatedMst: href.match(/MST=(\d+)/)?.[1] ?? null,
      title,
      relatedOrdinanceName: "",
      appendixNumber: title.match(/\[?별표\s*(\d+)\]?/i)?.[1] ?? "",
      appendixKind: title.includes("서식") ? "서식" : "별표",
      orgName: "",
      fileUrl: fileMatch
        ? fileMatch[1].startsWith("http")
          ? fileMatch[1]
          : `https://www.law.go.kr${fileMatch[1].replace(/&amp;/g, "&")}`
        : null,
      detailUrl: href.startsWith("http") ? href : `https://www.law.go.kr${href}`,
    });
  }
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.title}|${item.detailUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseAppendixListResponse(raw) {
  const isXml = raw.trimStart().startsWith("<?xml");
  const totalMatch = raw.match(/<totalCnt>(\d+)<\/totalCnt>/i);
  const items = isXml ? parseXmlAppendixItems(raw) : parseHtmlAppendixItems(raw);
  return {
    totalCnt: totalMatch ? Number(totalMatch[1]) : items.length,
    items,
  };
}

export function filterSolarAppendixCandidates(items, { sigungu, relatedMst } = {}) {
  return items.filter((item) => {
    const title = item.title ?? "";
    if (!SOLAR_APPENDIX_RE.test(title)) return false;
    if (sigungu && title.includes(sigungu)) return true;
    if (relatedMst && item.relatedMst === String(relatedMst)) return true;
    if (item.relatedOrdinanceName?.includes(sigungu)) return true;
    return !sigungu;
  });
}

export function toAppendixRefs(items, limit = 12) {
  return items.slice(0, limit).map((item, index) => ({
    title: item.title,
    number: item.appendixNumber || undefined,
    hwpUrl: item.fileUrl || null,
    hasInlineContent: false,
    referencedAppendixNumber: item.appendixNumber || undefined,
    openapiAppendixSeq: item.appendixSeq || undefined,
    id: item.appendixSeq || `openapi-appendix-${index}`,
  }));
}

export const APPENDIX_SEARCH_QUERIES = [
  "태양광",
  "태양광 발전시설",
  "발전시설 허가기준",
  "이격거리",
  "신재생에너지",
];
