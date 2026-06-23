import type { KepcoOfficeRegistryEntry, KepcoOfficeRegistryOrigin } from "@/types/kepco";
import autoRegistryData from "@/data/kepco/kepco-office-region-registry.json";
import {
  KEPCO_DEPARTMENT_HINT,
  KEPCO_OFFICE_SOURCE,
} from "@/lib/kepco/inquiryContent";

export const KEPCO_AUTO_REGISTRY_SOURCE = "한전ON 관할구역";

const DEFAULT_ENTRY = {
  departmentHint: KEPCO_DEPARTMENT_HINT,
  source: KEPCO_OFFICE_SOURCE,
  registryOrigin: "manual" as const,
} as const;

function regionKey(
  entry: Pick<KepcoOfficeRegistryEntry, "sido" | "sigungu" | "gu" | "eupmyeon" | "dong">,
): string {
  return `${entry.sido}|${entry.sigungu}|${entry.gu ?? ""}|${entry.eupmyeon ?? ""}|${entry.dong ?? ""}`;
}

/** Step 5.1 — 수동 검증 override (읍·면·구 포함) */
export const MANUAL_KEPCO_OFFICE_REGISTRY: KepcoOfficeRegistryEntry[] = [
  // ── 경상남도 ──
  {
    sido: "경상남도",
    sigungu: "사천시",
    officeName: "사천지사",
    matchLevel: "sigungu",
    confidence: "region_match",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "경상남도",
    sigungu: "사천시",
    eupmyeon: "정동면",
    officeName: "사천지사",
    matchLevel: "eupmyeon",
    confidence: "region_match",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "경상남도",
    sigungu: "통영시",
    officeName: "통영지사",
    matchLevel: "sigungu",
    confidence: "region_match",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "경상남도",
    sigungu: "통영시",
    eupmyeon: "산양읍",
    officeName: "통영지사",
    matchLevel: "eupmyeon",
    confidence: "region_match",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "경상남도",
    sigungu: "진주시",
    officeName: "진주지사",
    matchLevel: "sigungu",
    confidence: "region_match",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "경상남도",
    sigungu: "창원시",
    officeName: "창원지사",
    matchLevel: "sigungu",
    confidence: "needs_verification",
    verificationNote: "창원시 내 구·지역별 관할 분기가 다를 수 있어 세부 관할 확인이 필요합니다.",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "경상남도",
    sigungu: "창원시",
    gu: "마산합포구",
    officeName: "마산지사",
    matchLevel: "gu",
    confidence: "needs_verification",
    verificationNote: "마산합포구 관할은 한전 사업소 확인 후 배전운영부 연결을 권장합니다.",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "경상남도",
    sigungu: "창원시",
    gu: "마산회원구",
    officeName: "마산지사",
    matchLevel: "gu",
    confidence: "needs_verification",
    verificationNote: "마산회원구 관할은 한전 사업소 확인 후 배전운영부 연결을 권장합니다.",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "경상남도",
    sigungu: "창원시",
    gu: "성산구",
    officeName: "창원지사",
    matchLevel: "gu",
    confidence: "needs_verification",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "경상남도",
    sigungu: "창원시",
    gu: "의창구",
    officeName: "창원지사",
    matchLevel: "gu",
    confidence: "needs_verification",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "경상남도",
    sigungu: "창원시",
    gu: "진해구",
    officeName: "진해지사",
    matchLevel: "gu",
    confidence: "needs_verification",
    verificationNote: "진해구 관할은 한전 사업소 확인 후 배전운영부 연결을 권장합니다.",
    ...DEFAULT_ENTRY,
  },

  // ── 전라남도 ──
  {
    sido: "전라남도",
    sigungu: "목포시",
    officeName: "목포지사",
    matchLevel: "sigungu",
    confidence: "region_match",
    ...DEFAULT_ENTRY,
  },

  // ── 충청남도 ──
  {
    sido: "충청남도",
    sigungu: "논산시",
    officeName: "논산지사",
    matchLevel: "sigungu",
    confidence: "region_match",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "충청남도",
    sigungu: "논산시",
    eupmyeon: "부적면",
    officeName: "논산지사",
    matchLevel: "eupmyeon",
    confidence: "region_match",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "충청남도",
    sigungu: "서산시",
    officeName: "서산지사",
    matchLevel: "sigungu",
    confidence: "region_match",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "충청남도",
    sigungu: "서산시",
    eupmyeon: "대산읍",
    officeName: "서산지사",
    matchLevel: "eupmyeon",
    confidence: "region_match",
    ...DEFAULT_ENTRY,
  },

  // ── 전라북도 ──
  {
    sido: "전라북도",
    sigungu: "군산시",
    officeName: "군산지사",
    matchLevel: "sigungu",
    confidence: "region_match",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "전라북도",
    sigungu: "김제시",
    officeName: "김제지사",
    matchLevel: "sigungu",
    confidence: "region_match",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "전라북도",
    sigungu: "전주시",
    officeName: "전주지사",
    matchLevel: "sigungu",
    confidence: "needs_verification",
    verificationNote: "전주시 내 구·지역별 관할 분기 확인이 필요할 수 있습니다.",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "전라북도",
    sigungu: "전주시",
    gu: "완산구",
    officeName: "전주지사",
    matchLevel: "gu",
    confidence: "needs_verification",
    verificationNote: "완산구 관할은 한전 사업소 확인 후 배전운영부 연결을 권장합니다.",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "전라북도",
    sigungu: "전주시",
    gu: "덕진구",
    officeName: "전주지사",
    matchLevel: "gu",
    confidence: "needs_verification",
    verificationNote: "덕진구 관할은 한전 사업소 확인 후 배전운영부 연결을 권장합니다.",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "전라북도",
    sigungu: "부안군",
    officeName: "관할 사업소 확인 필요",
    matchLevel: "sigungu",
    confidence: "unknown",
    verificationNote: "부안군은 정읍지사·군산지사 등 관할 분기 확인이 필요합니다.",
    ...DEFAULT_ENTRY,
  },

  // ── 경기도 ──
  {
    sido: "경기도",
    sigungu: "평택시",
    officeName: "평택지사",
    matchLevel: "sigungu",
    confidence: "region_match",
    ...DEFAULT_ENTRY,
  },
  {
    sido: "경기도",
    sigungu: "평택시",
    eupmyeon: "청북읍",
    officeName: "평택지사",
    matchLevel: "eupmyeon",
    confidence: "region_match",
    ...DEFAULT_ENTRY,
  },
];

type AutoRegistryEntry = Omit<KepcoOfficeRegistryEntry, "departmentHint"> & {
  registryOrigin: KepcoOfficeRegistryOrigin;
  jurisdictionSample?: string;
};

const manualKeys = new Set(MANUAL_KEPCO_OFFICE_REGISTRY.map(regionKey));

const AUTO_KEPCO_OFFICE_REGISTRY: KepcoOfficeRegistryEntry[] = (
  autoRegistryData.entries as AutoRegistryEntry[]
)
  .filter((entry) => !manualKeys.has(regionKey(entry)))
  .map((entry) => ({
    ...entry,
    departmentHint: KEPCO_DEPARTMENT_HINT,
    registryOrigin: "auto" as const,
    source: entry.source ?? KEPCO_AUTO_REGISTRY_SOURCE,
  }));

export const KEPCO_OFFICE_REGISTRY: KepcoOfficeRegistryEntry[] = [
  ...MANUAL_KEPCO_OFFICE_REGISTRY,
  ...AUTO_KEPCO_OFFICE_REGISTRY,
];

export const KEPCO_OFFICE_REGISTRY_STATS = {
  manualCount: MANUAL_KEPCO_OFFICE_REGISTRY.length,
  autoCount: AUTO_KEPCO_OFFICE_REGISTRY.length,
  totalCount: KEPCO_OFFICE_REGISTRY.length,
  autoMeta: autoRegistryData.meta,
};
