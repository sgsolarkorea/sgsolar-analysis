import type { GridAdminRecord, GridPoleOption } from "@/types/gridConnection";

export interface KepcoGridApiResult {
  dataAsOfDate: string;
  poles: GridPoleOption[];
}

/**
 * 한전 전력데이터개방포털 분산전원연계정보 API
 * https://www.data.go.kr/data/15147381/openapi.do
 * https://bigdata.kepco.co.kr — 별도 회원가입·API 키 발급 필요
 *
 * 환경변수:
 * - KEPCO_DATA_API_KEY (또는 BIGDATA_KEPCO_API_KEY)
 * - KEPCO_DATA_API_BASE (선택, 기본: bigdata.kepco.co.kr Open API)
 *
 * 주소/좌표/PNU 직접 조회는 API 스펙·인증 완료 후 구현.
 * 현재는 키 미설정 시 null 반환.
 */
export async function fetchKepcoGridByLocation(input: {
  lat: number;
  lng: number;
  address: string;
  jibunAddress: string;
  poleId?: string;
}): Promise<KepcoGridApiResult | null> {
  const apiKey =
    process.env.KEPCO_DATA_API_KEY?.trim() || process.env.BIGDATA_KEPCO_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  void input;
  // TODO: KEPCO Open API 연동 — 인증키·엔드포인트 확정 후 구현
  // 예상 필드: 변전소명, MTR, D/L, 누적연계용량, 여유용량, 접속가능용량
  console.info("[Grid/KepcoAPI] API key configured but integration pending", {
    address: input.address,
  });
  return null;
}
