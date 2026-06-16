/** 계통 연계 판정 상태 — 확정 표현(가능/불가) 사용 금지 */
export type GridConnectionStatus = "high" | "review" | "difficult" | "unknown";

export type GridDataSource = "kepco-api" | "admin" | "derived" | "none";

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
  supplyDepartment: string;
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
  /** 검토 기준 잔여용량 (D/L 기준, 없으면 null) */
  remainingCapacityMw: number | null;
  remainingCapacityDisplay: string;
  capacityMarginMw: number | null;
  capacityMarginDisplay: string;
  reviewResult: string;
  contacts: GridContactInfo;
  dataSource: GridDataSource;
  /** 3개 박스용 — 선택된 전주 기준 */
  substation: GridLevelCapacity;
  transformer: GridLevelCapacity;
  distributionLine: GridLevelCapacity;
}
