/**
 * Step 6.10 — law.go.kr / 공공데이터포털 자치법규 Open API client
 * Env: LAW_API_OC (preferred) or REGULATION_API_KEY
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

const SEARCH_BASE = "https://www.law.go.kr/DRF/lawSearch.do";
const SERVICE_BASE = "https://www.law.go.kr/DRF/lawService.do";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; SGSolarRegulatoryBot/1.0; Step6.10)",
  Referer: "https://www.law.go.kr/",
  Accept: "application/xml,text/xml,text/html,application/json,*/*",
};

let envLoaded = false;

export function loadRegulationEnv() {
  if (envLoaded) return;
  envLoaded = true;
  for (const name of [".env.local", ".env"]) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

export function getRegulationApiKey() {
  loadRegulationEnv();
  return (
    process.env.LAW_API_OC?.trim() ||
    process.env.REGULATION_API_KEY?.trim() ||
    ""
  );
}

export function hasOfficialApiKey() {
  return getRegulationApiKey().length > 0;
}

function buildUrl(base, params) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export function buildApiReference(kind, params) {
  const base = kind === "lawService" ? SERVICE_BASE : SEARCH_BASE;
  const safe = {};
  for (const [key, value] of Object.entries({ ...params })) {
    if (value === undefined || value === null || value === "") continue;
    safe[key] = key === "OC" ? "***" : value;
  }
  return `${base}?${new URLSearchParams(safe).toString()}`;
}

async function fetchText(url, timeoutMs = 25000) {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return { text, url, status: res.status };
}

function isApiErrorResponse(text) {
  return (
    text.includes("<result>") &&
    (text.includes("검증에 실패") ||
      text.includes("필수입력") ||
      text.includes("필수 입력") ||
      text.includes("사용자 정보"))
  );
}

export async function searchOrdinanceList(options = {}) {
  const {
    query = "*",
    org,
    sborg,
    display = 20,
    page = 1,
    search = 1,
    nw = 1,
  } = options;

  const oc = getRegulationApiKey();
  const xmlParams = {
    OC: oc || undefined,
    target: "ordin",
    type: "XML",
    query,
    display,
    page,
    search,
    nw,
    org,
    sborg,
  };

  if (oc) {
    const url = buildUrl(SEARCH_BASE, xmlParams);
    const { text } = await fetchText(url);
    if (!isApiErrorResponse(text)) {
      return {
        mode: "openapi_xml",
        query,
        apiReference: buildApiReference("lawSearch", { ...xmlParams, OC: oc }),
        raw: text,
      };
    }
  }

  const htmlParams = {
    target: "ordin",
    type: "HTML",
    query,
    display,
    page,
    search,
    nw,
    org,
    sborg,
  };
  const htmlUrl = buildUrl(SEARCH_BASE, htmlParams);
  const { text: html } = await fetchText(htmlUrl);
  return {
    mode: "drf_html_fallback",
    query,
    apiReference: buildApiReference("lawSearch", htmlParams),
    raw: html,
  };
}

export async function fetchOrdinanceBody(options = {}) {
  const { mst, id, type = "XML" } = options;
  if (!mst && !id) throw new Error("fetchOrdinanceBody requires mst or id");

  const oc = getRegulationApiKey();
  const params = {
    OC: oc || undefined,
    target: "ordin",
    type,
    MST: mst || undefined,
    ID: id || undefined,
  };

  if (oc) {
    const url = buildUrl(SERVICE_BASE, params);
    const { text } = await fetchText(url);
    if (!isApiErrorResponse(text) && text.includes("LawService")) {
      return {
        mode: "openapi_xml",
        mst: mst ?? null,
        id: id ?? null,
        apiReference: buildApiReference("lawService", { ...params, OC: oc }),
        raw: text,
      };
    }
  }

  const fallbackUrl = buildUrl(SERVICE_BASE, {
    target: "ordin",
    type: "XML",
    MST: mst || undefined,
    ID: id || undefined,
  });
  const { text } = await fetchText(fallbackUrl);
  if (isApiErrorResponse(text) || !text.includes("LawService")) {
    throw new Error(`Ordinance body fetch failed (mst=${mst ?? id})`);
  }
  return {
    mode: "drf_xml_fallback",
    mst: mst ?? null,
    id: id ?? null,
    apiReference: buildApiReference("lawService", {
      target: "ordin",
      type: "XML",
      MST: mst,
      ID: id,
    }),
    raw: text,
  };
}

export async function searchOrdinanceAppendices(options = {}) {
  const {
    query = "*",
    org,
    sborg,
    display = 30,
    page = 1,
    search = 1,
    knd,
    relatedOrdinanceName,
  } = options;

  const searchQuery = relatedOrdinanceName
    ? `${relatedOrdinanceName.split(" ")[0]} ${query}`.trim()
    : query;

  const oc = getRegulationApiKey();
  const xmlParams = {
    OC: oc || undefined,
    target: "ordinbyl",
    type: "XML",
    query: searchQuery,
    display,
    page,
    search,
    org,
    sborg,
    knd,
  };

  if (oc) {
    const url = buildUrl(SEARCH_BASE, xmlParams);
    const { text } = await fetchText(url);
    if (!isApiErrorResponse(text)) {
      return {
        mode: "openapi_xml",
        query: searchQuery,
        apiReference: buildApiReference("lawSearch", { ...xmlParams, OC: oc }),
        raw: text,
      };
    }
  }

  const htmlParams = {
    target: "ordinbyl",
    type: "HTML",
    query: searchQuery,
    display,
    page,
    search,
    org,
    sborg,
    knd,
  };
  const htmlUrl = buildUrl(SEARCH_BASE, htmlParams);
  const { text: html } = await fetchText(htmlUrl);
  return {
    mode: "drf_html_fallback",
    query: searchQuery,
    apiReference: buildApiReference("lawSearch", htmlParams),
    raw: html,
  };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
