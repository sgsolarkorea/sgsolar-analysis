import type { KepcoOfficePhoneEntry } from "@/types/kepco";
import { KEPCO_FALLBACK_PHONE } from "@/lib/kepco/inquiryContent";

/**
 * 한전 지사 대표번호 DB (Step 5.3)
 * 출처: 공공데이터포털 「한국전력공사_한전ON 사업소정보」(2024-09-13, 수정 2025-09-11)
 * 실시간 크롤링 없이 공식 개방 데이터 기준으로 수동 적재합니다.
 */
export const KEPCO_OFFICE_PHONE_SOURCE =
  "공공데이터포털 한전ON 사업소정보 (2024-09-13)";

export const KEPCO_OFFICE_PHONE_LAST_CHECKED = "2025-09-11";

export const KEPCO_OFFICE_PHONE_DB: KepcoOfficePhoneEntry[] = [
  {
    officeName: "통영지사",
    officePhone: "055-640-2212",
    fallbackPhone: KEPCO_FALLBACK_PHONE,
    phoneStatus: "official_page",
    source: KEPCO_OFFICE_PHONE_SOURCE,
    lastCheckedAt: KEPCO_OFFICE_PHONE_LAST_CHECKED,
    departmentNote: "고객지원부 · 전기사용신청",
  },
  {
    officeName: "사천지사",
    officePhone: "055-830-3212",
    fallbackPhone: KEPCO_FALLBACK_PHONE,
    phoneStatus: "official_page",
    source: KEPCO_OFFICE_PHONE_SOURCE,
    lastCheckedAt: KEPCO_OFFICE_PHONE_LAST_CHECKED,
    departmentNote: "고객지원부 · 전기사용신청",
  },
  {
    officeName: "논산지사",
    officePhone: "041-746-2212",
    fallbackPhone: KEPCO_FALLBACK_PHONE,
    phoneStatus: "official_page",
    source: KEPCO_OFFICE_PHONE_SOURCE,
    lastCheckedAt: KEPCO_OFFICE_PHONE_LAST_CHECKED,
    departmentNote: "고객지원부 · 영업/신규",
  },
  {
    officeName: "서산지사",
    officePhone: "041-660-8225",
    fallbackPhone: KEPCO_FALLBACK_PHONE,
    phoneStatus: "official_page",
    source: KEPCO_OFFICE_PHONE_SOURCE,
    lastCheckedAt: KEPCO_OFFICE_PHONE_LAST_CHECKED,
    departmentNote: "고객지원부 · 전기사용신청",
  },
  {
    officeName: "목포지사",
    officePhone: "061-270-2223",
    fallbackPhone: KEPCO_FALLBACK_PHONE,
    phoneStatus: "official_page",
    source: KEPCO_OFFICE_PHONE_SOURCE,
    lastCheckedAt: KEPCO_OFFICE_PHONE_LAST_CHECKED,
    departmentNote: "고객지원부 · 전기사용신청",
  },
  {
    officeName: "평택지사",
    officePhone: "031-650-4322",
    fallbackPhone: KEPCO_FALLBACK_PHONE,
    phoneStatus: "official_page",
    source: KEPCO_OFFICE_PHONE_SOURCE,
    lastCheckedAt: KEPCO_OFFICE_PHONE_LAST_CHECKED,
    departmentNote: "고객지원부 · 신증설/영업",
  },
  {
    officeName: "전주지사",
    officePhone: "063-249-5233",
    fallbackPhone: KEPCO_FALLBACK_PHONE,
    phoneStatus: "official_page",
    source: KEPCO_OFFICE_PHONE_SOURCE,
    lastCheckedAt: KEPCO_OFFICE_PHONE_LAST_CHECKED,
    departmentNote: "남전주지사 고객지원부 · 고압 신증설",
  },
  {
    officeName: "남전주지사",
    officePhone: "063-249-5233",
    fallbackPhone: KEPCO_FALLBACK_PHONE,
    phoneStatus: "official_page",
    source: KEPCO_OFFICE_PHONE_SOURCE,
    lastCheckedAt: KEPCO_OFFICE_PHONE_LAST_CHECKED,
    departmentNote: "고객지원부 · 고압 신증설",
  },
  {
    officeName: "군산지사",
    officePhone: "063-440-2233",
    fallbackPhone: KEPCO_FALLBACK_PHONE,
    phoneStatus: "official_page",
    source: KEPCO_OFFICE_PHONE_SOURCE,
    lastCheckedAt: KEPCO_OFFICE_PHONE_LAST_CHECKED,
    departmentNote: "고객지원부 · 영업일반",
  },
  {
    officeName: "김제지사",
    officePhone: "063-540-2234",
    fallbackPhone: KEPCO_FALLBACK_PHONE,
    phoneStatus: "official_page",
    source: KEPCO_OFFICE_PHONE_SOURCE,
    lastCheckedAt: KEPCO_OFFICE_PHONE_LAST_CHECKED,
    departmentNote: "고객지원부 · 고압 신규/증설",
  },
];

const PHONE_BY_OFFICE = new Map(
  KEPCO_OFFICE_PHONE_DB.map((entry) => [entry.officeName, entry]),
);

/** 전주지사 registry명 → 한전ON 남전주지사 번호 */
const OFFICE_PHONE_ALIASES: Record<string, string> = {
  전주지사: "남전주지사",
};

export function lookupKepcoOfficePhone(officeName: string): KepcoOfficePhoneEntry | null {
  const direct = PHONE_BY_OFFICE.get(officeName);
  if (direct) return direct;

  const aliasTarget = OFFICE_PHONE_ALIASES[officeName];
  if (aliasTarget) {
    return PHONE_BY_OFFICE.get(aliasTarget) ?? null;
  }

  return null;
}

export function formatOfficePhoneDisplay(phone: string | null): string {
  return phone?.trim() ? phone : "확인 필요";
}
