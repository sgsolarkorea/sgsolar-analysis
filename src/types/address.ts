/** 카카오 주소 자동완성 후보 */
export interface AddressSuggestion {
  id: string;
  jibunAddress: string;
  roadAddress: string | null;
  /** 검색·결과 페이지에 사용할 주소 (도로명 우선) */
  selectedAddress: string;
}

export interface AddressSuggestionsResponse {
  suggestions: AddressSuggestion[];
}
