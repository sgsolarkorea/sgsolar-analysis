import { KEPCO_OFFICE_REGISTRY } from "@/lib/kepco/kepcoOfficeRegistry";
import {
  CONFIDENCE_SCORE,
  formatMatchBasisLabel,
  MATCH_LEVEL_SCORE,
} from "@/lib/kepco/formatMatchBasis";
import {
  formatOfficePhoneDisplay,
  formatPhoneSourceDetail,
  lookupKepcoOfficePhone,
} from "@/lib/kepco/kepcoOfficePhoneDb";
import {
  formatParsedAddressMeta,
  mergeParsedAddresses,
  parseKepcoAddress,
} from "@/lib/kepco/parseKepcoAddress";
import {
  KEPCO_DEPARTMENT_HINT,
  KEPCO_FALLBACK_INQUIRY_GUIDE,
  KEPCO_FALLBACK_OFFICE_NAME,
  KEPCO_FALLBACK_PHONE,
  KEPCO_OFFICE_SOURCE,
  KEPCO_PHONE_SOURCE_LABEL,
} from "@/lib/kepco/inquiryContent";
import type {
  KepcoOfficeConfidence,
  KepcoOfficePhoneStatus,
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
    const confidenceDiff = CONFIDENCE_SCORE[b.confidence] - CONFIDENCE_SCORE[a.confidence];
    if (confidenceDiff !== 0) return confidenceDiff;
    const originScore = (origin: KepcoOfficeRegistryEntry["registryOrigin"]) =>
      origin === "manual" ? 2 : 1;
    return originScore(b.registryOrigin) - originScore(a.registryOrigin);
  })[0];
}

function attachPhoneFields(
  base: Omit<
    ResolvedKepcoOffice,
    | "officePhone"
    | "officePhoneDisplay"
    | "fallbackPhone"
    | "phoneStatus"
    | "phoneSource"
    | "phoneSourceDetail"
    | "phoneLastCheckedAt"
  >,
): ResolvedKepcoOffice {
  const phoneEntry = lookupKepcoOfficePhone(base.officeName);
  const officePhone = phoneEntry?.officePhone ?? null;

  return {
    ...base,
    departmentHint: KEPCO_DEPARTMENT_HINT,
    officePhone,
    officePhoneDisplay: formatOfficePhoneDisplay(officePhone),
    fallbackPhone: phoneEntry?.fallbackPhone ?? KEPCO_FALLBACK_PHONE,
    phoneStatus: phoneEntry?.phoneStatus ?? ("unknown" satisfies KepcoOfficePhoneStatus),
    phoneSource: officePhone ? KEPCO_PHONE_SOURCE_LABEL : KEPCO_OFFICE_SOURCE,
    phoneSourceDetail: formatPhoneSourceDetail(phoneEntry),
    phoneLastCheckedAt: phoneEntry?.lastCheckedAt ?? null,
  };
}

function buildFallback(parsed: ParsedKepcoAddress): ResolvedKepcoOffice {
  return attachPhoneFields({
    parsedAddress: parsed,
    officeName: KEPCO_FALLBACK_OFFICE_NAME,
    departmentHint: KEPCO_DEPARTMENT_HINT,
    source: KEPCO_OFFICE_SOURCE,
    matchLevel: "unknown",
    confidence: "unknown",
    statusLabel: "확인 필요",
    matchBasisLabel: "관할 사업소 확인 필요",
    parsedMeta: formatParsedAddressMeta(parsed),
    inquiryGuide: KEPCO_FALLBACK_INQUIRY_GUIDE,
    verificationNote: null,
  });
}

function buildResolved(entry: KepcoOfficeRegistryEntry, parsed: ParsedKepcoAddress): ResolvedKepcoOffice {
  const isFallbackOffice = entry.officeName === KEPCO_FALLBACK_OFFICE_NAME;

  return attachPhoneFields({
    parsedAddress: parsed,
    officeName: entry.officeName,
    departmentHint: KEPCO_DEPARTMENT_HINT,
    source: entry.source,
    matchLevel: entry.matchLevel,
    confidence: entry.confidence,
    statusLabel: statusLabelForConfidence(entry.confidence, entry.officeName),
    matchBasisLabel: formatMatchBasisLabel(entry, parsed),
    parsedMeta: formatParsedAddressMeta(parsed),
    inquiryGuide: isFallbackOffice ? KEPCO_FALLBACK_INQUIRY_GUIDE : null,
    verificationNote: entry.verificationNote ?? null,
  });
}

export function resolveKepcoOffice(address: string, jibunAddress = ""): ResolvedKepcoOffice {
  const parsed = mergeParsedAddresses(
    parseKepcoAddress(address.trim()),
    parseKepcoAddress(jibunAddress.trim()),
  );

  const candidates = KEPCO_OFFICE_REGISTRY.filter((entry) => entryMatches(entry, parsed));
  const best = pickBestMatch(candidates);

  if (!best) {
    return buildFallback(parsed);
  }

  return buildResolved(best, parsed);
}

export { parseKepcoAddress, formatParsedAddressMeta };
