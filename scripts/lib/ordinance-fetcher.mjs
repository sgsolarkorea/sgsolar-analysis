/**
 * Fetch official ordinance body from law.go.kr (ELIS-linked XML).
 */

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; SGSolarRegulatoryBot/1.0)",
  Referer: "https://www.law.go.kr/",
  Accept: "application/xml,text/xml,text/html,*/*",
};

export function extractOrdinSeq(sourceUrl) {
  return sourceUrl.match(/ordinSeq=(\d+)/)?.[1] ?? null;
}

export async function fetchOrdinanceXml(ordinSeq, timeoutMs = 20000) {
  const url = `https://www.law.go.kr/DRF/lawService.do?target=ordin&MST=${ordinSeq}&type=XML`;
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`XML fetch HTTP ${res.status}`);
  }
  return res.text();
}

function decodeCdata(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

export function parseOrdinanceXml(xml) {
  const nameMatch = xml.match(/<자치법규명><!\[CDATA\[([^\]]+)\]\]><\/자치법규명>/);
  const ordinanceName = nameMatch?.[1]?.trim() ?? "";

  const articles = [];
  for (const match of xml.matchAll(
    /<조[^>]*조문번호=['"](\d+)['"][^>]*>[\s\S]*?<조제목><!\[CDATA\[([^\]]*)\]\]><\/조제목>[\s\S]*?<조내용><!\[CDATA\[([\s\S]*?)\]\]><\/조내용>/g,
  )) {
    articles.push({
      articleNumber: match[1],
      title: decodeCdata(match[2]),
      content: decodeCdata(match[3]),
    });
  }

  const appendices = [];
  for (const match of xml.matchAll(/<별표단위[^>]*>([\s\S]*?)<\/별표단위>/g)) {
    const block = match[1];
    const number = block.match(/<별표번호>(\d+)<\/별표번호>/)?.[1] ?? "";
    const titleRaw = block.match(/<별표제목><!\[CDATA\[([^\]]*)\]\]>/)?.[1] ?? "";
    const contentRaw = block.match(/<별표내용>([\s\S]*?)<\/별표내용>/)?.[1] ?? "";
    const content = decodeCdata(
      [...contentRaw.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)]
        .map((m) => m[1])
        .join("\n"),
    );
    const fileUrl = block.match(/<별표첨부파일명><!\[CDATA\[([^\]]*)\]\]>/)?.[1]?.trim() ?? "";
    appendices.push({
      number,
      title: decodeCdata(titleRaw),
      content,
      fileUrl,
      hasInlineContent: content.length > 20,
    });
  }

  return { ordinanceName, articles, appendices, rawLength: xml.length };
}

export async function loadOfficialOrdinance(sourceUrl) {
  const ordinSeq = extractOrdinSeq(sourceUrl);
  if (!ordinSeq) {
    throw new Error("ordinSeq missing in sourceUrl");
  }
  const xml = await fetchOrdinanceXml(ordinSeq);
  const parsed = parseOrdinanceXml(xml);
  return { ordinSeq, xml, ...parsed };
}
