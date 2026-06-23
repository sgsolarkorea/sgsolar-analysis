import { extractMunicipalityLabel } from "@/lib/regulatory/loadOrdinance";
import {
  enrichCandidateForDisplay,
  lookupParsedCandidate,
  regionKeyFromAddress,
} from "@/lib/regulatory/parsedCandidatesDb";
import {
  buildLegacyCardFromStatic,
  buildOrdinanceDisplayCards,
  isMetroUrbanSido,
  resolveUrbanPolicy,
} from "@/lib/regulatory/ordinanceDisplayPolicy";
import { mergeParsedAddresses, parseKepcoAddress } from "@/lib/kepco/parseKepcoAddress";
import type { MunicipalityOrdinanceData } from "@/types/regulatoryReview";
import type { OrdinanceDisplayResult } from "@/types/regulatoryReview";

function staticToSummaryBullets(data: MunicipalityOrdinanceData): string[] {
  return data.distanceRules
    .map((rule) => `${rule.label} ${rule.distance}`.replace(/\s+/g, " ").trim())
    .slice(0, 8);
}

function staticToCards(data: MunicipalityOrdinanceData): ReturnType<typeof buildLegacyCardFromStatic>[] {
  const article = data.articles[0];
  return [
    buildLegacyCardFromStatic({
      slug: data.slug,
      ordinanceTitle: data.ordinanceTitle,
      articleTitle: article?.title ?? "개발행위허가의 기준",
      appendixTitle: data.appendixTitle,
      summaryBullets: article?.items.length
        ? article.items
            .filter((item) => item.distance || item.summary)
            .map((item) =>
              item.distance ? `${item.label} ${item.distance}` : `${item.label}: ${item.summary}`,
            )
            .slice(0, 8)
        : staticToSummaryBullets(data),
      sourceUrl: data.ordinanceUrl,
    }),
  ];
}

export function resolveOrdinanceDisplay(
  address: string,
  jibunAddress = "",
  legacyReview: MunicipalityOrdinanceData | null = null,
): OrdinanceDisplayResult {
  const municipalityLabel = extractMunicipalityLabel(address);
  const parsed = mergeParsedAddresses(
    parseKepcoAddress(address.trim()),
    parseKepcoAddress(jibunAddress.trim()),
  );
  const sido = parsed.sido;

  const rawCandidate = lookupParsedCandidate(address, jibunAddress);
  const candidate = rawCandidate ? enrichCandidateForDisplay(rawCandidate) : null;

  const policy = resolveUrbanPolicy({ sido, candidate });

  if (candidate) {
    return {
      municipalityLabel: candidate.municipalityLabel ?? municipalityLabel,
      policy,
      cards: buildOrdinanceDisplayCards(candidate, policy),
      hasParsedCandidate: true,
      parsedAt: candidate.parsedAt,
    };
  }

  if (legacyReview && !policy.isUrbanMetro) {
    return {
      municipalityLabel: legacyReview.municipalityLabel,
      policy: {
        ...policy,
        displayStatus: "verified",
      },
      cards: staticToCards(legacyReview),
      hasParsedCandidate: false,
    };
  }

  const urbanOnly = isMetroUrbanSido(sido);
  if (urbanOnly) {
    return {
      municipalityLabel,
      policy: resolveUrbanPolicy({ sido, candidate: null }),
      cards: [],
      hasParsedCandidate: false,
    };
  }

  return {
    municipalityLabel,
    policy,
    cards: [],
    hasParsedCandidate: false,
  };
}

export { regionKeyFromAddress };
