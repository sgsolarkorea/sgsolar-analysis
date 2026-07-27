/**
 * Business roadmaps sourced from company profile PDF
 * (2026 신재생에너지 한국태양광 에스지솔라 회사소개서).
 *
 * Source pages (viewer numbering):
 * - p10: 가정용 상계거래형 태양광 프로세스
 * - p15: 자가 PPA 태양광 프로세스 (internal 14)
 * - p20: 사업용 RPS 태양광 프로세스 (internal 19)
 */

export type BusinessRoadmapKind = "rps" | "net_metering" | "ppa" | "general";

export interface RoadmapDetailStep {
  title: string;
  items: string[];
}

export interface RoadmapPhase {
  id: string;
  number: string;
  title: string;
  summary: string[];
  /** Highlights current result position when true */
  current?: boolean;
  statusLabel?: string;
}

export interface BusinessRoadmapDefinition {
  kind: BusinessRoadmapKind;
  label: string;
  sourcePage: number;
  sourceTitle: string;
  durationNote?: string;
  phases: RoadmapPhase[];
  detailSteps: RoadmapDetailStep[];
}

/** Viewer p10 — 가정용 상계거래형 태양광 프로세스 (10 steps → 6 phases) */
export const NET_METERING_ROADMAP: BusinessRoadmapDefinition = {
  kind: "net_metering",
  label: "가정용 상계거래",
  sourcePage: 10,
  sourceTitle: "가정용 상계거래형 태양광 프로세스",
  durationNote: "총 공정 약 2주 (회사소개서 기준, 한전 승압비용·VAT 별도)",
  phases: [
    {
      id: "nm-1",
      number: "01",
      title: "입지 · 사전검토",
      summary: ["입지조건 검토", "경제성 분석", "조례·한전 선로용량"],
      current: true,
      statusLabel: "1차 입지검토 완료",
    },
    {
      id: "nm-2",
      number: "02",
      title: "계약 · 설치계획",
      summary: ["설치위치·용량 확정", "시공계약 체결"],
    },
    {
      id: "nm-3",
      number: "03",
      title: "인허가 · 설계",
      summary: ["개발행위 허가 면제 확인", "모듈·구조·전기 설계"],
    },
    {
      id: "nm-4",
      number: "04",
      title: "한전 접수",
      summary: ["상계거래 신청 접수", "전력공급부 연계 기술 검토"],
    },
    {
      id: "nm-5",
      number: "05",
      title: "시공 · 점검",
      summary: ["구조물·모듈·전기 시공", "전기안전공사 사용전점검"],
    },
    {
      id: "nm-6",
      number: "06",
      title: "상계거래 시작",
      summary: ["요금 상계 거래 완료", "상계거래 시작"],
    },
  ],
  detailSteps: [
    { title: "입지여건분석", items: ["입지조건 검토", "설치기준 및 형태"] },
    { title: "사전검토", items: ["경제성 분석", "지자체 조례확인", "한전선로 용량검토"] },
    { title: "시공계약 체결", items: ["설치위치·용량 확정", "계약조건 설정 확인"] },
    { title: "인허가 검토", items: ["개발행위 허가 면제 확인"] },
    { title: "설계", items: ["모듈배치", "구조물설계", "전기설계"] },
    { title: "한전계통관련 접수", items: ["상계거래 신청 접수", "한전 전력공급부 연계 기술 검토 진행"] },
    { title: "공사 착공", items: ["기자재 입고", "구조물 및 모듈 시공", "전기 시공"] },
    { title: "사용 전 점검 신청", items: ["전기안전공사 점검 신청"] },
    { title: "사용 전 점검 확인", items: ["전기안전공사 점검 완료"] },
    { title: "상계 거래 시작", items: ["요금 상계 거래 완료", "상계 거래 시작"] },
  ],
};

/** Viewer p20 — 사업용 RPS 태양광 프로세스 (14 steps → 5 phases) */
export const RPS_ROADMAP: BusinessRoadmapDefinition = {
  kind: "rps",
  label: "사업용 RPS",
  sourcePage: 20,
  sourceTitle: "사업용 RPS 태양광 프로세스",
  durationNote: "총 공정 약 6개월 (회사소개서 기준, 한전계통연계비·VAT 별도)",
  phases: [
    {
      id: "rps-1",
      number: "01",
      title: "사전검토",
      summary: ["입지조건", "경제성", "지자체 조례", "한전 선로용량"],
      current: true,
      statusLabel: "1차 입지검토 완료",
    },
    {
      id: "rps-2",
      number: "02",
      title: "계약 · 인허가",
      summary: ["설치위치·규모 확정", "발전사업 인허가", "개발행위 검토"],
    },
    {
      id: "rps-3",
      number: "03",
      title: "설계 · 계통접수",
      summary: ["모듈·구조·전기 설계", "한전 계통 관련 접수", "공사계획 신고"],
    },
    {
      id: "rps-4",
      number: "04",
      title: "시공 · 검사",
      summary: ["기자재 입고·시공", "계통연계", "사용전검사"],
    },
    {
      id: "rps-5",
      number: "05",
      title: "상업운전",
      summary: ["전력수급계약", "상업운전 개시", "설비확인 · SMP·REC"],
    },
  ],
  detailSteps: [
    { title: "입지여건분석", items: ["입지조건 검토", "설치기준 및 형태"] },
    { title: "사전검토", items: ["경제성 분석", "지자체 조례확인", "한전선로 용량검토"] },
    { title: "시공계약 체결", items: ["설치위치·용량 확정", "계약조건 설정 확인"] },
    { title: "인허가 진행", items: ["발전사업허가 신청 (소요기간 약 60일)"] },
    { title: "설계", items: ["모듈배치", "구조물설계", "전기설계"] },
    { title: "개발행위허가", items: ["개발행위허가 진행 (소요기간 약 15일)", "구조안전 검토"] },
    {
      title: "한전계통관련 접수",
      items: ["사업자등록 후 전력수급계약(PPA) 신청", "계통연계 수급지점 협의", "시설부담금 고지서 발급"],
    },
    { title: "공사계획 신고", items: ["전기공사 감리 배치", "공사계획 신고"] },
    { title: "공사 착공", items: ["기자재 입고", "구조물 및 모듈 시공", "전기 시공"] },
    { title: "계통연계", items: ["가공 또는 지중선로", "한전 외선 공사"] },
    { title: "사용전검사", items: ["용량 20kW 이상 시 전기안전관리자 선임", "사용전검사 진행"] },
    {
      title: "전력 수급 계약",
      items: ["전력수급계약", "병렬운전 조작협의", "계좌이체거래약정 체결"],
    },
    {
      title: "상업운전 개시",
      items: ["상업운전 개시 신고 (해당 지자체)", "개발행위 준공 신청"],
    },
    { title: "설비 확인", items: ["설비확인 등록 (에너지관리공단)"] },
    { title: "발전소 상업운전", items: ["SMP 및 REC 발급·판매"] },
  ],
};

/** Viewer ~p15 — 자가 PPA 태양광 프로세스 (14 steps → 6 phases) */
export const PPA_ROADMAP: BusinessRoadmapDefinition = {
  kind: "ppa",
  label: "자가 PPA",
  sourcePage: 15,
  sourceTitle: "자가 PPA 태양광 프로세스",
  durationNote: "총 공정 약 3~4개월 (회사소개서 기준, 한전계통연계비·VAT 별도)",
  phases: [
    {
      id: "ppa-1",
      number: "01",
      title: "사전검토",
      summary: ["입지조건", "경제성", "조례·한전 선로용량"],
      current: true,
      statusLabel: "1차 입지검토 완료",
    },
    {
      id: "ppa-2",
      number: "02",
      title: "계약 · 설계",
      summary: ["시공계약", "모듈·구조·전기 설계"],
    },
    {
      id: "ppa-3",
      number: "03",
      title: "인허가 · 계통접수",
      summary: ["개발행위허가(해당 시)", "PPA·계통 접수"],
    },
    {
      id: "ppa-4",
      number: "04",
      title: "시공 · 연계",
      summary: ["공사 착공", "계통 연계"],
    },
    {
      id: "ppa-5",
      number: "05",
      title: "검사 · 수급계약",
      summary: ["사용전검사", "전력수급계약"],
    },
    {
      id: "ppa-6",
      number: "06",
      title: "상업운전",
      summary: ["상업운전 개시", "설비확인 · SMP·REC"],
    },
  ],
  detailSteps: [
    { title: "입지여건분석", items: ["입지조건 검토", "설치기준 및 형태"] },
    { title: "사전검토", items: ["경제성 분석", "지자체 조례확인", "한전 선로 용량검토"] },
    { title: "시공계약 체결", items: ["설치위치·용량 확정", "계약조건 설정 확인"] },
    { title: "설계", items: ["모듈배치", "구조물설계", "전기설계"] },
    {
      title: "개발행위허가 진행",
      items: ["설치면적 150㎡ 이상 시 개발행위허가 진행", "구조안전 검토 진행"],
    },
    {
      title: "한전계통관련 접수",
      items: ["사업자등록 후 PPA 접수", "계통연계 수급지점 협의", "시설부담금 고지서 발급"],
    },
    {
      title: "공사계획 신고",
      items: ["전기공사 감리 배치", "공사계획 신고", "지자체별 상이함 (필요시)"],
    },
    { title: "공사 착공", items: ["기자재 입고", "구조물 및 모듈 시공", "전기 시공"] },
    { title: "계통 연계", items: ["가공 또는 지중선로", "한전 외선 공사"] },
    {
      title: "사용 전 검사",
      items: ["용량 20kW 이상 시 전기안전 관리자 선임", "사용 전 검사 진행"],
    },
    {
      title: "전력 수급 계약",
      items: ["전력 수급 계약", "병렬운전 조작협의", "계좌이체거래약정 체결"],
    },
    {
      title: "상업운전 개시",
      items: ["상업운전 개시 신고 (해당 지자체)", "개발행위 준공 신청"],
    },
    { title: "설비확인", items: ["설비확인 등록 (에너지관리공단)"] },
    { title: "발전소 상업운전", items: ["상업운전 SMP 및 REC 발급 및 판매"] },
  ],
};

export const GENERAL_ROADMAP: BusinessRoadmapDefinition = {
  ...RPS_ROADMAP,
  kind: "general",
  label: "발전사업 일반",
};

export function resolveBusinessRoadmapKind(installType: string): BusinessRoadmapKind {
  if (installType.includes("상계") || installType.includes("가정")) return "net_metering";
  // Current product types: 토지형/지붕형 → RPS generation business path by default.
  // PPA is not separately classified in result data yet — do not invent.
  if (installType.includes("토지") || installType.includes("지붕")) return "rps";
  return "general";
}

export function getBusinessRoadmap(installType: string): BusinessRoadmapDefinition {
  const kind = resolveBusinessRoadmapKind(installType);
  if (kind === "net_metering") return NET_METERING_ROADMAP;
  if (kind === "ppa") return PPA_ROADMAP;
  if (kind === "rps") return RPS_ROADMAP;
  return GENERAL_ROADMAP;
}
