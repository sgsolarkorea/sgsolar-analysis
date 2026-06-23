import type { KepcoOfficePhoneEntry, KepcoOfficePhoneStatus } from "@/types/kepco";
import contactsData from "@/data/kepco/kepco-on-office-contacts.json";
import { KEPCO_FALLBACK_PHONE } from "@/lib/kepco/inquiryContent";

export const KEPCO_OFFICE_PHONE_SOURCE = contactsData.meta.source;

export const KEPCO_OFFICE_PHONE_LAST_CHECKED = "2026-06-23";

type RawOfficeContact = {
  officeName: string;
  officePhone: string | null;
  officeAddress?: string;
  departmentName?: string | null;
  taskName?: string | null;
  fallbackPhone: string;
  phoneStatus: KepcoOfficePhoneStatus;
  source: string;
  lastCheckedAt: string;
};

function toPhoneEntry(raw: RawOfficeContact): KepcoOfficePhoneEntry {
  return {
    officeName: raw.officeName,
    officePhone: raw.officePhone,
    officeAddress: raw.officeAddress,
    departmentName: raw.departmentName ?? undefined,
    taskName: raw.taskName ?? undefined,
    fallbackPhone: raw.fallbackPhone || KEPCO_FALLBACK_PHONE,
    phoneStatus: raw.phoneStatus,
    source: raw.source,
    lastCheckedAt: raw.lastCheckedAt,
  };
}

const OFFICES = contactsData.offices as Record<string, RawOfficeContact>;

export const KEPCO_OFFICE_PHONE_DB: KepcoOfficePhoneEntry[] = Object.values(OFFICES).map(toPhoneEntry);

const PHONE_BY_OFFICE = new Map(
  KEPCO_OFFICE_PHONE_DB.map((entry) => [entry.officeName, entry]),
);

const OFFICE_PHONE_ALIASES: Record<string, string> = {
  ...(contactsData.aliases as Record<string, string>),
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

export function formatPhoneSourceDetail(entry: KepcoOfficePhoneEntry | null): string | null {
  if (!entry?.officePhone) return null;

  const parts = ["한전ON 사업소정보"];
  if (entry.departmentName) parts.push(entry.departmentName);
  if (entry.taskName) {
    const shortTask =
      entry.taskName.length > 48 ? `${entry.taskName.slice(0, 48)}…` : entry.taskName;
    parts.push(shortTask);
  }

  return `번호 기준: ${parts.join(" · ")}`;
}

export const KEPCO_OFFICE_CONTACT_STATS = contactsData.meta;
