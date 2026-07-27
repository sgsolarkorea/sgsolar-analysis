import { unavailableBuildingInfo } from "@/lib/api/infoFallbacks";
import { parsePnu } from "@/lib/api/pnu";
import type { InfoField } from "@/types/siteReview";

const HUB_BASE_URL = "https://apis.data.go.kr/1613000/BldRgstHubService";

export interface BuildingInfoInput {
  pnu: string | null;
  buildingName?: string;
}

interface BuildingTitleItem {
  mainPurpsCdNm?: string;
  main_purps_cd_nm?: string;
  etcPurps?: string;
  etc_purps?: string;
  strctCdNm?: string;
  strct_cd_nm?: string;
  archArea?: string | number;
  arch_area?: string | number;
  totArea?: string | number;
  tot_area?: string | number;
  grndFlrCnt?: string | number;
  grnd_flr_cnt?: string | number;
  ugrndFlrCnt?: string | number;
  ugrnd_flr_cnt?: string | number;
  useAprDay?: string;
  use_aprv_date?: string;
  roofCdNm?: string;
  roof_cd_nm?: string;
  etcRoof?: string;
  etc_roof?: string;
  bldNm?: string;
  bld_nm?: string;
  mainBldNm?: string;
  main_bld_nm?: string;
}

interface BuildingTitleResponse {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      totalCount?: number | string;
      items?: {
        item?: BuildingTitleItem | BuildingTitleItem[];
      };
    };
  };
}

function getServiceKey(): string | null {
  return process.env.DATA_GO_KR_SERVICE_KEY?.trim() || null;
}

function getServiceKeyVariants(): string[] {
  const raw = getServiceKey();
  if (!raw) return [];

  const variants = new Set<string>([raw]);

  try {
    const decoded = decodeURIComponent(raw);
    if (decoded !== raw) variants.add(decoded);
    variants.add(encodeURIComponent(decoded));
  } catch {
    variants.add(encodeURIComponent(raw));
  }

  return [...variants];
}

function pickField(item: BuildingTitleItem, ...keys: (keyof BuildingTitleItem)[]): string {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function parseNumericField(item: BuildingTitleItem, ...keys: (keyof BuildingTitleItem)[]): number {
  const value = pickField(item, ...keys).replace(/,/g, "");
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function sumNumericFields(items: BuildingTitleItem[], ...keys: (keyof BuildingTitleItem)[]): string {
  const sum = items.reduce((total, item) => total + parseNumericField(item, ...keys), 0);
  return sum > 0 ? String(Math.round(sum * 100) / 100) : "";
}

function formatArea(value: string): string {
  if (!value) return "확인 필요";
  const num = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(num) || num <= 0) return value;
  return `${num.toLocaleString("ko-KR")}㎡`;
}

function formatUseApprovalDate(value: string): string {
  if (!value) return "확인 필요";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  }
  return value;
}

function formatFloorCount(value: string): string {
  if (!value) return "확인 필요";
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return `${num}층`;
}

function formatRoofType(item: BuildingTitleItem): string {
  const roof = pickField(item, "roofCdNm", "roof_cd_nm");
  const etcRoof = pickField(item, "etcRoof", "etc_roof");
  if (roof && etcRoof && etcRoof !== roof) return `${roof} (${etcRoof})`;
  return roof || etcRoof || "확인 필요";
}

function formatBuildingUse(item: BuildingTitleItem): string {
  const main = pickField(item, "mainPurpsCdNm", "main_purps_cd_nm");
  const etc = pickField(item, "etcPurps", "etc_purps");
  if (main && etc && etc !== main) return `${main} (${etc})`;
  return main || etc || "확인 필요";
}

const LEGACY_BASE_URL = "https://apis.data.go.kr/1613000/BldRgstService_v2";
const LEGACY_V1_BASE_URL = "https://apis.data.go.kr/1611000/BldRgstService";

function buildApiUrls(endpoint: string, params: Record<string, string>): string[] {
  const keys = getServiceKeyVariants();
  if (keys.length === 0) return [];

  const query = new URLSearchParams({
    _type: "json",
    ...params,
  }).toString();

  const bases = [HUB_BASE_URL, LEGACY_BASE_URL, LEGACY_V1_BASE_URL];
  const urls: string[] = [];

  for (const base of bases) {
    for (const serviceKey of keys) {
      urls.push(`${base}/${endpoint}?serviceKey=${serviceKey}&${query}`);
      urls.push(`${base}/${endpoint}?ServiceKey=${serviceKey}&${query}`);
    }
  }

  return urls;
}

async function requestTitleInfo(url: string): Promise<BuildingTitleItem[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    const text = await response.text();

    if (!response.ok) {
      console.warn(`[BuildingRegistry] HTTP ${response.status}:`, text.slice(0, 200));
      return null;
    }

    try {
      const data = JSON.parse(text) as BuildingTitleResponse;
      return extractItems(data);
    } catch {
      console.warn("[BuildingRegistry] Non-JSON response:", text.slice(0, 200));
      return null;
    }
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    console.warn(`[BuildingRegistry] ${aborted ? "timeout" : "fetch failed"}:`, aborted ? url.slice(0, 120) : error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractItems(data: BuildingTitleResponse): BuildingTitleItem[] {
  const header = data.response?.header;
  if (header?.resultCode && header.resultCode !== "00") {
    console.warn("[BuildingRegistry] API header error:", header.resultMsg);
    return [];
  }

  const totalCount = Number(data.response?.body?.totalCount ?? 0);
  if (!totalCount) return [];

  const raw = data.response?.body?.items?.item;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function pickBestBuilding(
  items: BuildingTitleItem[],
  buildingName?: string,
): BuildingTitleItem | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];

  const target = buildingName?.trim();
  if (target) {
    const matched = items.find((item) => {
      const names = [
        pickField(item, "bldNm", "bld_nm"),
        pickField(item, "mainBldNm", "main_bld_nm"),
      ].filter(Boolean);
      return names.some((name) => name.includes(target) || target.includes(name));
    });
    if (matched) return matched;
  }

  const representative = items.reduce((best, current) => {
    const bestArea = Number(pickField(best, "totArea", "tot_area").replace(/,/g, "") || "0");
    const currentArea = Number(pickField(current, "totArea", "tot_area").replace(/,/g, "") || "0");
    return currentArea > bestArea ? current : best;
  });

  return {
    ...representative,
    archArea: sumNumericFields(items, "archArea", "arch_area"),
    totArea: sumNumericFields(items, "totArea", "tot_area"),
  };
}

function mapBuildingToFields(item: BuildingTitleItem): InfoField[] {
  return [
    {
      label: "건물 용도",
      value: formatBuildingUse(item),
      status: "상담 시 확인",
    },
    {
      label: "구조",
      value: pickField(item, "strctCdNm", "strct_cd_nm") || "확인 필요",
      status: "상담 시 확인",
    },
    {
      label: "건축면적",
      value: formatArea(pickField(item, "archArea", "arch_area")),
      status: "상담 시 확인",
    },
    {
      label: "연면적",
      value: formatArea(pickField(item, "totArea", "tot_area")),
      status: "상담 시 확인",
    },
    {
      label: "지상층수",
      value: formatFloorCount(pickField(item, "grndFlrCnt", "grnd_flr_cnt")),
      status: "상담 시 확인",
    },
    {
      label: "사용승인일",
      value: formatUseApprovalDate(pickField(item, "useAprDay", "use_aprv_date")),
      status: "상담 시 확인",
    },
    {
      label: "지붕형태",
      value: formatRoofType(item),
      status: "추가 확인 필요",
    },
  ];
}

async function fetchTitleInfo(parsed: ReturnType<typeof parsePnu>): Promise<BuildingTitleItem[]> {
  if (!parsed) return [];

  const params = {
    sigunguCd: parsed.sigunguCd,
    bjdongCd: parsed.bjdongCd,
    platGbCd: parsed.platGbCd,
    bun: parsed.bun,
    ji: parsed.ji,
    numOfRows: "100",
    pageNo: "1",
  };

  if (!getServiceKey()) {
    console.warn("[BuildingRegistry] DATA_GO_KR_SERVICE_KEY missing — building info unavailable");
    return [];
  }

  const urls = buildApiUrls("getBrTitleInfo", params);
  for (const url of urls) {
    const items = await requestTitleInfo(url);
    // null = transport/HTTP failure → try next URL
    // [] = authoritative empty for this endpoint → stop (do not fan out all key/base variants)
    // non-empty = success
    if (items === null) continue;
    return items;
  }

  return [];
}

export async function getBuildingRegistryLookup(
  input: BuildingInfoInput,
): Promise<{ fields: InfoField[]; itemCount: number }> {
  if (!input.pnu) {
    console.warn("[BuildingRegistry] PNU missing — building info unavailable");
    return { fields: unavailableBuildingInfo(), itemCount: 0 };
  }

  const parsed = parsePnu(input.pnu);
  if (!parsed) {
    console.warn("[BuildingRegistry] Invalid PNU — building info unavailable:", input.pnu);
    return { fields: unavailableBuildingInfo(), itemCount: 0 };
  }

  try {
    const items = await fetchTitleInfo(parsed);
    const selected = pickBestBuilding(items, input.buildingName);

    if (!selected) {
      console.warn("[BuildingRegistry] No building found for PNU — building info unavailable", {
        pnu: input.pnu,
        sigunguCd: parsed.sigunguCd,
        bjdongCd: parsed.bjdongCd,
        bun: parsed.bun,
        ji: parsed.ji,
      });
      return { fields: unavailableBuildingInfo(), itemCount: items.length };
    }

    const archArea = pickField(selected, "archArea", "arch_area");
    console.info(
      "[BuildingRegistry] Success",
      JSON.stringify({
        pnu: input.pnu,
        archArea,
        buildingUse: pickField(selected, "mainPurpsCdNm", "main_purps_cd_nm"),
        itemCount: items.length,
        archAreas: items.map((item) => parseNumericField(item, "archArea", "arch_area")),
      }),
    );

    return { fields: mapBuildingToFields(selected), itemCount: items.length };
  } catch (error) {
    console.error("[BuildingRegistry] Lookup failed:", error);
    return { fields: unavailableBuildingInfo(), itemCount: 0 };
  }
}

export async function getBuildingRegistryItemCount(pnu: string | null): Promise<number> {
  const result = await getBuildingRegistryLookup({ pnu });
  return result.itemCount;
}

export async function getBuildingInfoByRegistry(
  input: BuildingInfoInput,
): Promise<InfoField[]> {
  const result = await getBuildingRegistryLookup(input);
  return result.fields;
}
