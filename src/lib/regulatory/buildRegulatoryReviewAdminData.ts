import parsedCandidatesFile from "@/data/regulatory/parsed_candidates.json";
import manualOverridesFile from "@/data/regulatory/setback-manual-overrides.json";
import setbackRegulationsFile from "@/data/regulatory/setback-regulations.json";
import sourceRegistryFile from "@/data/regulatory/regulation-source-registry.json";
import { enrichCandidateForDisplay } from "@/lib/regulatory/parsedCandidatesDb";
import type {
  ParsedDistanceSet,
  ParsedOrdinanceCandidate,
  SetbackManualOverrideEntry,
  SetbackRegulationEntry,
} from "@/types/regulatoryReview";
import type {
  RegulatoryReviewAdminMeta,
  RegulatoryReviewAdminPayload,
  RegulatoryReviewAdminRow,
  RegulatoryReviewAdminStatus,
} from "@/types/regulatoryReviewAdmin";

const PARSED = (parsedCandidatesFile.candidates ?? []) as ParsedOrdinanceCandidate[];
const MANUAL = manualOverridesFile.entries as Record<string, SetbackManualOverrideEntry>;
const PRODUCTION = setbackRegulationsFile.entries as Record<string, SetbackRegulationEntry>;
const REGISTRY = sourceRegistryFile.entries as Record<
  string,
  { sources: import("@/types/regulatoryReview").RegulationSourceEntry[] }
>;

const DISTANCE_LABELS: Record<keyof ParsedDistanceSet, string> = {
  building: "건축물",
  residential: "주거지",
  road: "도로",
  river: "하천",
  school: "학교",
  cultural: "문화재",
};

function formatDistanceSummary(distances: ParsedDistanceSet, showSchool: boolean): string {
  const parts: string[] = [];
  for (const [key, label] of Object.entries(DISTANCE_LABELS)) {
    if (key === "school" && !showSchool) continue;
    const value = distances[key as keyof ParsedDistanceSet];
    if (value != null) parts.push(`${label} ${value}m`);
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function shouldShowSchool(distances: ParsedDistanceSet, candidate: ParsedOrdinanceCandidate): boolean {
  if (distances.school != null) return true;
  return (candidate.manualReviewCandidates ?? []).some(
    (item) => item.category === "school" && item.reason !== "non_solar_facility_permit_rule",
  );
}

function resolveArticleTitle(candidate: ParsedOrdinanceCandidate): string {
  const section = candidate.matchedSections?.[0];
  if (section?.title) return section.title;
  return "개발행위허가의 기준";
}

function buildRecommendedSummary(candidate: ParsedOrdinanceCandidate): string[] {
  const bullets: string[] = [];
  if (candidate.reviewReason) bullets.push(candidate.reviewReason);
  if (candidate.suspectDistanceReason) bullets.push(candidate.suspectDistanceReason);
  if (candidate.urbanRegionNotice) bullets.push(candidate.urbanRegionNotice);

  for (const text of candidate.matchedText.slice(0, 3)) {
    const trimmed = text.replace(/\s+/g, " ").trim();
    if (trimmed.length > 20) bullets.push(`${trimmed.slice(0, 180)}${trimmed.length > 180 ? "…" : ""}`);
  }

  if (candidate.notes?.trim()) bullets.push(candidate.notes.trim());

  return [...new Set(bullets)].slice(0, 6);
}

function resolveReviewStatus(
  candidate: ParsedOrdinanceCandidate,
  manual: SetbackManualOverrideEntry | null,
): RegulatoryReviewAdminStatus {
  if (manual?.reviewStatus === "manual_verified") return "수동 승인 완료";
  if (manual?.reviewStatus === "manual_pending") return "수동 검토";

  if (candidate.requiresManualReview) return "수동 검토";

  const hasDistances = Object.values(candidate.extractedDistances).some((v) => v != null);
  if (
    candidate.parserConfidence === "none" &&
    !hasDistances &&
    (candidate.excludedSections?.length ?? 0) > 0
  ) {
    return "제외";
  }

  if (
    candidate.parserConfidence === "low" &&
    !hasDistances &&
    !candidate.requiresManualReview
  ) {
    return "보류";
  }

  return "후보";
}

function buildRow(
  candidate: ParsedOrdinanceCandidate,
  manual: SetbackManualOverrideEntry | null,
): RegulatoryReviewAdminRow {
  const enriched = enrichCandidateForDisplay(candidate);
  const showSchool = shouldShowSchool(enriched.extractedDistances, enriched);
  const production = PRODUCTION[enriched.regionKey] ?? null;
  const registrySources = REGISTRY[enriched.regionKey]?.sources ?? [];

  return {
    regionKey: enriched.regionKey,
    municipalityLabel: enriched.municipalityLabel,
    sido: enriched.sido ?? enriched.regionKey.split("|")[0] ?? "",
    sigungu: enriched.sigungu ?? enriched.regionKey.split("|")[1] ?? "",
    ordinanceName: enriched.ordinanceName,
    articleTitle: manual?.articleTitle || resolveArticleTitle(enriched),
    reviewStatus: resolveReviewStatus(enriched, manual),
    parserConfidence: enriched.parserConfidence,
    distanceExtractionMethod: enriched.distanceExtractionMethod ?? "—",
    extractedDistances: enriched.extractedDistances,
    distanceSummary: formatDistanceSummary(enriched.extractedDistances, showSchool),
    sourceUrl: enriched.sourceUrl,
    hasSourceUrl: Boolean(enriched.sourceUrl?.trim()),
    requiresManualReview: Boolean(enriched.requiresManualReview || manual?.reviewStatus === "manual_pending"),
    notes: [manual?.notes, enriched.notes].filter(Boolean).join(" · ") || "",
    parsedAt: enriched.parsedAt ?? null,
    manualOverride: manual,
    productionEntry: production,
    registrySources,
    candidate: enriched,
    recommendedSummary: buildRecommendedSummary(enriched),
  };
}

function buildRowFromManualOnly(
  regionKey: string,
  manual: SetbackManualOverrideEntry,
): RegulatoryReviewAdminRow | null {
  if (PARSED.some((c) => c.regionKey === regionKey)) return null;

  const emptyCandidate: ParsedOrdinanceCandidate = {
    regionKey,
    municipalityLabel: manual.municipalityLabel,
    sido: manual.sido,
    sigungu: manual.sigungu,
    ordinanceName: manual.source,
    sourceUrl: manual.sourceUrl,
    sourceType: "ordinance",
    extractedDistances: {
      building: manual.distances.building,
      residential: manual.distances.residential,
      road: manual.distances.road,
      river: manual.distances.river,
      school: manual.distances.school,
      cultural: manual.distances.cultural,
    },
    matchedText: [],
    parserConfidence: "none",
    requiresManualReview: manual.reviewStatus === "manual_pending",
    notes: manual.notes ?? "",
  };

  return buildRow(emptyCandidate, manual);
}

export function buildRegulatoryReviewAdminData(): RegulatoryReviewAdminPayload {
  const rows: RegulatoryReviewAdminRow[] = [];

  for (const candidate of PARSED) {
    rows.push(buildRow(candidate, MANUAL[candidate.regionKey] ?? null));
  }

  for (const [regionKey, manual] of Object.entries(MANUAL)) {
    const orphan = buildRowFromManualOnly(regionKey, manual);
    if (orphan) rows.push(orphan);
  }

  rows.sort((a, b) => a.municipalityLabel.localeCompare(b.municipalityLabel, "ko"));

  const meta: RegulatoryReviewAdminMeta = {
    candidateCount: PARSED.length,
    manualOverrideCount: Object.keys(MANUAL).length,
    productionCount: Object.keys(PRODUCTION).length,
    registryCount: Object.keys(REGISTRY).length,
    parsedCandidatesVersion: String(parsedCandidatesFile.meta?.version ?? "—"),
    manualOverridesVersion: String(manualOverridesFile.meta?.version ?? "—"),
    setbackRegulationsVersion: String(setbackRegulationsFile.meta?.version ?? "—"),
    registryVersion: String(sourceRegistryFile.meta?.version ?? "—"),
  };

  return { meta, rows };
}
