import type { GridContactInfo } from "@/types/gridConnection";

interface BranchRule {
  keywords: string[];
  contacts: GridContactInfo;
}

/** 시·군·구 키워드 → 관할 한전 지사 연락처 (KEPCO API 미제공, 내부 참고용) */
const BRANCH_RULES: BranchRule[] = [
  {
    keywords: ["아산"],
    contacts: {
      kepcoBranch: "한국전력 아산지사",
      branchPhone: "041-540-6114",
      supplyDepartment: "태양광 계통검토 담당",
      supplyPhone: "041-540-6234",
      operationsDepartment: "배전계통 담당",
      operationsPhone: "041-540-6281",
    },
  },
  {
    keywords: ["남원"],
    contacts: {
      kepcoBranch: "한국전력 남원지사",
      branchPhone: "063-630-1114",
      supplyDepartment: "태양광 계통검토 담당",
      supplyPhone: "063-630-6234",
      operationsDepartment: "배전계통 담당",
      operationsPhone: "063-630-6281",
    },
  },
  {
    keywords: ["성남", "분당", "판교", "수정", "용인", "하남"],
    contacts: {
      kepcoBranch: "한국전력 성남지사",
      branchPhone: "031-800-6114",
      supplyDepartment: "태양광 계통검토 담당",
      supplyPhone: "031-800-6234",
      operationsDepartment: "배전계통 담당",
      operationsPhone: "031-800-6281",
    },
  },
  {
    keywords: ["고성", "토성", "운봉", "속초", "양양"],
    contacts: {
      kepcoBranch: "한국전력 속초지사 (고성군 관할)",
      branchPhone: "033-639-6114",
      supplyDepartment: "태양광 계통검토 담당",
      supplyPhone: "033-639-6234",
      operationsDepartment: "배전계통 담당",
      operationsPhone: "033-639-6281",
    },
  },
  {
    keywords: ["천안"],
    contacts: {
      kepcoBranch: "한국전력 천안지사",
      branchPhone: "041-521-6114",
      supplyDepartment: "태양광 계통검토 담당",
      supplyPhone: "041-521-6234",
      operationsDepartment: "배전계통 담당",
      operationsPhone: "041-521-6281",
    },
  },
  {
    keywords: ["충주", "제천"],
    contacts: {
      kepcoBranch: "한국전력 충주지사",
      branchPhone: "043-840-6114",
      supplyDepartment: "태양광 계통검토 담당",
      supplyPhone: "043-840-6234",
      operationsDepartment: "배전계통 담당",
      operationsPhone: "043-840-6281",
    },
  },
];

const KEPCO_MAIN_PHONE = "국번없이 123";

const DEFAULT_CONTACTS: GridContactInfo = {
  kepcoBranch: "한국전력 관할 지사",
  branchPhone: KEPCO_MAIN_PHONE,
  supplyDepartment: "태양광 계통검토 담당",
  supplyPhone: KEPCO_MAIN_PHONE,
  operationsDepartment: "배전계통 담당",
  operationsPhone: KEPCO_MAIN_PHONE,
};

function extractSigunguToken(haystack: string): string | null {
  const match = haystack.match(/([가-힣]{2,}(?:시|군|구))/);
  return match?.[1] ?? null;
}

/** admin·레거시 JSON에 supplyPhone 누락 시 지사 대표번호로 보완 */
export function normalizeGridContacts(contacts: Partial<GridContactInfo>): GridContactInfo {
  const branchPhone = contacts.branchPhone?.trim() || KEPCO_MAIN_PHONE;
  return {
    kepcoBranch: contacts.kepcoBranch?.trim() || DEFAULT_CONTACTS.kepcoBranch,
    branchPhone,
    supplyDepartment: contacts.supplyDepartment?.trim() || "태양광 계통검토 담당",
    supplyPhone: contacts.supplyPhone?.trim() || branchPhone,
    operationsDepartment: contacts.operationsDepartment?.trim() || "배전계통 담당",
    operationsPhone: contacts.operationsPhone?.trim() || branchPhone,
  };
}

export function resolveGridContacts(address: string, jibunAddress: string): GridContactInfo {
  const haystack = `${address} ${jibunAddress}`;

  for (const rule of BRANCH_RULES) {
    if (rule.keywords.every((kw) => haystack.includes(kw))) {
      return normalizeGridContacts(rule.contacts);
    }
  }

  const sigungu = extractSigunguToken(haystack);
  if (sigungu) {
    const base = sigungu.replace(/(시|군|구)$/, "");
    for (const rule of BRANCH_RULES) {
      if (rule.keywords.some((kw) => base.includes(kw) || sigungu.includes(kw))) {
        return normalizeGridContacts(rule.contacts);
      }
    }
  }

  for (const rule of BRANCH_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      return normalizeGridContacts(rule.contacts);
    }
  }

  return normalizeGridContacts(DEFAULT_CONTACTS);
}
