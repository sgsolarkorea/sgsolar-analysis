/** 계통 연계 판정 상태 — 확정 표현(가능/불가) 사용 금지 */
export type GridConnectionStatus = "high" | "review" | "difficult" | "unknown";

export type GridDataSource =
  | "kepco-api-direct"
  | "kepco-api-nearby"
  | "admin"
  | "none";

export interface GridLevelCapacity {
  name: string;
  cumulativeMw: number | null;
  remainingMw: number | null;
}

export interface GridPoleOption {
  poleId: string;
  label: string;
  referenceLocation: string;
  substation: GridLevelCapacity;
  transformer: GridLevelCapacity;
  distributionLine: GridLevelCapacity;
}

export interface GridContactInfo {
  kepcoBranch: string;
  branchPhone: string;
  /** 전력공급부 담당 업무 (예: 태양광 계통검토 담당) */
  supplyDepartment: string;
  supplyPhone: string;
  /** 계통운영기술부 담당 업무 (예: 배전계통 담당) */
  operationsDepartment: string;
  operationsPhone: string;
}

/** 관리자 수동 입력 레코드 */
export interface GridAdminRecord {
  id: string;
  /** 주소 매칭 키워드 (모두 포함 시 매칭) */
  regionKeywords: string[];
  dataAsOfDate: string;
  contacts: GridContactInfo;
  poles: GridPoleOption[];
  updatedAt: string;
}

export interface GridConnectionInfo {
  status: GridConnectionStatus;
  statusLabel: string;
  expectedCapacityMw: number;
  expectedCapacityDisplay: string;
  referenceLocation: string;
  dataAsOfDate: string | null;
  selectedPoleId: string | null;
  poles: GridPoleOption[];
  /** 검토 기준 잔여용량 — min(변전소, MTR, D/L) */
  remainingCapacityMw: number | null;
  remainingCapacityDisplay: string;
  capacityMarginMw: number | null;
  capacityMarginDisplay: string;
  reviewResult: string;
  contacts: GridContactInfo;
  dataSource: GridDataSource;
  dataSourceLabel: string;
  /** 직접/인근 조회 기준 라벨 (예: 해당 위치 기준, 인근 2.4km 변압기 기준) */
  queryBasisLabel: string | null;
  /** 인근 조회 시 거리(km) */
  nearbyDistanceKm: number | null;
  /** 인근 조회 안내 문구 */
  nearbyNotice: string | null;
  /** 3개 박스용 — 선택된 전주 기준 */
  substation: GridLevelCapacity;
  transformer: GridLevelCapacity;
  distributionLine: GridLevelCapacity;
}
