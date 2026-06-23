/**
 * Extract solar setback distances from official ordinance text blocks.
 */

import { applyDistanceReviewPolicy } from "./ordinance-distance-review.mjs";

export const SOLAR_DIRECT_KEYWORDS = /태양광|태양\s*에너지|신재생\s*에?너지|신재생|태양에너지/i;

const SOLAR_BROAD_KEYWORDS =
  /태양광|태양에너지|발전시설|신재생|재생에너지|발전소|태양\s*에너지|풍력|에너지\s*설비/i;

const GENERIC_POWER_ARTICLE_RE =
  /발전시설\s*등\s*허가기준|고형연료|소각시설|폐기물|자원순환\s*관련\s*시설/i;

const APPENDIX_KEYWORDS = /별표|별첨|부표/i;

function decodeFlNm(url) {
  const match = url?.match(/flNm=([^&]+)/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]).replace(/\+/g, " ");
  } catch {
    return match[1];
  }
}

function extractAppendixNumFromFlNm(url) {
  const name = decodeFlNm(url);
  const m = name.match(/\[?별표\s*(\d+)\]?/);
  return m ? Number(m[1]) : null;
}

function findAppendixByNumber(appendices, refNum) {
  const num = Number(refNum);
  const padded = String(num).padStart(4, "0");

  const byFlNm = appendices.find((a) => extractAppendixNumFromFlNm(a.fileUrl) === num);
  if (byFlNm) return byFlNm;

  let linked = appendices.find(
    (a) =>
      (a.number === padded && extractAppendixNumFromFlNm(a.fileUrl) == null) ||
      a.title.includes(`별표 ${num}`) ||
      a.title.includes(`별표${num}`),
  );
  if (!linked) {
    linked = appendices.find((a) => {
      const label = `${a.title} ${decodeFlNm(a.fileUrl)}`;
      const range = label.match(/\[?별표\s*(\d+)\]?\s*~\s*\[?별표\s*(\d+)\]?/);
      if (!range) return false;
      return num >= Number(range[1]) && num <= Number(range[2]);
    });
  }
  return linked;
}

const UNIT_RE = /(?:m\b|M\b|미터|km\b|킬로미터|meter)/i;

export const DISTANCE_CATEGORIES = {
  building: {
    key: "building",
    label: "건축물",
    patterns: [/건축물/, /건물/, /공작물/],
  },
  residential: {
    key: "residential",
    label: "주거지",
    patterns: [/주거/, /주택/, /주거지역/, /주거밀집/, /주거지/],
  },
  road: {
    key: "road",
    label: "도로",
    patterns: [/도로/, /포장도로/, /법정도로/, /국도/, /지방도/, /진입도로/, /주요도로/],
  },
  river: {
    key: "river",
    label: "하천",
    patterns: [/하천/, /유수/, /저수지/, /수계/, /냇/, /개울/],
  },
  school: {
    key: "school",
    label: "학교",
    patterns: [/학교/, /교육연구/, /교육시설/, /교육.*시설/, /공공시설/],
  },
  cultural: {
    key: "cultural",
    label: "문화재",
    patterns: [/문화재/, /문화\s*및\s*집회/, /역사문화/, /국가유산/, /문화재보호/, /유적/],
  },
};

const DISTANCE_RE = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(?:m\b|M\b|미터|km\b|킬로미터|meter)/gi;
const DISTANCE_TEST_RE = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(?:m\b|M\b|미터|km\b|킬로미터|meter)/i;

const SETBACK_CONTEXT_RE =
  /이격|직선거리|입지(?:하지|하여야)|떨어(?:진|져)|이내|이상|경계(?:로부터|선)|밀집|간격|확보|제한(?:지역)?|반경/;

function parseDistanceMeters(raw, unit = "m") {
  const value = Number(String(raw).replace(/,/g, ""));
  if (/km|킬로/i.test(unit)) return value * 1000;
  return value;
}

function splitSentences(text) {
  const chunks = text
    .split(/(?:\n|<br\s*\/?>|(?<=[다요])\.(?=\s)|(?<=\))\.\s)/)
    .flatMap((chunk) => chunk.split(/(?=\s\d+\.\s)/))
    .map((s) => s.trim())
    .filter(Boolean);
  return chunks;
}

function extractDistanceFromSentence(sentence) {
  if (!SETBACK_CONTEXT_RE.test(sentence)) return null;
  const matches = [...sentence.matchAll(DISTANCE_RE)];
  if (!matches.length) return null;
  const values = matches
    .map((m) => parseDistanceMeters(m[1], m[0]))
    .filter((n) => n >= 10 && n <= 5000);
  if (!values.length) return null;
  return Math.max(...values);
}

function matchCategory(sentence) {
  for (const category of Object.values(DISTANCE_CATEGORIES)) {
    if (category.patterns.some((p) => p.test(sentence))) {
      return category;
    }
  }
  return null;
}

export function isSolarContext(text) {
  return SOLAR_BROAD_KEYWORDS.test(text);
}

export function isDirectSolarContext(text) {
  return SOLAR_DIRECT_KEYWORDS.test(text);
}

export function isGenericPowerFacilityArticle(article) {
  const block = `${article.title} ${article.content}`;
  return GENERIC_POWER_ARTICLE_RE.test(block) && !SOLAR_DIRECT_KEYWORDS.test(block);
}

export function classifyMatchConfidence(sentence, options = {}) {
  const distanceM = options.distanceM;
  const hasSolarKeyword =
    SOLAR_DIRECT_KEYWORDS.test(sentence) ||
    (/발전시설/.test(sentence) && !GENERIC_POWER_ARTICLE_RE.test(sentence));
  const hasDistance = DISTANCE_TEST_RE.test(sentence);
  const hasUnit = UNIT_RE.test(sentence);
  const hasCategory = matchCategory(sentence) != null;
  const hasSetbackContext = SETBACK_CONTEXT_RE.test(sentence);

  let level = "none";
  if (hasSolarKeyword && hasDistance && hasUnit && hasCategory && hasSetbackContext) {
    level = "high";
  } else if (hasDistance && hasUnit && hasCategory && hasSetbackContext) {
    level = "medium";
  } else if (hasDistance || options.appendixOnly) {
    level = "low";
  }

  if (level === "high" && distanceM != null && distanceM >= 1000) {
    level = "medium";
  }
  return level;
}

export function findSolarArticles(articles) {
  return articles.filter((a) => {
    const block = `${a.title} ${a.content}`;
    if (isDirectSolarContext(block)) return true;
    if (/태양광|태양에너지|신재생/.test(a.title)) return true;
    if (/발전시설|태양에너지|태양광/.test(a.title) && !isGenericPowerFacilityArticle(a)) {
      return true;
    }
    if (/별표\s*\d+/.test(a.content) && /이격|허가기준|입지/.test(a.content) && isSolarContext(block)) {
      return true;
    }
    return false;
  });
}

export function findSolarAppendices(appendices) {
  return appendices.filter(
    (a) =>
      SOLAR_BROAD_KEYWORDS.test(`${a.title} ${a.content}`) ||
      (/별표/.test(a.title) && /발전|에너지|허가기준|이격/.test(a.title)),
  );
}

export function extractDistancesFromText(text, options = {}) {
  const { requireSolarContext = true, excludeGenericPower = true } = options;
  const extracted = {};
  const matches = [];

  if (requireSolarContext && !isSolarContext(text)) {
    return { extractedDistances: extracted, matchedText: [], matches };
  }

  if (excludeGenericPower && GENERIC_POWER_ARTICLE_RE.test(text) && !isDirectSolarContext(text)) {
    return { extractedDistances: extracted, matchedText: [], matches };
  }

  for (const sentence of splitSentences(text)) {
    const category = matchCategory(sentence);
    if (!category) continue;
    const distance = extractDistanceFromSentence(sentence);
    if (distance == null) continue;

    const matchConfidence = classifyMatchConfidence(sentence, { distanceM: distance });
    if (matchConfidence === "none") continue;

    const prev = extracted[category.key];
    if (prev == null || distance > prev) {
      extracted[category.key] = distance;
    }
    matches.push({
      category: category.key,
      label: category.label,
      distanceM: distance,
      sentence: sentence.slice(0, 240),
      matchConfidence,
    });
  }

  return {
    extractedDistances: extracted,
    matchedText: matches.map((m) => m.sentence),
    matches,
  };
}

function mergeDistances(target, source, preferSource = false) {
  for (const [key, value] of Object.entries(source)) {
    if (value == null) continue;
    if (preferSource || target[key] == null) {
      target[key] = value;
    } else {
      target[key] = Math.max(target[key], value);
    }
  }
}

export function computeParserConfidence({
  matches = [],
  distanceCount = 0,
  solarArticleCount = 0,
  appendixRefs = [],
  appendixParseResult = null,
  distanceExtractionMethod = "xml",
}) {
  const matchLevels = matches.map((m) => m.matchConfidence ?? classifyMatchConfidence(m.sentence));
  const highMatches = matchLevels.filter((l) => l === "high").length;
  const mediumMatches = matchLevels.filter((l) => l === "medium").length;

  if (appendixParseResult?.appendixParseSuccess && appendixParseResult.distanceCount > 0) {
    const appendixHigh = (appendixParseResult.confidenceSignals ?? []).filter((l) => l === "high").length;
    if (appendixHigh >= 2 || (appendixHigh >= 1 && appendixParseResult.distanceCount >= 2)) {
      return "high";
    }
    if (appendixParseResult.distanceCount >= 1) {
      return appendixHigh > 0 ? "high" : "medium";
    }
  }

  if (highMatches >= 2 || (highMatches >= 1 && distanceCount >= 2)) {
    const hasLongDistance = matches.some((m) => (m.distanceM ?? 0) >= 1000);
    if (!hasLongDistance) return "high";
  }
  if (highMatches >= 1 && distanceCount >= 1) {
    const hasLongDistance = matches.some((m) => (m.distanceM ?? 0) >= 1000);
    if (!hasLongDistance) return "high";
  }
  if (mediumMatches >= 1 && distanceCount >= 1) {
    return "medium";
  }
  if (distanceCount >= 1) {
    return "low";
  }
  if (
    appendixRefs.some((a) => a.hwpUrl && !a.hasInlineContent) ||
    distanceExtractionMethod === "hwp" ||
    distanceExtractionMethod === "pdf"
  ) {
    return "low";
  }
  if (solarArticleCount > 0 || appendixRefs.length > 0) {
    return "low";
  }
  return "none";
}

export function parseOrdinanceDistances({ articles, appendices }, options = {}) {
  const solarArticles = findSolarArticles(articles);
  const solarAppendices = findSolarAppendices(appendices);

  const combinedDistances = {};
  const allMatches = [];
  const matchedSections = [];
  const excludedSections = [];
  const appendixRefs = appendices
    .filter(
      (a) =>
        APPENDIX_KEYWORDS.test(a.title) ||
        solarAppendices.includes(a) ||
        /발전|태양|에너지|허가기준|이격/.test(a.title),
    )
    .map((a) => ({
      title: a.title,
      number: a.number,
      hwpUrl: a.fileUrl || null,
      hasInlineContent: a.hasInlineContent,
    }));

  for (const article of articles) {
    if (isGenericPowerFacilityArticle(article)) {
      const block = `${article.title}\n${article.content}`;
      const probe = extractDistancesFromText(block, {
        requireSolarContext: false,
        excludeGenericPower: false,
      });
      if (probe.matches.length) {
        excludedSections.push({
          type: "article",
          title: article.title,
          articleNumber: article.articleNumber,
          reason: "generic_power_facility_permit_rule_not_solar_specific",
          matchCount: probe.matches.length,
        });
      }
      continue;
    }

    if (!solarArticles.includes(article)) continue;

    const block = `${article.title}\n${article.content}`;
    const result = extractDistancesFromText(block, { requireSolarContext: true });
    if (result.matches.length) {
      matchedSections.push({
        type: "article",
        title: article.title,
        articleNumber: article.articleNumber,
        matchCount: result.matches.length,
      });
    }
    for (const ref of block.matchAll(/별표\s*(\d+)/g)) {
      const refNum = Number(ref[1]);
      const linked = findAppendixByNumber(appendices, ref[1]);
      if (linked && !appendixRefs.some((r) => r.number === linked.number && r.hwpUrl === linked.fileUrl)) {
        appendixRefs.push({
          title: linked.title || decodeFlNm(linked.fileUrl),
          number: linked.number,
          hwpUrl: linked.fileUrl || null,
          hasInlineContent: linked.hasInlineContent,
          referencedByArticle: article.title,
          referencedAppendixNumber: ref[1],
        });
      }
    }
    mergeDistances(combinedDistances, result.extractedDistances);
    allMatches.push(...result.matches);
  }

  for (const appendix of appendices) {
    const flLabel = `${appendix.title} ${decodeFlNm(appendix.fileUrl)}`;
    if (
      /태양광|이격거리/.test(flLabel) &&
      appendix.fileUrl &&
      !appendixRefs.some((r) => r.hwpUrl === appendix.fileUrl)
    ) {
      appendixRefs.push({
        title: appendix.title || decodeFlNm(appendix.fileUrl),
        number: appendix.number,
        hwpUrl: appendix.fileUrl,
        hasInlineContent: appendix.hasInlineContent,
        referencedByArticle: "solar_appendix_discovery",
      });
    }
  }

  for (const appendix of appendices) {
    if (!appendix.hasInlineContent) continue;
    const block = `${appendix.title}\n${appendix.content}`;
    const result = extractDistancesFromText(block, { requireSolarContext: false });
    if (result.matches.length) {
      matchedSections.push({
        type: "appendix",
        title: appendix.title,
        number: appendix.number,
        matchCount: result.matches.length,
      });
    }
    mergeDistances(combinedDistances, result.extractedDistances);
    allMatches.push(...result.matches);
  }

  const solarArticleCount = solarArticles.length;
  const distanceCount = Object.values(combinedDistances).filter((v) => v != null).length;

  const parserConfidence = computeParserConfidence({
    matches: allMatches,
    distanceCount,
    solarArticleCount,
    appendixRefs,
    distanceExtractionMethod: options.distanceExtractionMethod ?? "xml",
  });

  const matchedText = [...new Set(allMatches.map((m) => m.sentence))].slice(0, 12);

  const baseResult = {
    extractedDistances: {
      building: combinedDistances.building ?? null,
      residential: combinedDistances.residential ?? null,
      road: combinedDistances.road ?? null,
      river: combinedDistances.river ?? null,
      school: combinedDistances.school ?? null,
      cultural: combinedDistances.cultural ?? null,
    },
    matchedText,
    matchedSections,
    excludedSections,
    appendixRefs,
    solarArticleCount,
    distanceCount,
    parserConfidence,
    allMatches,
    distanceExtractionMethod: options.distanceExtractionMethod ?? "xml",
  };

  if (options.skipDistanceReview) {
    return baseResult;
  }

  return applyDistanceReviewPolicy(baseResult, {
    sido: options.sido,
    sigungu: options.sigungu,
  });
}
