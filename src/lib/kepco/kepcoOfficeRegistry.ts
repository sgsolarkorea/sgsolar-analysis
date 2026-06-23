import type { KepcoOfficeRegistryEntry } from "@/types/kepco";
import {
  KEPCO_DEPARTMENT_HINT,
  KEPCO_OFFICE_SOURCE,
  KEPCO_REPRESENTATIVE_PHONE,
} from "@/lib/kepco/inquiryContent";

const DEFAULT_ENTRY = {
  departmentHint: KEPCO_DEPARTMENT_HINT,
  representativePhone: KEPCO_REPRESENTATIVE_PHONE,
  source: KEPCO_OFFICE_SOURCE,
} as const;

/** Step 5 1차 등록 — 시·도 + 시·군·구 키워드 매칭 */
export const KEPCO_OFFICE_REGISTRY: KepcoOfficeRegistryEntry[] = [
  // 경상남도
  { sido: "경상남도", sigungu: "사천시", officeName: "사천지사", confidence: "region_match", ...DEFAULT_ENTRY },
  { sido: "경상남도", sigungu: "통영시", officeName: "통영지사", confidence: "region_match", ...DEFAULT_ENTRY },
  { sido: "경상남도", sigungu: "진주시", officeName: "진주지사", confidence: "region_match", ...DEFAULT_ENTRY },
  {
    sido: "경상남도",
    sigungu: "창원시",
    officeName: "창원지사",
    confidence: "needs_verification",
    verificationNote: "창원시 내 관할 분기·지사가 다를 수 있어 세부 관할 확인이 필요합니다.",
    ...DEFAULT_ENTRY,
  },
  // 전라남도
  { sido: "전라남도", sigungu: "목포시", officeName: "목포지사", confidence: "region_match", ...DEFAULT_ENTRY },
  // 충청남도
  { sido: "충청남도", sigungu: "논산시", officeName: "논산지사", confidence: "region_match", ...DEFAULT_ENTRY },
  { sido: "충청남도", sigungu: "서산시", officeName: "서산지사", confidence: "region_match", ...DEFAULT_ENTRY },
  // 전라북도
  { sido: "전라북도", sigungu: "군산시", officeName: "군산지사", confidence: "region_match", ...DEFAULT_ENTRY },
  { sido: "전라북도", sigungu: "김제시", officeName: "김제지사", confidence: "region_match", ...DEFAULT_ENTRY },
  { sido: "전라북도", sigungu: "전주시", officeName: "전주지사", confidence: "region_match", ...DEFAULT_ENTRY },
  {
    sido: "전라북도",
    sigungu: "부안군",
    officeName: "관할 사업소 확인 필요",
    confidence: "unknown",
    verificationNote: "부안군은 정읍지사·군산지사 등 관할 분기 확인이 필요합니다.",
    ...DEFAULT_ENTRY,
  },
  // 경기도
  { sido: "경기도", sigungu: "평택시", officeName: "평택지사", confidence: "region_match", ...DEFAULT_ENTRY },
];
