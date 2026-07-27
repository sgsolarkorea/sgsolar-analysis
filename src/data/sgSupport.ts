/**
 * SG SOLAR support scope from company profile p06 사업영역.
 * Do not invent services beyond the brochure.
 */

export interface SupportServiceItem {
  id: string;
  title: string;
  description: string;
}

export const SG_SUPPORT_SERVICES: SupportServiceItem[] = [
  {
    id: "epc",
    title: "설계 · 시공",
    description: "모듈배치·구조·전기 설계와 시공까지 일관 진행합니다.",
  },
  {
    id: "permit",
    title: "인허가 · 대관",
    description: "발전사업·개발행위 등 설치에 필요한 대관 업무를 지원합니다.",
  },
  {
    id: "grid",
    title: "계통연계",
    description: "한전 접수·수급지점 협의 등 계통 관련 절차를 함께합니다.",
  },
  {
    id: "smp-rec",
    title: "SMP · REC 운영",
    description: "설비확인 등록과 SMP·REC 발급·정산 업무를 지원합니다.",
  },
  {
    id: "om",
    title: "유지보수 · 리파워링",
    description: "기존 발전소 성능점검·기자재 교체·용량 증설을 검토합니다.",
  },
  {
    id: "consult",
    title: "발전사업 컨설팅",
    description: "상계거래·자가 PPA·사업용 RPS 유형별 사업 방향을 안내합니다.",
  },
];

/** Trust strip facts with brochure basis (회사소개 p04, 사업실적 p47). */
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
