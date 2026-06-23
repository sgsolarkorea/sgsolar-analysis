/**
 * Step 6.7b — Download and parse HWP/PDF ordinance appendices from law.go.kr.
 */

import { toMarkdown } from "@ohah/hwpjs";
import {
  extractDistancesFromText,
  classifyMatchConfidence,
  SOLAR_DIRECT_KEYWORDS,
} from "./ordinance-distance-parser.mjs";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; SGSolarRegulatoryBot/1.0)",
  Referer: "https://www.law.go.kr/",
  Accept: "*/*",
};

const SOLAR_APPENDIX_TITLE_RE =
  /태양광|태양\s*에너지|신재생|발전시설|개발행위허가|이격거리|허가기준/i;

export function detectAppendixFileType(url, contentType = "") {
  const lower = `${url} ${contentType}`.toLowerCase();
  if (/\.pdf|application\/pdf|%2epdf/.test(lower)) return "pdf";
  if (/\.hwp|application\/hwp|application\/x-hwp|hangul|ole/.test(lower)) return "hwp";
  if (/flDownload\.do/.test(url)) return "hwp";
  return "unknown";
}

export async function downloadAppendixFile(url, timeoutMs = 30000) {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Appendix download HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  const buffer = Buffer.from(await res.arrayBuffer());
  const fileType = detectAppendixFileType(url, contentType);
  return { buffer, contentType, fileType };
}

export function extractTextFromHwp(buffer) {
  const { markdown } = toMarkdown(buffer);
  return markdown ?? "";
}

export function extractTextFromPdf(_buffer) {
  throw new Error("PDF appendix parsing not yet implemented");
}

export function extractAppendixText(buffer, fileType) {
  if (fileType === "hwp") return extractTextFromHwp(buffer);
  if (fileType === "pdf") return extractTextFromPdf(buffer);
  throw new Error(`Unsupported appendix file type: ${fileType}`);
}

export function scoreAppendixRelevance(ref, text) {
  const title = `${ref.title ?? ""} ${ref.referencedByArticle ?? ""}`;
  let score = 0;
  if (SOLAR_APPENDIX_TITLE_RE.test(title)) score += 3;
  if (SOLAR_DIRECT_KEYWORDS.test(text.slice(0, 500))) score += 2;
  if (/태양광\s*발전|태양광\s*등\s*발전|발전시설.*이격|이격거리.*기준/.test(text)) score += 4;
  if (/^\s*\|/.test(text) && /이격|거리|미터/.test(text)) score += 2;
  if (/별표\s*24|별표\s*25|별표\s*26/.test(title)) score += 1;
  return score;
}

export function decodeFlNm(url) {
  const match = url?.match(/flNm=([^&]+)/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]).replace(/\+/g, " ");
  } catch {
    return match[1];
  }
}

export function scoreAppendixRef(ref) {
  const title = `${ref.title ?? ""} ${ref.referencedByArticle ?? ""} ${decodeFlNm(ref.hwpUrl)}`;
  let score = 0;
  if (/태양광|태양\s*에너지|신재생/.test(title)) score += 10;
  if (/이격거리.*기준|발전시설.*이격/.test(title)) score += 8;
  if (/폐차장|고물상|도축장|축사/.test(title)) score -= 8;
  if (/개발행위허가|허가기준|이격거리|특정\s*건축물|공작물/.test(title)) score += 5;
  if (/발전시설/.test(title)) score += 4;
  if (ref.referencedByArticle && /태양|발전|허가기준/.test(ref.referencedByArticle)) score += 4;
  const refNum = Number(ref.referencedAppendixNumber ?? 0);
  if (refNum >= 20) score += 2;
  if (/별표\s*\d+\]\s*~/.test(decodeFlNm(ref.hwpUrl))) score += 3;
  if (/제\d+종.*주거/.test(decodeFlNm(ref.hwpUrl))) score -= 3;
  if (/용지환산|건축할\s*수\s*있는/.test(decodeFlNm(ref.hwpUrl))) score -= 4;
  return score;
}

export function pickAppendixRefsToTry(appendixRefs) {
  const candidates = appendixRefs.filter((r) => r.hwpUrl && !r.hasInlineContent);
  return [...candidates].sort((a, b) => scoreAppendixRef(b) - scoreAppendixRef(a));
}

export function pickBestAppendixRef(appendixRefs) {
  return pickAppendixRefsToTry(appendixRefs)[0] ?? null;
}

export function parseAppendixDistances(text, options = {}) {
  const solarBlocks = extractSolarBlocks(text);
  const combinedDistances = {};
  const allMatches = [];
  const matchedText = [];

  for (const block of solarBlocks) {
    const result = extractDistancesFromText(block, {
      requireSolarContext: false,
      ...options,
    });
    for (const [key, value] of Object.entries(result.extractedDistances)) {
      combinedDistances[key] = Math.max(combinedDistances[key] ?? 0, value);
    }
    allMatches.push(...result.matches);
    matchedText.push(...result.matchedText);
  }

  if (!allMatches.length) {
    const fallback = extractDistancesFromText(text, { requireSolarContext: true });
    for (const [key, value] of Object.entries(fallback.extractedDistances)) {
      combinedDistances[key] = Math.max(combinedDistances[key] ?? 0, value);
    }
    allMatches.push(...fallback.matches);
    matchedText.push(...fallback.matchedText);
  }

  const confidenceSignals = allMatches.map((m) =>
    classifyMatchConfidence(m.sentence, { fromAppendix: true }),
  );

  return {
    extractedDistances: {
      building: combinedDistances.building ?? null,
      residential: combinedDistances.residential ?? null,
      road: combinedDistances.road ?? null,
      river: combinedDistances.river ?? null,
      school: combinedDistances.school ?? null,
      cultural: combinedDistances.cultural ?? null,
    },
    matchedText: [...new Set(matchedText)].slice(0, 12),
    matches: allMatches,
    confidenceSignals,
    distanceCount: Object.values(combinedDistances).filter((v) => v != null).length,
  };
}

function extractSolarBlocks(text) {
  const blocks = [];
  const tableSections = text.split(/(?=\[별표\s*\d+)/);
  for (const section of tableSections) {
    if (!/태양광|태양\s*에너지|신재생|발전시설/.test(section)) continue;
    if (!/이격|직선거리|거리.*(?:안|이내)|미터|km/.test(section)) continue;
    blocks.push(section);
  }

  if (!blocks.length) {
    const lineBlocks = text.split(/\n{2,}/);
    for (const block of lineBlocks) {
      if (/태양광\s*발전|발전시설.*(?:이격|거리)|신재생/.test(block)) {
        blocks.push(block);
      }
    }
  }

  return blocks.length ? blocks : [text];
}

export async function parseAppendixFile(ref) {
  const url = ref.hwpUrl || ref.appendixSourceUrl;
  if (!url) {
    return {
      appendixSourceUrl: null,
      appendixFileType: null,
      appendixParseSuccess: false,
      appendixMatchedText: [],
      error: "No appendix URL",
    };
  }

  try {
    const { buffer, fileType } = await downloadAppendixFile(url);
    const text = extractAppendixText(buffer, fileType);
    const parsed = parseAppendixDistances(text);

    return {
      appendixSourceUrl: url,
      appendixFileType: fileType,
      appendixParseSuccess: text.length > 50,
      appendixMatchedText: parsed.matchedText,
      appendixTextLength: text.length,
      appendixRelevanceScore: scoreAppendixRelevance(ref, text),
      ...parsed,
    };
  } catch (error) {
    return {
      appendixSourceUrl: url,
      appendixFileType: detectAppendixFileType(url),
      appendixParseSuccess: false,
      appendixMatchedText: [],
      error: String(error),
    };
  }
}
