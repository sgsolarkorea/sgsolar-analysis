import { fetchVworldNed, getVworldApiKey, type VworldFetchCounter } from "@/lib/gis/vworldClient";
import type { LandUseAttrItem, LandUseCategory } from "@/types/siteIntel";

interface LandUseAttrField {
  pnu?: string;
  cnflcAt?: string | number;
  prposAreaDstrcCode?: string;
  prposAreaDstrcCodeNm?: string;
  prposAreaDstrcSeCode?: string;
  prposAreaDstrcSeCodeNm?: string;
  lndpclAr?: string | number;
  rirt?: string | number;
  stdrYear?: string | number;
  stdrMt?: string | number;
  [key: string]: unknown;
}

interface LandUseAttrResponse {
  landUses?: { field?: LandUseAttrField | LandUseAttrField[] };
  landUse?: { field?: LandUseAttrField | LandUseAttrField[] };
  response?: {
    status?: string;
    error?: { code?: string; text?: string };
  };
  resultCode?: string;
  resultMsg?: string;
}

function asFieldArray(field?: LandUseAttrField | LandUseAttrField[]): LandUseAttrField[] {
  if (!field) return [];
  return Array.isArray(field) ? field : [field];
}

function parseNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(num) ? num : undefined;
}

function inferCategory(field: LandUseAttrField): LandUseCategory {
  const seName = String(field.prposAreaDstrcSeCodeNm ?? "").trim();
  if (seName.includes("용도지역")) return "용도지역";
  if (seName.includes("용도지구")) return "용도지구";
  if (seName.includes("용도구역")) return "용도구역";
  if (seName.includes("지구단위")) return "지구단위계획";
  if (seName.includes("도시계획")) return "도시계획시설";

  const cnflcAt = parseNumber(field.cnflcAt);
  if (cnflcAt === 1) return "용도지역";
  if (cnflcAt === 2) return "용도지구";
  if (cnflcAt === 3) return "용도구역";

  const name = String(field.prposAreaDstrcCodeNm ?? "").trim();
  if (/지역$/.test(name) && !/지구|구역/.test(name)) return "용도지역";
  if (/지구$/.test(name)) return "용도지구";
  if (/구역$/.test(name)) return "용도구역";

  return "기타";
}

function normalizeName(field: LandUseAttrField): string {
  const name = String(field.prposAreaDstrcCodeNm ?? field.prposAreaDstrcCode ?? "").trim();
  if (!name || name === "지정되지않음") return "";
  return name;
}

function fieldToItem(field: LandUseAttrField): LandUseAttrItem | null {
  const name = normalizeName(field);
  if (!name) return null;

  const raw: Record<string, string> = {};
  for (const [key, value] of Object.entries(field)) {
    if (value === undefined || value === null) continue;
    raw[key] = String(value);
  }

  return {
    name,
    category: inferCategory(field),
    code: field.prposAreaDstrcCode ? String(field.prposAreaDstrcCode) : undefined,
    conflictLevel: parseNumber(field.cnflcAt),
    areaSqm: parseNumber(field.lndpclAr),
    areaRatio: parseNumber(field.rirt),
    raw,
  };
}

function dedupeItems(items: LandUseAttrItem[]): LandUseAttrItem[] {
  const seen = new Set<string>();
  const result: LandUseAttrItem[] = [];

  for (const item of items) {
    const key = `${item.category}:${item.name}:${item.code ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

export interface FetchLandUseAttrResult {
  items: LandUseAttrItem[];
  errors: string[];
}

export async function fetchLandUseAttrByPnu(
  pnu: string,
  counter?: VworldFetchCounter,
): Promise<FetchLandUseAttrResult> {
  if (!getVworldApiKey()) {
    return { items: [], errors: ["VWORLD_API_KEY not configured"] };
  }

  if (!pnu) {
    return { items: [], errors: ["PNU is required"] };
  }

  const params = new URLSearchParams({
    pnu,
    numOfRows: "1000",
    pageNo: "1",
  });

  const data = await fetchVworldNed<LandUseAttrResponse>("getLandUseAttr", params, {
    label: "getLandUseAttr",
    counter,
  });

  if (!data) {
    return { items: [], errors: ["getLandUseAttr request failed"] };
  }

  const responseError = data.response?.error?.text;
  if (responseError) {
    return { items: [], errors: [responseError] };
  }

  const fields = [
    ...asFieldArray(data.landUses?.field),
    ...asFieldArray(data.landUse?.field),
  ];

  const items = dedupeItems(
    fields.map(fieldToItem).filter((item): item is LandUseAttrItem => item != null),
  );

  if (items.length === 0 && fields.length === 0) {
    return { items: [], errors: ["getLandUseAttr returned no fields"] };
  }

  return { items, errors: [] };
}

export function summarizeLandUseItems(items: LandUseAttrItem[]): {
  zoning: string[];
  districts: string[];
  zones: string[];
  other: string[];
} {
  const zoning: string[] = [];
  const districts: string[] = [];
  const zones: string[] = [];
  const other: string[] = [];

  for (const item of items) {
    switch (item.category) {
      case "용도지역":
        zoning.push(item.name);
        break;
      case "용도지구":
        districts.push(item.name);
        break;
      case "용도구역":
        zones.push(item.name);
        break;
      default:
        other.push(item.name);
        break;
    }
  }

  return { zoning, districts, zones, other };
}
