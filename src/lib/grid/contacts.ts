import type { GridContactInfo } from "@/types/gridConnection";

interface BranchRule {
  keywords: string[];
  contacts: GridContactInfo;
}

const SUPPLY_ROLE = "전력공급부 담당자";
const OPERATIONS_ROLE = "배전계통 담당자";

/** 시·군·구 키워드 → 관할 한전 지사 연락처 (KEPCO API 미제공, 내부 참고용) */
const BRANCH_RULES: BranchRule[] = [
  {
    keywords: ["전주", "완산", "덕진", "전북"],
    contacts: {
      kepcoBranch: "한국전력 전주지사",
      branchPhone: "063-280-6114",
      supplyDepartment: SUPPLY_ROLE,
      supplyPhone: "063-280-6234",
      operationsDepartment: OPERATIONS_ROLE,
      operationsPhone: "063-280-6281",
    },
  },
  {
    keywords: ["아산"],
    contacts: {
      kepcoBranch: "한국전력 아산지사",
      branchPhone: "041-540-6114",
      supplyDepartment: SUPPLY_ROLE,
      supplyPhone: "041-540-6234",
      operationsDepartment: OPERATIONS_ROLE,
      operationsPhone: "041-540-6281",
    },
  },
  {
    keywords: ["남원"],
    contacts: {
      kepcoBranch: "한국전력 남원지사",
      branchPhone: "063-630-1114",
      supplyDepartment: SUPPLY_ROLE,
      supplyPhone: "063-630-6234",
      operationsDepartment: OPERATIONS_ROLE,
      operationsPhone: "063-630-6281",
    },
  },
  {
    keywords: ["성남", "분당", "판교", "수정", "용인", "하남"],
    contacts: {
      kepcoBranch: "한국전력 성남지사",
      branchPhone: "031-800-6114",
      supplyDepartment: SUPPLY_ROLE,
      supplyPhone: "031-800-6234",
      operationsDepartment: OPERATIONS_ROLE,
      operationsPhone: "031-800-6281",
    },
  },
  {
    keywords: ["고성", "토성", "운봉", "속초", "양양"],
    contacts: {
      kepcoBranch: "한국전력 속초지사 (고성군 관할)",
      branchPhone: "033-639-6114",
      supplyDepartment: SUPPLY_ROLE,
      supplyPhone: "033-639-6234",
      operationsDepartment: OPERATIONS_ROLE,
      operationsPhone: "033-639-6281",
    },
  },
  {
    keywords: ["천안"],
    contacts: {
      kepcoBranch: "한국전력 천안지사",
      branchPhone: "041-521-6114",
      supplyDepartment: SUPPLY_ROLE,
      supplyPhone: "041-521-6234",
      operationsDepartment: OPERATIONS_ROLE,
      operationsPhone: "041-521-6281",
    },
  },
  {
    keywords: ["충주", "제천"],
    contacts: {
      kepcoBranch: "한국전력 충주지사",
      branchPhone: "043-840-6114",
      supplyDepartment: SUPPLY_ROLE,
      supplyPhone: "043-840-6234",
      operationsDepartment: OPERATIONS_ROLE,
      operationsPhone: "043-840-6281",
    },
  },
];

const KEPCO_HOTLINE = "국번없이 123";

const DEFAULT_CONTACTS: GridContactInfo = {
  kepcoBranch: "한국전력 관할 지사",
  branchPhone: KEPCO_HOTLINE,
  supplyDepartment: SUPPLY_ROLE,
  supplyPhone: KEPCO_HOTLINE,
  operationsDepartment: OPERATIONS_ROLE,
  operationsPhone: KEPCO_HOTLINE,
};

function extractSigunguToken(haystack: string): string | null {
  const match = haystack.match(/([가-힣]{2,}(?:시|군|구))/);
  return match?.[1] ?? null;
}

/** admin·레거시 JSON에 supplyPhone 누락 시 지사 대표번호로 보완 */
export function normalizeGridContacts(contacts: Partial<GridContactInfo>): GridContactInfo {
  const branchPhone = contacts.branchPhone?.trim() || DEFAULT_CONTACTS.branchPhone;
  return {
    kepcoBranch: contacts.kepcoBranch?.trim() || DEFAULT_CONTACTS.kepcoBranch,
    branchPhone,
    supplyDepartment: contacts.supplyDepartment?.trim() || SUPPLY_ROLE,
    supplyPhone: contacts.supplyPhone?.trim() || branchPhone,
    operationsDepartment: contacts.operationsDepartment?.trim() || OPERATIONS_ROLE,
    operationsPhone: contacts.operationsPhone?.trim() || branchPhone,
  };
}

export function mergeGridContacts(
  base: GridContactInfo,
  override?: Partial<GridContactInfo>,
): GridContactInfo {
  if (!override) return base;
  return normalizeGridContacts({ ...base, ...override });
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
