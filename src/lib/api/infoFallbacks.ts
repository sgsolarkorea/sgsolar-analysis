import type { InfoField } from "@/types/siteReview";

/** API 실패 시 sampleData 가짜 수치 대신 사용 — 용량 계산에 영향 없음 */
export function unavailableLandInfo(): InfoField[] {
  return [
    { label: "지목", value: "확인 필요", status: "확인 필요" },
    { label: "용도지역", value: "확인 필요", status: "확인 필요" },
    { label: "면적", value: "확인 필요", status: "확인 필요" },
    { label: "규제사항", value: "확인 필요", status: "추가 확인 필요" },
    { label: "토지이용계획", value: "확인 필요", status: "확인 필요" },
  ];
}

export function unavailableBuildingInfo(): InfoField[] {
  return [
    { label: "건물 용도", value: "확인 필요", status: "확인 필요" },
    { label: "구조", value: "확인 필요", status: "확인 필요" },
    { label: "건축면적", value: "확인 필요", status: "확인 필요" },
    { label: "연면적", value: "확인 필요", status: "확인 필요" },
    { label: "지상층수", value: "확인 필요", status: "확인 필요" },
    { label: "사용승인일", value: "확인 필요", status: "상담 시 확인" },
    { label: "지붕형태", value: "확인 필요", status: "추가 확인 필요" },
  ];
}
