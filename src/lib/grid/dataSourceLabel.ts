import type { GridDataSource } from "@/types/gridConnection";

export function getGridDataSourceLabel(source: GridDataSource): string {
  switch (source) {
    case "kepco-api":
      return "데이터 출처 : 한전 분산전원 연계정보 API 기반 1차 검토";
    case "admin":
      return "데이터 출처 : 관리자 등록 데이터";
    case "derived":
    case "none":
    default:
      return "데이터 출처 : 공개 데이터 미확보";
  }
}

/** Production에서 seed·관리자 데이터가 실측처럼 보이지 않도록 보조 안내 */
export function getGridDataSourceNotice(source: GridDataSource): string | null {
  switch (source) {
    case "kepco-api":
      return null;
    case "admin":
      return "관리자가 등록한 참고용 데이터입니다. 최종 확인은 한전 선로용량 조회가 필요합니다.";
    case "derived":
    case "none":
    default:
      return "해당 지역 계통 공개 데이터가 없습니다. 한전 선로용량 확인 후 확정해 주세요.";
  }
}
