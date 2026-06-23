import { KEPCO_OFFICE_REGISTRY } from "@/lib/kepco/kepcoOfficeRegistry";
import {
  CONFIDENCE_SCORE,
  formatMatchBasisLabel,
  MATCH_LEVEL_SCORE,
} from "@/lib/kepco/formatMatchBasis";
import {
  formatParsedAddressMeta,
  parseKepcoAddress,
} from "@/lib/kepco/parseKepcoAddress";
import {
  KEPCO_DEPARTMENT_HINT,
  KEPCO_FALLBACK_INQUIRY_GUIDE,
  KEPCO_FALLBACK_OFFICE_NAME,
  KEPCO_OFFICE_SOURCE,
  KEPCO_REPRESENTATIVE_PHONE,
} from "@/lib/kepco/inquiryContent";
import type {
  KepcoOfficeConfidence,
  KepcoOfficeRegistryEntry,
  ParsedKepcoAddress,
  ResolvedKepcoOffice,
} from "@/types/kepco";

function statusLabelForConfidence(confidence: KepcoOfficeConfidence, officeName: string): string {
  if (officeName === KEPCO_FALLBACK_OFFICE_NAME || confidence === "unknown") return "확인 필요";
  if (confidence === "needs_verification") return "관할 확인 권장";
  return "주소 1차 매칭";
}

function entryMatches(entry: KepcoOfficeRegistryEntry, parsed: ParsedKepcoAddress): boolean {
  if (parsed.sido && entry.sido !== parsed.sido) return false;
  if (parsed.sigungu && entry.sigungu !== parsed.sigungu) return false;
  if (entry.gu && entry.gu !== parsed.gu) return false;
  if (entry.eupmyeon && entry.eupmyeon !== parsed.eupmyeon) return false;
  if (entry.dong && entry.dong !== parsed.dong) return false;
  if (entry.ri && entry.ri !== parsed.ri) return false;
  if (!parsed.sido && !parsed.sigungu) return false;
  return true;
}

function pickBestMatch(
  candidates: KepcoOfficeRegistryEntry[],
): KepcoOfficeRegistryEntry | null {
  if (candidates.length === 0) return null;

  return [...candidates].sort((a, b) => {
    const levelDiff = MATCH_LEVEL_SCORE[b.matchLevel] - MATCH_LEVEL_SCORE[a.matchLevel];
    if (levelDiff !== 0) return levelDiff;
    return CONFIDENCE_SCORE[b.confidence] - CONFIDENCE_SCORE[a.confidence];
  })[0];
}

function buildFallback(parsed: ParsedKepcoAddress): ResolvedKepcoOffice {
  return {
    parsedAddress: parsed,
    officeName: KEPCO_FALLBACK_OFFICE_NAME,
    departmentHint: KEPCO_DEPARTMENT_HINT,
    representativePhone: KEPCO_REPRESENTATIVE_PHONE,
    source: KEPCO_OFFICE_SOURCE,
    matchLevel: "unknown",
    confidence: "unknown",
    statusLabel: "확인 필요",
    matchBasisLabel: "관할 사업소 확인 필요",
    parsedMeta: formatParsedAddressMeta(parsed),
    inquiryGuide: KEPCO_FALLBACK_INQUIRY_GUIDE,
    verificationNote: null,
  };
}

function buildResolved(entry: KepcoOfficeRegistryEntry, parsed: ParsedKepcoAddress): ResolvedKepcoOffice {
  const isFallbackOffice = entry.officeName === KEPCO_FALLBACK_OFFICE_NAME;

  return {
    parsedAddress: parsed,
    officeName: entry.officeName,
    departmentHint: entry.departmentHint,
    representativePhone: entry.representativePhone,
    source: entry.source,
    matchLevel: entry.matchLevel,
    confidence: entry.confidence,
    statusLabel: statusLabelForConfidence(entry.confidence, entry.officeName),
    matchBasisLabel: formatMatchBasisLabel(entry, parsed),
    parsedMeta: formatParsedAddressMeta(parsed),
    inquiryGuide: isFallbackOffice ? KEPCO_FALLBACK_INQUIRY_GUIDE : null,
    verificationNote: entry.verificationNote ?? null,
  };
}

export function resolveKepcoOffice(address: string, jibunAddress = ""): ResolvedKepcoOffice {
  const haystack = `${address} ${jibunAddress}`.trim();
  const parsed = parseKepcoAddress(haystack);

  const candidates = KEPCO_OFFICE_REGISTRY.filter((entry) => entryMatches(entry, parsed));
  const best = pickBestMatch(candidates);

  if (!best) {
    return buildFallback(parsed);
  }

  return buildResolved(best, parsed);
}

export { parseKepcoAddress, formatParsedAddressMeta };
