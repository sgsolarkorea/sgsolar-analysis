import { recPrice as fallbackRecPrice, smpPrice as fallbackSmpPrice } from "@/data/solarConfig";

export interface MarketPriceData {
  smpPrice: number;
  recPrice: number;
  smpDate: string;
  recDate: string;
  source: string;
  isFallback: boolean;
}

interface RawMarketJson {
  smp?: { price?: number; date?: string; unit?: string };
  rec?: { price?: number; date?: string; unit?: string };
  smpPrice?: number;
  recPrice?: number;
  smpDate?: string;
  recDate?: string;
  updatedAt?: string;
  source?: string;
  date?: string;
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

function parseMarketPayload(json: RawMarketJson): Omit<MarketPriceData, "isFallback"> | null {
  const smp = parseNumber(json.smp?.price ?? json.smpPrice);
  const rec = parseNumber(json.rec?.price ?? json.recPrice);
  if (smp === null || rec === null || smp <= 0 || rec <= 0) return null;

  const smpDate = json.smp?.date ?? json.smpDate ?? json.updatedAt ?? json.date ?? todayKst();
  const recDate = json.rec?.date ?? json.recDate ?? json.updatedAt ?? json.date ?? todayKst();
  const source = json.source?.trim() || "MARKET_DATA_URL";

  return { smpPrice: smp, recPrice: rec, smpDate, recDate, source };
}

function fallbackMarket(): MarketPriceData {
  const today = todayKst();
  return {
    smpPrice: fallbackSmpPrice,
    recPrice: fallbackRecPrice,
    smpDate: today,
    recDate: today,
    source: "solarConfig.ts fallback",
    isFallback: true,
  };
}

/**
 * SMP/REC 시장단가 조회
 * 1순위: MARKET_DATA_URL (Cloudflare Workers / 자동화 JSON)
 * 실패 시: solarConfig.ts fallback
 */
export async function getMarketPrice(): Promise<MarketPriceData> {
  const url = process.env.MARKET_DATA_URL?.trim();
  if (!url) {
    return fallbackMarket();
  }

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[Market] HTTP ${res.status} from ${url}`);
      return fallbackMarket();
    }

    const json = (await res.json()) as RawMarketJson;
    const parsed = parseMarketPayload(json);
    if (!parsed) {
      console.warn("[Market] Invalid market_data.json structure");
      return fallbackMarket();
    }

    return { ...parsed, isFallback: false };
  } catch (error) {
    console.warn("[Market] Fetch failed, using fallback:", error);
    return fallbackMarket();
  }
}
