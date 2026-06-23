import { KEPCO_OFFICE_REGISTRY } from "@/lib/kepco/kepcoOfficeRegistry";
import {
  KEPCO_DEPARTMENT_HINT,
  KEPCO_FALLBACK_INQUIRY_GUIDE,
  KEPCO_FALLBACK_OFFICE_NAME,
  KEPCO_OFFICE_SOURCE,
  KEPCO_REPRESENTATIVE_PHONE,
} from "@/lib/kepco/inquiryContent";
import type { KepcoOfficeConfidence, ResolvedKepcoOffice } from "@/types/kepco";

const SIDO_ALIASES: Record<string, string> = {
  경기: "경기도",
  경기도: "경기도",
  경남: "경상남도",
  경상남도: "경상남도",
  경북: "경상북도",
  경상북도: "경상북도",
  전남: "전라남도",
  전라남도: "전라남도",
  전북: "전라북도",
  전라북도: "전라북도",
  충남: "충청남도",
  충청남도: "충청남도",
  충북: "충청북도",
  충청북도: "충청북도",
  강원: "강원특별자치도",
  강원도: "강원특별자치도",
  강원특별자치도: "강원특별자치도",
  제주: "제주특별자치도",
  제주특별자치도: "제주특별자치도",
  서울: "서울특별시",
  서울특별시: "서울특별시",
  부산: "부산광역시",
  부산광역시: "부산광역시",
  대구: "대구광역시",
  대구광역시: "대구광역시",
  인천: "인천광역시",
  인천광역시: "인천광역시",
  광주: "광주광역시",
  광주광역시: "광주광역시",
  대전: "대전광역시",
  대전광역시: "대전광역시",
  울산: "울산광역시",
  울산광역시: "울산광역시",
  세종: "세종특별자치시",
  세종특별자치시: "세종특별자치시",
};

function statusLabelForConfidence(confidence: KepcoOfficeConfidence, officeName: string): string {
  if (officeName === KEPCO_FALLBACK_OFFICE_NAME || confidence === "unknown") return "확인 필요";
  if (confidence === "needs_verification") return "세부 관할 확인 권장";
  return "1차 매칭";
}

function parseSidoSigungu(address: string): { sido: string | null; sigungu: string | null } {
  const normalized = address.trim().replace(/\s+/g, " ");
  if (!normalized) return { sido: null, sigungu: null };

  let sido: string | null = null;
  let rest = normalized;

  const sidoKeys = Object.keys(SIDO_ALIASES).sort((a, b) => b.length - a.length);
  for (const key of sidoKeys) {
    if (normalized.startsWith(`${key} `) || normalized === key) {
      sido = SIDO_ALIASES[key];
      rest = normalized.slice(key.length).trim();
      break;
    }
  }

  const sigunguMatch = rest.match(/^([가-힣]{1,12}(?:시|군|구))/);
  const sigungu = sigunguMatch?.[1] ?? null;

  if (!sigungu && !sido) {
    const fallbackSigungu = normalized.match(/([가-힣]{2,12}(?:시|군|구))/);
    return { sido: null, sigungu: fallbackSigungu?.[1] ?? null };
  }

  return { sido, sigungu };
}

function buildFallback(parsed: { sido: string | null; sigungu: string | null }): ResolvedKepcoOffice {
  return {
    ...parsed,
    officeName: KEPCO_FALLBACK_OFFICE_NAME,
    departmentHint: KEPCO_DEPARTMENT_HINT,
    representativePhone: KEPCO_REPRESENTATIVE_PHONE,
    source: KEPCO_OFFICE_SOURCE,
    confidence: "unknown",
    statusLabel: "확인 필요",
    inquiryGuide: KEPCO_FALLBACK_INQUIRY_GUIDE,
    verificationNote: null,
  };
}

export function resolveKepcoOffice(address: string, jibunAddress = ""): ResolvedKepcoOffice {
  const haystack = `${address} ${jibunAddress}`.trim();
  const parsed = parseSidoSigungu(haystack);

  if (parsed.sido && parsed.sigungu) {
    const entry = KEPCO_OFFICE_REGISTRY.find(
      (row) => row.sido === parsed.sido && row.sigungu === parsed.sigungu,
    );
    if (entry) {
      const isFallbackOffice = entry.officeName === KEPCO_FALLBACK_OFFICE_NAME;
      return {
        sido: parsed.sido,
        sigungu: parsed.sigungu,
        officeName: entry.officeName,
        departmentHint: entry.departmentHint,
        representativePhone: entry.representativePhone,
        source: entry.source,
        confidence: entry.confidence,
        statusLabel: statusLabelForConfidence(entry.confidence, entry.officeName),
        inquiryGuide: isFallbackOffice ? KEPCO_FALLBACK_INQUIRY_GUIDE : null,
        verificationNote: entry.verificationNote ?? null,
      };
    }
  }

  if (parsed.sigungu) {
    const bySigungu = KEPCO_OFFICE_REGISTRY.filter((row) => row.sigungu === parsed.sigungu);
    if (bySigungu.length === 1) {
      const entry = bySigungu[0];
      const isFallbackOffice = entry.officeName === KEPCO_FALLBACK_OFFICE_NAME;
      return {
        sido: entry.sido,
        sigungu: entry.sigungu,
        officeName: entry.officeName,
        departmentHint: entry.departmentHint,
        representativePhone: entry.representativePhone,
        source: entry.source,
        confidence: entry.confidence,
        statusLabel: statusLabelForConfidence(entry.confidence, entry.officeName),
        inquiryGuide: isFallbackOffice ? KEPCO_FALLBACK_INQUIRY_GUIDE : null,
        verificationNote: entry.verificationNote ?? null,
      };
    }
  }

  return buildFallback(parsed);
}
