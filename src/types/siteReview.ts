export type Grade = "A" | "B" | "C" | "D";
export type SuitabilityStatus = "pass" | "caution" | "fail";
export type FieldStatus = "상담 시 확인" | "추가 확인 필요" | "확인 필요";
export type OrdinanceStatus = "확인 필요" | "상담 필요" | "조건부 가능";

export interface CompanyInfo {
  brandName: string;
  companyName: string;
  ceo: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  businessNumber: string;
}

export interface InfoField {
  label: string;
  value: string;
  status?: FieldStatus;
}

export interface GridInfo {
  kepcoBranch: string;
  nearbySubstation: string;
  distributionLine: string;
  connectionPossibility: string;
  additionalReviewRequired: string;
  statusMessage: string;
}

export interface OrdinanceItem {
  label: string;
  status: OrdinanceStatus;
  description: string;
}

export interface Profitability {
  estimatedInstallCost: string;
  annualGeneration: string;
  smpRevenue: string;
  recRevenue: string;
  totalRevenue: string;
  paybackPeriod: string;
  smpPrice?: string;
  recPrice?: string;
  recWeight?: string;
  recWeightReason?: string;
  smpDate?: string;
  recDate?: string;
  marketSource?: string;
  marketFallback?: boolean;
  cumulative20YearRevenue?: string;
  constructionCostPerKw?: string;
  separateWorkNote?: string;
}

export interface SolarMetrics {
  installType: string;
  installCategory: string;
  baseAreaSqm: number;
  baseAreaLabel: string;
  areaPerKw: number;
  capacityKw: number;
  modulePowerW: number;
  moduleCount: number;
  formula: string;
  capacityDisclaimer: string;
  recWeight: number;
  recWeightReason: string;
  market: {
    smpPrice: number;
    recPrice: number;
    smpDate: string;
    recDate: string;
    source: string;
    isFallback: boolean;
  };
  marketDisclaimer: string;
  annualGenerationKwh: number;
  smpRevenueWon: number;
  recRevenueWon: number;
  totalRevenueWon: number;
  revenue20YearWon: number;
  constructionCostPerKw: number;
  constructionCostWon: number;
  constructionDisclaimer: string;
  separateWorkNote: string;
  paybackYears: number;
  recUnitNote: string;
}

export interface MonthlyGeneration {
  month: string;
  kwh: number;
}

export interface SuitabilityItem {
  label: string;
  status: SuitabilityStatus;
  description: string;
}

export interface BusinessTypeOption {
  id: string;
  title: string;
  description: string;
}

/** 시공사례 — sampleData.cases / result.recommendedCases */
export interface ConstructionCase {
  title: string;
  region: string;
  type: string;
  capacity: string;
  completedAt: string;
  description: string;
  imageUrl: string;
  blogUrl: string;
  youtubeUrl: string;
  /** 추천 알고리즘용 — 시·도 (예: 전북, 경기) */
  province: string;
  /** 추천 알고리즘용 — 시·군·구 (예: 전주시) */
  city?: string;
  /** 추천 알고리즘용 — 용량(kW) */
  capacityKw: number;
  /** 추천 알고리즘용 — 지목·건물 유형 (예: 대, 건축물) */
  landCategory: string;
  /** 추천 알고리즘용 — 설치 유형 분류 */
  installCategory: string;
}

export interface RecommendedConstructionCase extends ConstructionCase {
  recommendReason: string;
}

/**
 * 입지검토 결과 — API 연동 시 이 구조로 응답 매핑
 * sampleData.result 를 실제 API 응답으로 교체
 */
export interface SiteReviewResult {
  address: string;
  jibunAddress: string;
  pnu: string;
  lat: number;
  lng: number;
  buildingName?: string;
  zoneNo?: string;
  analyzedAt: string;
  grade: Grade;
  recommendation: string;
  capacity: string;
  annualGeneration: string;
  annualRevenue: string;
  constructionCost: string;
  landInfo: InfoField[];
  buildingInfo: InfoField[];
  gridInfo: GridInfo;
  ordinanceInfo: OrdinanceItem[];
  profitability: Profitability;
  solarMetrics: SolarMetrics;
  monthlyGeneration: MonthlyGeneration[];
  recommendedCases: RecommendedConstructionCase[];
  recommendedBusinessTypes: string;
  businessTypeOptions: BusinessTypeOption[];
  suitability: SuitabilityItem[];
}

export type ResolvedSiteReview = SiteReviewResult & {
  consultationDefaultAddress: string;
};

export const GRADE_MESSAGES: Record<Grade, string> = {
  A: "태양광 설치 검토에 유리한 입지입니다.",
  B: "조건부로 태양광 설치 검토가 가능한 입지입니다.",
  C: "추가 검토가 필요한 입지입니다.",
  D: "현재 조건으로는 설치 검토가 어려울 수 있습니다.",
};

export const INSTALL_TYPE_OPTIONS = [
  { value: "주택용", label: "주택용" },
  { value: "상가/공장 자가소비", label: "상가/공장 자가소비" },
  { value: "축사/공장 지붕형", label: "축사/공장 지붕형" },
  { value: "토지형 발전사업", label: "토지형 발전사업" },
  { value: "아직 모름", label: "아직 모름" },
] as const;
