export const VWORLD_DATA_API = "https://api.vworld.kr/req/data";
export const VWORLD_WFS_API = "https://api.vworld.kr/req/wfs";
export const VWORLD_NED_API_BASE = "https://api.vworld.kr/ned/data";

export interface VworldFetchCounter {
  count: number;
}

export interface VworldFetchOptions {
  label: string;
  counter?: VworldFetchCounter;
  timeoutMs?: number;
  maxAttempts?: number;
}

function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

export function getVworldApiKey(): string | null {
  return process.env.VWORLD_API_KEY?.trim() || null;
}

/** VWorld 키 발급 시 등록한 도메인(VWORLD_API_DOMAIN) 우선 */
export function getApiDomainCandidates(): string[] {
  const candidates: string[] = [];
  const add = (value?: string | null) => {
    if (!value) return;
    const normalized = normalizeDomain(value);
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  add(process.env.VWORLD_API_DOMAIN);
  add("sgsolar-analysis.vercel.app");
  add(process.env.VERCEL_URL);
  add("analysis.sgsolar.co.kr");
  add("localhost:3000");

  return candidates;
}

export function buildDataApiParams(apiKey: string, domain: string): URLSearchParams {
  return new URLSearchParams({
    key: apiKey,
    format: "json",
    domain,
    version: "2.0",
  });
}

export function buildNedApiParams(apiKey: string, domain: string): URLSearchParams {
  return new URLSearchParams({
    key: apiKey,
    format: "json",
    domain,
  });
}

function isVworldAuthError(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  const nested = record.landCharacteristicss as { resultCode?: string } | undefined;
  if (nested?.resultCode === "INCORRECT_KEY") return true;
  const response = record.response as { error?: { code?: string; text?: string } } | undefined;
  const resultCode = (record.resultCode ?? response?.error?.code ?? "") as string;
  const text = (record.resultMsg ?? response?.error?.text ?? "") as string;
  return /INCORRECT|AUTH|KEY|인증/i.test(`${resultCode} ${text}`);
}

export async function fetchVworldJson<T>(
  url: string,
  options: VworldFetchOptions,
): Promise<T | null> {
  const maxAttempts = options.maxAttempts ?? 2;
  const timeoutMs = options.timeoutMs ?? 12_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (options.counter) options.counter.count += 1;

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Accept: "application/json",
          Connection: "close",
        },
      });

      if (!response.ok) {
        console.warn(`[VWorld] ${options.label} HTTP ${response.status} (attempt ${attempt})`);
        if (response.status >= 400 && response.status < 500) break;
        continue;
      }

      const data = (await response.json()) as T;
      if (isVworldAuthError(data)) {
        console.warn(`[VWorld] ${options.label} domain/key mismatch`);
        return null;
      }
      return data;
    } catch (error) {
      console.warn(`[VWorld] ${options.label} attempt ${attempt} failed:`, error);
    }
  }

  return null;
}

export async function fetchVworldNed<T>(
  endpoint: string,
  params: URLSearchParams,
  options: VworldFetchOptions,
): Promise<T | null> {
  const apiKey = getVworldApiKey();
  if (!apiKey) return null;

  for (const domain of getApiDomainCandidates()) {
    const query = new URLSearchParams(params);
    query.set("key", apiKey);
    query.set("domain", domain);
    query.set("format", query.get("format") ?? "json");

    const data = await fetchVworldJson<T>(
      `${VWORLD_NED_API_BASE}/${endpoint}?${query.toString()}`,
      options,
    );
    if (data) return data;
  }

  return null;
}

export async function fetchVworldDataFeature<T>(
  params: URLSearchParams,
  options: VworldFetchOptions,
): Promise<T | null> {
  const apiKey = getVworldApiKey();
  if (!apiKey) return null;

  for (const domain of getApiDomainCandidates()) {
    const query = new URLSearchParams(params);
    query.set("key", apiKey);
    query.set("domain", domain);
    query.set("format", query.get("format") ?? "json");
    query.set("version", query.get("version") ?? "2.0");

    const data = await fetchVworldJson<T>(
      `${VWORLD_DATA_API}?${query.toString()}`,
      options,
    );
    if (data) return data;
  }

  return null;
}
