/** 결과·PDF 공통 — 한전 계통 문의 항목 */
export const KEPCO_INQUIRY_TOPICS = [
  "계통연계 가능용량 확인",
  "접속 가능 여부 검토",
  "발전사업 또는 자가용 태양광 접속 문의",
] as const;

/** 결과·PDF 공통 — 문의 전 준비사항 */
export const KEPCO_PREP_ITEMS = [
  "설치 주소",
  "예상 설비용량",
  "설치 유형",
  "발전사업/자가소비 목적",
  "현장 사진 또는 위치도",
] as const;

export const KEPCO_DEPARTMENT_HINT = "배전운영부 / 신재생 계통연계 담당";

export const KEPCO_FALLBACK_PHONE = "123";

/** @deprecated use KEPCO_FALLBACK_PHONE */
export const KEPCO_REPRESENTATIVE_PHONE = KEPCO_FALLBACK_PHONE;

export const KEPCO_OFFICE_SOURCE = "한국전력공사 사업소 안내 기준";

export const KEPCO_INQUIRY_CALL_GUIDE =
  "전화 연결 시 태양광 계통연계 가능용량 확인 및 배전운영부 연결을 요청하세요.";

export const KEPCO_SUPPLEMENTARY_GUIDE =
  "우선 관할 사업소 확인 후 배전운영부 또는 신재생 계통 담당 부서 연결을 권장합니다.";

export const KEPCO_FALLBACK_OFFICE_NAME = "관할 사업소 확인 필요";

export const KEPCO_FALLBACK_INQUIRY_GUIDE =
  "한전 대표번호 123 또는 한국전력공사 사업소 찾기를 통해 관할 사업소 확인 후 배전운영부/신재생 계통 담당 부서로 문의가 필요합니다.";
