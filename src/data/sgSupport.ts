/**
 * SG SOLAR support — company profile business areas, grouped into 3 categories.
 */

export interface SupportCategory {
  id: string;
  title: string;
  description: string;
  scopes: string[];
}

export const SG_SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: "design-permit",
    title: "설계 · 인허가",
    description: "배치·구조·전기 설계와 발전사업 행정절차 검토를 지원합니다.",
    scopes: ["모듈·구조·전기 설계", "인허가 · 대관"],
  },
  {
    id: "grid-construction",
    title: "계통 · 시공",
    description: "한전 연계 협의부터 구조물·모듈·전기 시공까지 연결합니다.",
    scopes: ["한전 계통연계", "구조물·모듈·전기 시공"],
  },
  {
    id: "operation",
    title: "운영 · 관리",
    description: "설비확인·SMP·REC 운영과 유지관리·리파워링을 지원합니다.",
    scopes: ["SMP · REC 운영", "유지보수 · 리파워링"],
  },
];

export const SG_TRUST_FACTS: { label: string; detail: string }[] = [
  {
    label: "가정용 시공 380개소+",
    detail: "회사소개서 기준 가정용 태양광 시공완료 실적",
  },
  {
    label: "설계 · 인허가 · 시공",
    detail: "조직도상 설계부·인허가팀·시공부 운영",
  },
  {
    label: "상계 · PPA · RPS",
    detail: "사업영역: 상계거래형·자가 PPA·사업용 RPS",
  },
  {
    label: "전국 지사 네트워크",
    detail: "본사(완주) 및 서울·경기·광주·대구·영남·충북 지사",
  },
];

/** @deprecated Prefer SG_SUPPORT_CATEGORIES */
export const SG_SUPPORT_SERVICES = SG_SUPPORT_CATEGORIES.flatMap((cat) =>
  cat.scopes.map((scope, index) => ({
    id: `${cat.id}-${index}`,
    title: scope,
    description: cat.description,
    scopes: [scope],
  })),
);
