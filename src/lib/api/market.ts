import { recPrice as fallbackRecPrice, smpPrice as fallbackSmpPrice } from "@/data/solarConfig";
import { averagePositive } from "@/lib/market/calculateMarketRevenue";
import { isJejuAddress, type SmpRegion } from "@/lib/market/smpRegion";

export interface MarketHistoryPoint {
  date: string;
  smp: number;
  rec: number;
}

export interface MarketPriceData {
  smpPrice: number;
  recPrice: number;
  smpDate: string;
  recDate: string;
  source: string;
  isFallback: boolean;
  smpRegion: SmpRegion;
  smpChange: number | null;
  recChange: number | null;
  history: MarketHistoryPoint[];
  avg30: { smp: number; rec: number; sampleCount: number } | null;
}

interface RawMarketJson {
  smp?: { price?: number; date?: string; unit?: string; change?: number };
  rec?: { price?: number; date?: string; unit?: string; change?: number };
  smpPrice?: number;
  recPrice?: number;
  smpDate?: string;
  recDate?: string;
  mainlandSmp?: number;
  jejuSmp?: number;
  smpMainland?: number;
  smpJeju?: number;
  smpChange?: number;
  recChange?: number;
  updatedAt?: string;
  source?: string;
  date?: string;
  history?: Array<{
    date?: string;
    smp?: number;
    rec?: number;
    mainlandSmp?: number;
    jejuSmp?: number;
  }>;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function todayKst(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

function parseHistory(json: RawMarketJson, preferJeju: boolean): MarketHistoryPoint[] {
  if (!Array.isArray(json.history)) return [];
  const points: MarketHistoryPoint[] = [];
  for (const row of json.history) {
    if (!row?.date) continue;
    const smp =
      parseNumber(
        preferJeju
          ? (row.jejuSmp ?? row.smp)
          : (row.mainlandSmp ?? row.smp),
      ) ?? parseNumber(row.smp);
    const rec = parseNumber(row.rec);
    if (smp === null || rec === null || smp <= 0 || rec <= 0) continue;
    points.push({ date: row.date, smp, rec });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

function buildAvg30(history: MarketHistoryPoint[]): MarketPriceData["avg30"] {
  if (history.length < 5) return null;
  const recent = history.slice(-30);
  const smpAvg = averagePositive(recent.map((p) => p.smp));
  const recAvg = averagePositive(recent.map((p) => p.rec));
  if (!smpAvg || !recAvg) return null;
  if (smpAvg.sampleCount < 5 || recAvg.sampleCount < 5) return null;
  return {
    smp: smpAvg.avg,
    rec: recAvg.avg,
    sampleCount: Math.min(smpAvg.sampleCount, recAvg.sampleCount),
  };
}

function parseMarketPayload(
  json: RawMarketJson,
  options?: { address?: string; jibunAddress?: string },
): Omit<MarketPriceData, "isFallback"> | null {
  const preferJeju = isJejuAddress(options?.address ?? "", options?.jibunAddress);

  const mainland = parseNumber(json.mainlandSmp ?? json.smpMainland);
  const jeju = parseNumber(json.jejuSmp ?? json.smpJeju);
  const unified = parseNumber(json.smp?.price ?? json.smpPrice);

  let smp: number | null = null;
  let smpRegion: SmpRegion = "unified";

  if (preferJeju && jeju !== null && jeju > 0) {
    smp = jeju;
    smpRegion = "jeju";
  } else if (!preferJeju && mainland !== null && mainland > 0) {
    smp = mainland;
    smpRegion = "mainland";
  } else if (unified !== null && unified > 0) {
    smp = unified;
    smpRegion = preferJeju ? "jeju" : "mainland";
  }

  const rec = parseNumber(json.rec?.price ?? json.recPrice);
  if (smp === null || rec === null || smp <= 0 || rec <= 0) return null;

  const smpDate = json.smp?.date ?? json.smpDate ?? json.updatedAt ?? json.date ?? todayKst();
  const recDate = json.rec?.date ?? json.recDate ?? json.updatedAt ?? json.date ?? todayKst();
  const source = json.source?.trim() || "MARKET_DATA_URL";
  const smpChange = parseNumber(json.smp?.change ?? json.smpChange);
  const recChange = parseNumber(json.rec?.change ?? json.recChange);
  const history = parseHistory(json, preferJeju);

  return {
    smpPrice: smp,
    recPrice: rec,
    smpDate,
    recDate,
    source,
    smpRegion,
    smpChange,
    recChange,
    history,
    avg30: buildAvg30(history),
  };
}

function fallbackMarket(options?: { address?: string; jibunAddress?: string }): MarketPriceData {
  const today = todayKst();
  const preferJeju = isJejuAddress(options?.address ?? "", options?.jibunAddress);
  return {
    smpPrice: fallbackSmpPrice,
    recPrice: fallbackRecPrice,
    smpDate: today,
    recDate: today,
    source: "solarConfig.ts fallback",
    isFallback: true,
    // Region reflects site geography even when only a unified fallback price exists.
    smpRegion: preferJeju ? "jeju" : "mainland",
    smpChange: null,
    recChange: null,
    history: [],
    avg30: null,
  };
}

export interface GetMarketPriceOptions {
  address?: string;
  jibunAddress?: string;
}

/**
 * SMP/REC 시장단가 조회
 * 1순위: MARKET_DATA_URL (Cloudflare Workers / 자동화 JSON)
 * 실패 시: solarConfig.ts fallback
 */
export async function getMarketPrice(options?: GetMarketPriceOptions): Promise<MarketPriceData> {
  const url = process.env.MARKET_DATA_URL?.trim();
  if (!url) {
    return fallbackMarket(options);
  }

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[Market] HTTP ${res.status} from ${url}`);
      return fallbackMarket(options);
    }

    const json = (await res.json()) as RawMarketJson;
    const parsed = parseMarketPayload(json, options);
    if (!parsed) {
      console.warn("[Market] Invalid market_data.json structure");
      return fallbackMarket(options);
    }

    return { ...parsed, isFallback: false };
  } catch (error) {
    console.warn("[Market] Fetch failed, using fallback:", error);
    return fallbackMarket(options);
  }
}
