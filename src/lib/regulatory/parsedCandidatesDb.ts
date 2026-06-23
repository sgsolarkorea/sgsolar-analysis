import parsedCandidatesFile from "@/data/regulatory/parsed_candidates.json";
import appendixReportFile from "@/data/regulatory/appendix-parse-report.json";
import { mergeParsedAddresses, parseKepcoAddress } from "@/lib/kepco/parseKepcoAddress";
import type { ParsedDistanceSet, ParsedOrdinanceCandidate } from "@/types/regulatoryReview";

type AppendixResult = {
  regionKey: string;
  appendixParseSuccess?: boolean;
  distanceExtractionMethod?: string;
  extractedDistances?: ParsedDistanceSet;
  appendixSourceUrl?: string | null;
  notes?: string;
};

const CANDIDATES = (parsedCandidatesFile.candidates ?? []) as ParsedOrdinanceCandidate[];
const APPENDIX_BY_KEY = new Map<string, AppendixResult>(
  ((appendixReportFile.results ?? []) as AppendixResult[]).map((row) => [row.regionKey, row]),
);

export function regionKeyFromAddress(address: string, jibunAddress = ""): string | null {
  const parsed = mergeParsedAddresses(
    parseKepcoAddress(address.trim()),
    parseKepcoAddress(jibunAddress.trim()),
  );
  if (!parsed.sido || !parsed.sigungu) return null;
  return `${parsed.sido}|${parsed.sigungu}`;
}

export function lookupParsedCandidate(
  address: string,
  jibunAddress = "",
): ParsedOrdinanceCandidate | null {
  const key = regionKeyFromAddress(address, jibunAddress);
  if (!key) return null;
  return CANDIDATES.find((c) => c.regionKey === key) ?? null;
}

/** Display-only merge of HWP appendix distances (does not modify setback-regulations.json). */
export function enrichCandidateForDisplay(
  candidate: ParsedOrdinanceCandidate,
): ParsedOrdinanceCandidate {
  const appendix = APPENDIX_BY_KEY.get(candidate.regionKey);
  if (!appendix?.appendixParseSuccess || !appendix.extractedDistances) {
    return candidate;
  }

  if (candidate.isUrbanMetro && candidate.requiresManualReview) {
    return candidate;
  }

  const mergedDistances = { ...candidate.extractedDistances };
  for (const [key, value] of Object.entries(appendix.extractedDistances)) {
    if (value != null && mergedDistances[key as keyof ParsedDistanceSet] == null) {
      mergedDistances[key as keyof ParsedDistanceSet] = value;
    }
  }

  const hasDistances = Object.values(mergedDistances).some((v) => v != null);
  const distanceCount = Object.values(mergedDistances).filter((v) => v != null).length;

  return {
    ...candidate,
    extractedDistances: mergedDistances,
    distanceExtractionMethod:
      appendix.distanceExtractionMethod === "hwp"
        ? "hwp"
        : candidate.distanceExtractionMethod,
    appendixSourceUrl: appendix.appendixSourceUrl ?? candidate.appendixSourceUrl,
    appendixParseSuccess: true,
    parserConfidence:
      appendix.distanceExtractionMethod === "hwp" && distanceCount > 0
        ? "medium"
        : candidate.parserConfidence,
    parseStats: {
      ...candidate.parseStats,
      solarArticleCount: candidate.parseStats?.solarArticleCount ?? 0,
      distanceCount,
      appendixCount: candidate.parseStats?.appendixCount ?? 0,
    },
    notes: appendix.notes || candidate.notes,
  };
}

export function listParsedCandidateRegionKeys(): string[] {
  return CANDIDATES.map((c) => c.regionKey);
}
