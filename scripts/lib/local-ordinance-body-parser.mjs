/**
 * Step 6.10 — parse 자치법규 본문 API response
 */
import { parseOrdinanceXml } from "./ordinance-fetcher.mjs";
import { extractOrdinSeq } from "./ordinance-fetcher.mjs";

export { parseOrdinanceXml, extractOrdinSeq };

export function buildOrdinInfoUrl(mst, useElis = true) {
  const base = `https://www.law.go.kr/LSW/ordinInfoP.do?ordinSeq=${mst}`;
  return useElis ? `${base}&gubun=ELIS` : base;
}

export function parseOrdinanceBodyResponse(raw, { mst, apiReference, mode }) {
  const parsed = parseOrdinanceXml(raw);
  return {
    ...parsed,
    ordinSeq: mst,
    xml: raw,
    sourceUrl: buildOrdinInfoUrl(mst, true),
    openapiBodyReference: apiReference,
    openapiBodyMode: mode,
  };
}

export function findSolarRelatedArticles(articles) {
  const solarRe =
    /태양광|태양\s*에너지|신재생\s*에?너지|발전시설|개발행위허가의?\s*기준/i;
  return articles.filter(
    (article) => solarRe.test(`${article.title} ${article.content}`),
  );
}

export function extractAppendixReferencesFromArticles(articles) {
  const refs = [];
  const re = /\[?별표\s*(\d+)\]?/g;
  for (const article of articles) {
    const text = `${article.title}\n${article.content}`;
    for (const match of text.matchAll(re)) {
      refs.push({
        number: match[1],
        referencedByArticle: article.title || `제${article.articleNumber}조`,
      });
    }
  }
  const seen = new Set();
  return refs.filter((ref) => {
    const key = ref.number;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
