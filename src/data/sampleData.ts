/**
 * SG SOLAR sampleData
 *
 * ── 회사 정보 ──
 * Header / Footer / 상담신청 등 전체 사이트는 company 객체만 수정하면 반영됩니다.
 *
 * ── 입지검토 데이터 흐름 ──
 * analyzeSolarSite(address) @/lib/api/analysis.ts
 * 현재: mock API + result/cases 폴백
 * 향후: lib/api/*.ts 각 함수 내부를 실제 API로 교체
 *
 * ── API 연동 예정 순서 ──
 * 1) 카카오 주소검색 API: 주소 → 좌표 변환
 * 2) VWorld/토지이용계획 데이터: 좌표/PNU → 지목, 용도지역, 면적 조회
 * 3) 건축물대장/공공데이터: 건물 용도, 구조, 지붕면적, 준공연도 조회
 * 4) 한전 계통 데이터: 변전소, 배전선로, 계통연계 가능성 조회
 * 5) 발전량 계산 로직: 설치용량 → 예상 발전량 → 예상 수익 계산
 * 6) 시공사례 DB: 지역/유형/용량 기준 유사 시공사례 자동 추천
 */

import type {
  BusinessTypeOption,
  CompanyInfo,
  ConstructionCase,
  SiteReviewResult,
} from "@/types/siteReview";

export const DEFAULT_ADDRESS = "경기도 성남시 분당구 판교역로 235";

/** 전체 사이트 공통 안내문 — Header/Footer/결과 영역에서 사용 */
export const SITE_DISCLAIMER =
  "본 입지검토 결과는 공공데이터와 자체 산정 기준을 바탕으로 한 참고용 1차 검토자료입니다. 실제 설치 가능 여부, 인허가, 계통연계, 발전량, 수익성은 현장 확인 및 관계기관 검토 후 최종 확정됩니다.";

export const REVENUE_DISCLAIMER =
  "본 수익성 분석은 참고용이며 실제 발전량, REC 가격, SMP 가격, 가중치, 금융조건에 따라 달라질 수 있습니다.";

export const GRID_DISCLAIMER =
  "본 결과는 공개 데이터 기반 1차 검토이며 실제 계통 연계 가능 여부는 한전 접수 및 선로 검토 후 확정됩니다.";

export const REVENUE_WARNING =
  "예상 수익은 SMP, REC, 일사량, 자가소비 여부, 설비조건, 가중치, 금융조건에 따라 달라질 수 있습니다.";

/** ★ 회사 정보 — 이 객체만 수정하면 Header/Footer/상담 영역에 반영됩니다 */
export const company: CompanyInfo = {
  brandName: "SG SOLAR",
  companyName: "신재생에너지한국태양광에스지솔라",
  ceo: "박성수",
  phone: "1844-2807",
  fax: "0508-956-6014",
  email: "sgsolarkorea@naver.com",
  website: "www.sgsolar.co.kr",
  address: "사업장 주소 입력 필요",
  businessNumber: "545-16-02481",
  mailOrderNumber: "제2025-전주완산-0896호",
};

/** 소개·마케팅 문구용 정식 명칭 (로고·이메일·도메인 등은 brandName 유지) */
export const MARKETING_NAME = "신재생에너지 한국태양광 에스지솔라";

/** 사이트 메타 — layout.tsx 에서 사용 */
export const siteMetadata = {
  title: `${MARKETING_NAME} | 무료 태양광 입지검토`,
  description: `${MARKETING_NAME} 태양광 입지검토 플랫폼 — 주소만 입력하면 설치 적합성과 예상 수익을 확인하세요.`,
};

/** 향후 메인 홈페이지·입지검토 서브도메인 메뉴 연동용 */
export const siteLinks = {
  mainSite: "https://www.sgsolar.co.kr",
  analysisSite: "https://analysis.sgsolar.co.kr",
};

/** ★ 시공사례 — API 연동 시 cases 배열을 DB 응답으로 교체 */
export const cases: ConstructionCase[] = [
  {
    title: "전북 김제 198kW 토지형 태양광",
    region: "전북특별자치도 김제시",
    type: "토지형",
    capacity: "198kW",
    completedAt: "2024.09",
    description: "발전사업용 태양광 시공사례",
    imageUrl: "/cases/kimje.jpg",
    blogUrl: "",
    youtubeUrl: "",
    province: "전북",
    city: "김제시",
    capacityKw: 198,
    landCategory: "대",
    installCategory: "토지형",
  },
  {
    title: "전북 부안 800kW 축사 지붕형 태양광",
    region: "전북특별자치도 부안군",
    type: "축사형",
    capacity: "800kW",
    completedAt: "2024.06",
    description: "대형 축사 지붕을 활용한 발전사업 검토 사례",
    imageUrl: "/cases/buan.jpg",
    blogUrl: "",
    youtubeUrl: "",
    province: "전북",
    city: "부안군",
    capacityKw: 800,
    landCategory: "대",
    installCategory: "축사형",
  },
  {
    title: "전북 군산 3.2kW 상가 지붕형 태양광",
    region: "전북특별자치도 군산시",
    type: "상가형",
    capacity: "3.2kW",
    completedAt: "2025.01",
    description: "상가 지붕 자가소비형 태양광 설치 사례",
    imageUrl: "/cases/gunsan.jpg",
    blogUrl: "",
    youtubeUrl: "",
    province: "전북",
    city: "군산시",
    capacityKw: 3.2,
    landCategory: "대",
    installCategory: "상가형",
  },
  {
    title: "전북 전주 12kW 주택 지붕형 태양광",
    region: "전북특별자치도 전주시",
    type: "주택형",
    capacity: "12kW",
    completedAt: "2024.11",
    description: "주택 지붕 자가소비형 태양광 설치 사례",
    imageUrl: "/cases/jeonju-house.jpg",
    blogUrl: "",
    youtubeUrl: "",
    province: "전북",
    city: "전주시",
    capacityKw: 12,
    landCategory: "대",
    installCategory: "주택형",
  },
  {
    title: "전북 전주 95kW 공장 지붕형 태양광",
    region: "전북특별자치도 전주시",
    type: "공장형",
    capacity: "95kW",
    completedAt: "2024.03",
    description: "공장 지붕 자가소비·발전사업 병행 검토 사례",
    imageUrl: "/cases/jeonju-factory.jpg",
    blogUrl: "",
    youtubeUrl: "",
    province: "전북",
    city: "전주시",
    capacityKw: 95,
    landCategory: "대",
    installCategory: "지붕형",
  },
  {
    title: "전북 익산 120kW 공장 지붕형 태양광",
    region: "전북특별자치도 익산시",
    type: "공장형",
    capacity: "120kW",
    completedAt: "2023.08",
    description: "중소공장 옥상 태양광 자가소비 사례",
    imageUrl: "/cases/iksan.jpg",
    blogUrl: "",
    youtubeUrl: "",
    province: "전북",
    city: "익산시",
    capacityKw: 120,
    landCategory: "대",
    installCategory: "지붕형",
  },
  {
    title: "경기 성남 99kW 옥상형 태양광",
    region: "경기도 성남시",
    type: "지붕형",
    capacity: "99kW",
    completedAt: "2024.05",
    description: "업무시설 옥상 태양광 설치 사례",
    imageUrl: "/cases/seongnam.jpg",
    blogUrl: "",
    youtubeUrl: "",
    province: "경기",
    city: "성남시",
    capacityKw: 99,
    landCategory: "대",
    installCategory: "지붕형",
  },
  {
    title: "경기 수원 5kW 주택 지붕형 태양광",
    region: "경기도 수원시",
    type: "주택형",
    capacity: "5kW",
    completedAt: "2025.02",
    description: "단독주택 소규모 태양광 설치 사례",
    imageUrl: "/cases/suwon.jpg",
    blogUrl: "",
    youtubeUrl: "",
    province: "경기",
    city: "수원시",
    capacityKw: 5,
    landCategory: "대",
    installCategory: "주택형",
  },
  {
    title: "충남 천안 250kW 토지형 태양광",
    region: "충청남도 천안시",
    type: "토지형",
    capacity: "250kW",
    completedAt: "2023.12",
    description: "유휴 토지 활용 발전사업 시공 사례",
    imageUrl: "/cases/cheonan.jpg",
    blogUrl: "",
    youtubeUrl: "",
    province: "충남",
    city: "천안시",
    capacityKw: 250,
    landCategory: "대",
    installCategory: "토지형",
  },
  {
    title: "전북 완주 50kW 축사 지붕형 태양광",
    region: "전북특별자치도 완주군",
    type: "축사형",
    capacity: "50kW",
    completedAt: "2024.07",
    description: "축사 지붕 소규모 발전사업 검토 사례",
    imageUrl: "/cases/wanju.jpg",
    blogUrl: "",
    youtubeUrl: "",
    province: "전북",
    city: "완주군",
    capacityKw: 50,
    landCategory: "대",
    installCategory: "축사형",
  },
];

const BUSINESS_TYPE_OPTIONS: BusinessTypeOption[] = [
  {
    id: "self-consumption",
    title: "자가소비형 태양광",
    description: "전기요금 절감 목적의 건물·공장·상가용 태양광",
  },
  {
    id: "power-business",
    title: "발전사업용 태양광",
    description: "SMP·REC 판매를 통한 발전수익형 태양광",
  },
  {
    id: "small-scale",
    title: "주택·상가 소규모 태양광",
    description: "3kW~30kW 규모의 소규모 설치 검토",
  },
];

const MONTHLY_GENERATION = [
  { month: "1월", kwh: 8200 },
  { month: "2월", kwh: 9100 },
  { month: "3월", kwh: 10800 },
  { month: "4월", kwh: 11200 },
  { month: "5월", kwh: 11800 },
  { month: "6월", kwh: 10500 },
  { month: "7월", kwh: 9800 },
  { month: "8월", kwh: 10200 },
  { month: "9월", kwh: 9900 },
  { month: "10월", kwh: 9500 },
  { month: "11월", kwh: 8800 },
  { month: "12월", kwh: 7900 },
];

/** ★ 입지검토 결과 — API 연동 시 result 객체 전체를 API 응답으로 교체 */
export const result: Omit<
  SiteReviewResult,
  "address" | "jibunAddress" | "analyzedAt" | "solarMetrics"
> = {
  pnu: "4113512345",
  lat: 37.3947,
  lng: 127.1112,
  grade: "A",
  recommendation: "지붕형 (12° 고정형)",
  capacity: "99.4kW",
  annualGeneration: "128,400kWh/년",
  annualRevenue: "약 1,820만원",
  constructionCost: "약 1억 2,400만원",
  recommendedBusinessTypes: "옥상형 / 자가소비 + 발전사업 검토 가능",
  businessTypeOptions: BUSINESS_TYPE_OPTIONS,
  landInfo: [
    { label: "지목", value: "대", status: "상담 시 확인" },
    { label: "용도지역", value: "준주거지역", status: "추가 확인 필요" },
    { label: "면적", value: "2,340㎡", status: "상담 시 확인" },
    { label: "규제사항", value: "준주거지역 내 설치 검토", status: "추가 확인 필요" },
    { label: "토지이용계획", value: "확인 필요", status: "확인 필요" },
  ],
  landInfoDetail: {
    landCategory: "대",
    area: "2,340㎡",
    zoning: "준주거지역",
    landUseSituation: "확인 필요",
    dataSource: "unavailable",
  },
  regionDistrictAnalysis: {
    rows: [
      {
        district: "농림지역",
        feasibility: "추가 확인 필요",
        condition: "토지이용계획 확인 필요",
      },
    ],
    sourceNote: "샘플 데이터 기준 참고",
  },
  layerARegulatoryAnalysis: {
    rows: [],
    sourceNote: "샘플 데이터 기준 참고",
  },
  setbackReview: {
    notice: "아래 거리는 공공 GIS 기준 추정값이며, 최종 이격거리는 지자체 조례·현장 확인이 필요합니다.",
    rows: [
      {
        item: "건물/주거지",
        detail: "인근 건물",
        standard: "200m",
        measured: "데이터 확인 필요",
        judgment: "데이터 확인 필요",
        remark: "샘플 데이터",
      },
      {
        item: "도로",
        detail: "포장도로",
        standard: "100m",
        measured: "데이터 확인 필요",
        judgment: "데이터 확인 필요",
        remark: "샘플 데이터",
      },
      {
        item: "하천",
        standard: "100m",
        measured: "데이터 확인 필요",
        judgment: "데이터 확인 필요",
        remark: "샘플 데이터",
      },
      {
        item: "학교",
        standard: "100m",
        measured: "데이터 확인 필요",
        judgment: "데이터 확인 필요",
        remark: "샘플 데이터",
      },
      {
        item: "문화재보호구역",
        standard: "100m",
        measured: "데이터 확인 필요",
        judgment: "데이터 확인 필요",
        remark: "샘플 데이터",
      },
    ],
    meta: { partial: true },
  },
  buildingInfo: [
    { label: "건물 용도", value: "업무시설 (근린생활시설)", status: "상담 시 확인" },
    { label: "구조", value: "철근콘크리트", status: "상담 시 확인" },
    { label: "건축면적", value: "820㎡", status: "상담 시 확인" },
    { label: "연면적", value: "3,280㎡", status: "상담 시 확인" },
    { label: "지상층수", value: "4층", status: "상담 시 확인" },
    { label: "사용승인일", value: "2014.05.30", status: "상담 시 확인" },
    { label: "지붕형태", value: "슬래브", status: "추가 확인 필요" },
  ],
  gridInfo: {
    status: "unknown",
    statusLabel: "⚫ 한전 확인 필요",
    expectedCapacityMw: 0,
    expectedCapacityDisplay: "—",
    referenceLocation: "경기 성남시 분당구 판교동",
    dataAsOfDate: null,
    selectedPoleId: null,
    poles: [],
    remainingCapacityMw: null,
    remainingCapacityDisplay: "한전 확인 필요",
    capacityMarginMw: null,
    capacityMarginDisplay: "한전 확인 필요",
    reviewResult: "공개 데이터 미확보 — 한전 선로용량 확인 필요",
    contacts: {
      kepcoBranch: "한국전력 성남지사",
      branchPhone: "031-800-6114",
      supplyDepartment: "태양광 계통검토 담당",
      supplyPhone: "031-800-6234",
      operationsDepartment: "배전계통 담당",
      operationsPhone: "031-800-6281",
    },
    dataSource: "none",
    dataSourceLabel: "데이터 출처 : 공개 데이터 미확보",
    queryBasisLabel: "해당 위치 기준",
    nearbyDistanceKm: null,
    nearbyNotice: null,
    substation: { name: "한전 확인 필요", cumulativeMw: null, remainingMw: null },
    transformer: { name: "한전 확인 필요", cumulativeMw: null, remainingMw: null },
    distributionLine: { name: "한전 확인 필요", cumulativeMw: null, remainingMw: null },
  },
  ordinanceInfo: [
    {
      label: "개발행위허가 검토",
      status: "확인 필요",
      description: "토지·건물 유형에 따라 허가 대상 여부 확인",
    },
    {
      label: "이격거리 조례 검토",
      status: "조건부 가능",
      description: "지자체 조례 및 설치 위치에 따른 이격거리 확인",
    },
    {
      label: "건축물 정보 확인",
      status: "확인 필요",
      description: "옥상 설치 시 구조·용도 확인 필요",
    },
    {
      label: "전기사업허가 또는 자가용전기설비 신고 검토",
      status: "상담 필요",
      description: "설치 용량·용도에 따라 신고 또는 허가 구분",
    },
    {
      label: "사용전검사/사용전점검 검토",
      status: "상담 필요",
      description: "시공 완료 후 관계기관 검사·점검 절차 안내",
    },
  ],
  profitability: {
    estimatedInstallCost: "약 1억 2,400만원",
    annualGeneration: "128,400kWh/년",
    smpRevenue: "약 920만원/년",
    recRevenue: "약 900만원/년",
    totalRevenue: "약 1,820만원/년",
    paybackPeriod: "6.8년 (참고)",
  },
  monthlyGeneration: MONTHLY_GENERATION,
  suitability: [
    {
      label: "일사량 적합성",
      status: "pass",
      description: "연간 평균 일조 4.2시간, 지역 상위 15% 수준 (1차 검토)",
    },
    {
      label: "옥상 구조 적합성",
      status: "pass",
      description: "하중 여유 120kg/㎡ 이상 추정, 현장 확인 필요",
    },
    {
      label: "계통 연계",
      status: "caution",
      description: "인근 변압기 잔여용량·한전 접수 조건은 현장 확인 후 안내드립니다.",
    },
    {
      label: "규제·인허가",
      status: "caution",
      description: "용도지역·건축물 조건에 따라 추가 검토가 필요할 수 있습니다.",
    },
    {
      label: "그늘·장애물",
      status: "pass",
      description: "남향 기준 그늘 영향 5% 미만 (추정)",
    },
    {
      label: "수익성 참고",
      status: "caution",
      description: "예상 수익성은 시장단가와 현장 조건에 따라 달라질 수 있습니다.",
    },
  ],
  recommendedCases: [],
};

export function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
