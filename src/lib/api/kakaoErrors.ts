export class KakaoApiKeyMissingError extends Error {
  constructor() {
    super("카카오 API 키가 설정되지 않았습니다.");
    this.name = "KakaoApiKeyMissingError";
  }
}

export class KakaoAddressNotFoundError extends Error {
  constructor() {
    super("주소 검색 결과가 없습니다.");
    this.name = "KakaoAddressNotFoundError";
  }

  /** searchAddressByKakao 내부 상세 안내 */
  static readonly userHint =
    "주소를 찾을 수 없습니다. 도로명 또는 지번주소를 다시 입력해주세요.";
}

export class KakaoNetworkError extends Error {
  constructor() {
    super("주소 검색 중 오류가 발생했습니다.");
    this.name = "KakaoNetworkError";
  }
}

export function getKakaoErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "주소 검색 중 오류가 발생했습니다.";
}
