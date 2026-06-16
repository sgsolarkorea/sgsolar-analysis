import type { GridContactInfo } from "@/types/gridConnection";

interface BranchRule {
  keywords: string[];
  contacts: GridContactInfo;
}

const BRANCH_RULES: BranchRule[] = [
  {
    keywords: ["남원"],
    contacts: {
      kepcoBranch: "한국전력 남원지사",
      branchPhone: "063-630-1114",
      supplyDepartment: "전력공급부",
      operationsDepartment: "계통운영기술부",
      operationsPhone: "063-630-1234",
    },
  },
  {
    keywords: ["성남", "분당", "판교", "수정"],
    contacts: {
      kepcoBranch: "한국전력 성남지사",
      branchPhone: "031-800-6114",
      supplyDepartment: "전력공급부",
      operationsDepartment: "계통운영기술부",
      operationsPhone: "031-800-6200",
    },
  },
  {
    keywords: ["고성", "토성", "운봉"],
    contacts: {
      kepcoBranch: "한국전력 속초지사 (고성군 관할)",
      branchPhone: "033-639-6114",
      supplyDepartment: "전력공급부",
      operationsDepartment: "계통운영기술부",
      operationsPhone: "033-639-6200",
    },
  },
];

const DEFAULT_CONTACTS: GridContactInfo = {
  kepcoBranch: "한국전력 관할 지사 (확인 필요)",
  branchPhone: "국번없이 123",
  supplyDepartment: "전력공급부 / 태양광 계통검토 담당",
  operationsDepartment: "계통운영기술부",
  operationsPhone: "관할 지사 문의",
};

export function resolveGridContacts(address: string, jibunAddress: string): GridContactInfo {
  const haystack = `${address} ${jibunAddress}`;
  for (const rule of BRANCH_RULES) {
    if (rule.keywords.every((kw) => haystack.includes(kw))) {
      return rule.contacts;
    }
  }
  for (const rule of BRANCH_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      return rule.contacts;
    }
  }
  return DEFAULT_CONTACTS;
}
