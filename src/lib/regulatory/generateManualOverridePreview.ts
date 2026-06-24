import type { SetbackRegulationConfidence } from "@/types/regulatoryReview";
import type {
  ManualOverridePreviewInput,
  RegulatoryReviewAdminRow,
} from "@/types/regulatoryReviewAdmin";

function todaySeoulDate(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

function mapConfidence(row: RegulatoryReviewAdminRow): SetbackRegulationConfidence {
  if (row.manualOverride?.confidence) return row.manualOverride.confidence;
  if (row.parserConfidence === "high" || row.parserConfidence === "medium") {
    return "ordinance_based";
  }
  return "needs_verification";
}

function pickDistances(row: RegulatoryReviewAdminRow) {
  const manual = row.manualOverride?.distances;
  const extracted = row.candidate.extractedDistances;
  return {
    residential: manual?.residential ?? extracted.residential ?? extracted.building,
    building: manual?.building ?? extracted.building ?? extracted.residential,
    road: manual?.road ?? extracted.road,
    river: manual?.river ?? extracted.river,
    school: manual?.school ?? extracted.school,
    cultural: manual?.cultural ?? extracted.cultural,
  };
}

function pickAppendixNumber(row: RegulatoryReviewAdminRow): string {
  if (row.manualOverride?.appendixNumber) return row.manualOverride.appendixNumber;
  const solarAppendix = row.candidate.appendixRefs?.find((ref) =>
    /태양광|발전시설|이격/i.test(ref.title),
  );
  return solarAppendix?.number ?? "";
}

export function buildManualOverridePreviewInput(
  row: RegulatoryReviewAdminRow,
  reviewStatus: "manual_verified" | "manual_pending" = "manual_verified",
): ManualOverridePreviewInput {
  const [sido, sigungu] = row.regionKey.split("|");
  return {
    regionKey: row.regionKey,
    municipalityLabel: row.municipalityLabel,
    sido: sido ?? row.sido,
    sigungu: sigungu ?? row.sigungu,
    reviewStatus,
    confidence: mapConfidence(row),
    source: row.manualOverride?.source ?? row.ordinanceName,
    sourceUrl: row.sourceUrl,
    articleTitle: row.articleTitle,
    articleNumber:
      row.manualOverride?.articleNumber ??
      (row.candidate.matchedSections?.[0] as { articleNumber?: string } | undefined)?.articleNumber ??
      "",
    appendixNumber: pickAppendixNumber(row),
    distances: pickDistances(row),
    conditions: row.manualOverride?.conditions,
    notes: row.notes || undefined,
    verifiedBy: reviewStatus === "manual_verified" ? "admin_review" : null,
    verifiedAt: reviewStatus === "manual_verified" ? todaySeoulDate() : null,
  };
}

export function formatManualOverrideJsonSnippet(
  row: RegulatoryReviewAdminRow,
  reviewStatus: "manual_verified" | "manual_pending" = "manual_verified",
): string {
  const input = buildManualOverridePreviewInput(row, reviewStatus);
  const [sido, sigungu] = row.regionKey.split("|");

  const entry = {
    municipalityLabel: row.municipalityLabel,
    sido: sido ?? row.sido,
    sigungu: sigungu ?? row.sigungu,
    reviewStatus: input.reviewStatus,
    confidence: input.confidence,
    source: input.source,
    sourceUrl: input.sourceUrl,
    verifiedBy: input.verifiedBy,
    verifiedAt: input.verifiedAt,
    articleTitle: input.articleTitle,
    articleNumber: input.articleNumber ?? "",
    appendixNumber: input.appendixNumber ?? "",
    distances: input.distances,
    ...(input.conditions && Object.keys(input.conditions).length > 0
      ? { conditions: input.conditions }
      : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };

  return JSON.stringify({ [row.regionKey]: entry }, null, 2);
}
