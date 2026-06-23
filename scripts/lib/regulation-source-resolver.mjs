/**
 * Resolve official ordinance / guideline names for source search.
 */

const METRO_SIDOS = new Set([
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
]);

export function resolveOrdinanceSearchName(sido, sigungu) {
  if (sido === "세종특별자치시") {
    return "세종특별자치시 도시계획 조례";
  }
  if (sido === "제주특별자치도") {
    return "제주특별자치도 도시계획 조례";
  }
  if (METRO_SIDOS.has(sido)) {
    return `${sido} 도시계획 조례`;
  }
  if (sigungu.endsWith("군")) {
    return `${sigungu} 군계획 조례`;
  }
  return `${sigungu} 도시계획 조례`;
}

/** Alternate ordinance titles to try when the primary slug lookup fails. */
export function resolveOrdinanceSearchAlternates(sido, sigungu) {
  const primary = resolveOrdinanceSearchName(sido, sigungu);
  const alternates = [primary];
  if (sigungu.endsWith("군")) {
    alternates.push(`${sigungu} 도시계획 조례`);
  }
  return [...new Set(alternates)];
}

export function resolveGuidelineSearchName(sigungu) {
  if (!sigungu.endsWith("시") || sigungu === "세종특별자치시") return null;
  return `${sigungu} 개발행위허가 운영지침`;
}

export const PRIORITY_SIDO = ["전라북도", "충청남도", "경상남도"];

export const PRIORITY_SIGUNGU = new Set([
  "군산시",
  "김제시",
  "전주시",
  "부안군",
  "논산시",
  "서산시",
  "사천시",
  "통영시",
  "평택시",
]);

export const GYEONGGI_SOUTH_SIGUNGU = new Set([
  "평택시",
  "안성시",
  "오산시",
  "화성시",
  "용인시",
  "수원시",
  "성남시",
  "김포시",
  "부천시",
  "안양시",
  "군포시",
  "의왕시",
  "시흥시",
  "광명시",
  "하남시",
  "이천시",
  "여주시",
]);

export function isPriorityRegion(sido, sigungu) {
  return (
    PRIORITY_SIDO.includes(sido) ||
    PRIORITY_SIGUNGU.has(sigungu) ||
    (sido === "경기도" && GYEONGGI_SOUTH_SIGUNGU.has(sigungu))
  );
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeTitle(title) {
  return title
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function toLawSlug(name) {
  return name.replace(/\s/g, "");
}

export function buildLawSlugUrl(name) {
  return `https://www.law.go.kr/자치법규/${toLawSlug(name)}`;
}

export function buildOrdinInfoUrl(ordinSeq, useElis = false) {
  const base = `https://www.law.go.kr/LSW/ordinInfoP.do?ordinSeq=${ordinSeq}`;
  return useElis ? `${base}&gubun=ELIS` : base;
}

export async function fetchWithRetry(url, retries = 2, timeoutMs = 15000) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SGSolarRegulatoryBot/1.0)" },
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      const html = await res.text();
      return { res, html };
    } catch (error) {
      lastError = error;
      await sleep(400 * (attempt + 1));
    }
  }
  throw lastError;
}

export async function fetchLawPageTitle(url) {
  try {
    const { res, html } = await fetchWithRetry(url);
    const title = normalizeTitle((html.match(/<title>([^<]+)/i) || [])[1] || "");
    return { ok: res.ok, title, status: res.status, html, finalUrl: res.url };
  } catch (error) {
    return { ok: false, title: "", status: 0, html: "", finalUrl: url, error: String(error) };
  }
}

export function scoreOrdinanceTitle(title, expectedName) {
  if (!title || title.includes("오류")) return -1;
  const core = expectedName.replace(/\s/g, "");
  const titleCore = title.replace(/\s/g, "");
  if (titleCore.includes(core)) return 100;
  const sigungu = expectedName.split(" ")[0];
  if (title.includes(sigungu) && (title.includes("도시계획 조례") || title.includes("군계획 조례"))) {
    return 80;
  }
  if (title.includes(sigungu) && title.includes("조례")) return 50;
  return -1;
}

export function extractOrdinSeq(finalUrl, html) {
  const fromUrl = finalUrl.match(/ordinSeq=(\d+)/);
  if (fromUrl) return fromUrl[1];
  const fromHtml = html.match(/ordinInfoP\.do\?[^"'\\s]*ordinSeq=(\d+)/);
  return fromHtml?.[1] ?? null;
}

export async function resolveViaLawSlug(expectedName) {
  const slugUrl = buildLawSlugUrl(expectedName);
  const page = await fetchLawPageTitle(slugUrl);
  if (!page.ok) {
    return { ok: false, reason: `slug fetch failed (${page.status})` };
  }

  const score = scoreOrdinanceTitle(page.title, expectedName);
  if (score < 50) {
    return { ok: false, reason: `slug title mismatch: ${page.title}` };
  }

  const ordinSeq = extractOrdinSeq(page.finalUrl, page.html);
  if (!ordinSeq) {
    return {
      ok: true,
      sourceUrl: page.finalUrl.startsWith("http") ? page.finalUrl : slugUrl,
      status: "needs_verification",
      sourceOrigin: "law.go.kr",
      notes: "slug URL 확인, ordinSeq 미추출",
    };
  }

  const isElis = /gubun=ELIS|elis\.go\.kr/i.test(page.html + page.finalUrl);
  return {
    ok: true,
    sourceUrl: buildOrdinInfoUrl(ordinSeq, isElis),
    status: score >= 80 ? "source_found" : "needs_verification",
    sourceOrigin: isElis ? "elis.go.kr" : "law.go.kr",
    notes: isElis ? "law.go.kr ELIS 연계 ordinSeq" : "",
  };
}

export function extractLawOrdinanceCandidates(html) {
  const candidates = [];
  for (const match of html.matchAll(/ordinSeq=(\d+)/g)) {
    const seq = match[1];
    candidates.push({
      url: buildOrdinInfoUrl(seq, /gubun=ELIS|gubun%3DELIS/i.test(html)),
      seq,
      isElis: /gubun=ELIS|gubun%3DELIS/i.test(html),
      origin: /gubun=ELIS|gubun%3DELIS/i.test(html) ? "elis.go.kr" : "law.go.kr",
    });
  }
  const seen = new Set();
  return candidates.filter((c) => {
    if (seen.has(c.seq)) return false;
    seen.add(c.seq);
    return true;
  });
}

async function resolveViaDuckDuckGo(expectedName) {
  const query = `site:law.go.kr ordinInfoP ${expectedName}`;
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  let res;
  let html;
  try {
    ({ res, html } = await fetchWithRetry(searchUrl, 1, 10000));
  } catch (error) {
    return { ok: false, reason: `DDG timeout: ${error}` };
  }
  if (!res.ok) return { ok: false, reason: `search HTTP ${res.status}` };

  const candidates = extractLawOrdinanceCandidates(html).slice(0, 4);
  const scored = [];
  for (const candidate of candidates) {
    const page = await fetchLawPageTitle(candidate.url);
    if (!page.ok) continue;
    const score = scoreOrdinanceTitle(page.title, expectedName);
    if (score >= 0) {
      scored.push({
        score: score + (candidate.isElis ? 5 : 0),
        url: candidate.url,
        origin: candidate.origin,
        title: page.title,
      });
    }
    await sleep(150);
  }

  scored.sort(
    (a, b) =>
      b.score - a.score || Number(b.url.match(/ordinSeq=(\d+)/)?.[1] || 0) - Number(a.url.match(/ordinSeq=(\d+)/)?.[1] || 0),
  );
  const best = scored[0];
  if (!best || best.score < 50) return { ok: false, reason: "DDG candidates failed title check" };

  return {
    ok: true,
    sourceUrl: best.url,
    status: best.score >= 80 ? "source_found" : "needs_verification",
    sourceOrigin: best.origin,
    notes: best.score < 80 ? `DDG fallback: ${best.title}` : "DDG fallback",
  };
}

export async function searchOfficialLawUrl(expectedName, cache, delayMs = 250, options = {}) {
  const { allowDdgFallback = true, alternates = [] } = options;
  const names = [expectedName, ...alternates.filter((n) => n !== expectedName)];
  const cacheKey = names.join("||");
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  await sleep(delayMs);

  let result;
  const failures = [];
  try {
    for (const name of names) {
      const slugResult = await resolveViaLawSlug(name);
      if (slugResult.ok) {
        result = {
          sourceUrl: slugResult.sourceUrl,
          status: slugResult.status,
          sourceOrigin: slugResult.sourceOrigin,
          notes: slugResult.notes || (name !== expectedName ? `alternate title: ${name}` : ""),
          matchedName: name,
        };
        break;
      }
      failures.push(`${name}: ${slugResult.reason}`);
    }

    if (!result && allowDdgFallback) {
      const ddgResult = await resolveViaDuckDuckGo(expectedName);
      if (ddgResult.ok) {
        result = {
          sourceUrl: ddgResult.sourceUrl,
          status: ddgResult.status,
          sourceOrigin: ddgResult.sourceOrigin,
          notes: ddgResult.notes || "",
          matchedName: expectedName,
        };
      }
    }

    if (!result) {
      result = {
        sourceUrl: "",
        status: "not_started",
        sourceOrigin: "unknown",
        notes: failures.join(" · "),
        matchedName: expectedName,
      };
    }
  } catch (error) {
    result = {
      sourceUrl: "",
      status: "not_started",
      sourceOrigin: "unknown",
      notes: String(error),
      matchedName: expectedName,
    };
  }

  cache.set(cacheKey, result);
  return result;
}
