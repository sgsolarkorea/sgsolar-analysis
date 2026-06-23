import type {
  ManualOverrideDistances,
  OrdinanceDisplayCard,
  OrdinanceDisplayPolicy,
  OrdinanceDisplayResult,
  SetbackManualOverrideEntry,
} from "@/types/regulatoryReview";
import {
  getExplicitOverrideDistances,
  hasExplicitOverrideDistances,
  MANUAL_OVERRIDE_VERIFIED_NOTICE_LINES,
} from "@/lib/regulatory/setbackManualOverrideDb";

const DISTANCE_LABELS: Record<string, string> = {
  residential: "주거지",
  road: "도로",
  river: "하천",
  school: "학교",
  cultural: "문화재",
};

const PENDING_QUALITATIVE_BULLETS = [
  "도로 경계 이격 기준",
  "주거밀집지역 이격 기준",
  "문화재 등 보전시설 주변 검토",
  "경사도 기준 검토",
  "완충공간 및 차폐시설 검토",
];

function buildConditionBullets(conditions: SetbackManualOverrideEntry["conditions"]): string[] {
  if (!conditions) return [];
  return Object.values(conditions).filter((value): value is string => Boolean(value?.trim()));
}

function buildVerifiedDistanceBullets(distances: ManualOverrideDistances): string[] {
  const explicit = getExplicitOverrideDistances(distances);
  return Object.entries(explicit).map(
    ([key, meters]) => `${DISTANCE_LABELS[key] ?? key} ${meters}m`,
  );
}

function buildManualOverrideCard(entry: SetbackManualOverrideEntry): OrdinanceDisplayCard {
  const isVerified = entry.reviewStatus === "manual_verified";
  const distanceBullets = isVerified ? buildVerifiedDistanceBullets(entry.distances) : [];
  const conditionBullets = buildConditionBullets(entry.conditions);
  const summaryBullets = isVerified
    ? [...distanceBullets, ...conditionBullets]
    : [...PENDING_QUALITATIVE_BULLETS];

  if (entry.notes && entry.reviewStatus === "manual_pending") {
    summaryBullets.push(entry.notes);
  }

  return {
    id: `manual-override-${entry.sido}-${entry.sigungu}`,
    ordinanceName: entry.source,
    articleTitle: entry.articleTitle || "개발행위허가의 기준",
    appendixTitle: entry.appendixNumber ? `별표 ${entry.appendixNumber}` : undefined,
    summaryBullets,
    sourceUrl: entry.sourceUrl,
    sourceOriginLabel: "수동 검토 DB",
    showDistances: isVerified && hasExplicitOverrideDistances(entry),
  };
}

function buildManualOverridePolicy(entry: SetbackManualOverrideEntry): OrdinanceDisplayPolicy {
  const isVerified = entry.reviewStatus === "manual_verified";
  const isPending = entry.reviewStatus === "manual_pending";
  const includeSchoolSetback = typeof entry.distances.school === "number";

  return {
    isUrbanMetro: false,
    hideSetbackDistances: isPending,
    hideOrdinanceDistances: isPending,
    includeSchoolSetback,
    displayStatus: isVerified ? "manual_verified" : "manual_pending",
    manualReviewStatus: entry.reviewStatus,
    reviewReason: isPending ? entry.notes : undefined,
    manualOverrideNoticeLines: isVerified ? [...MANUAL_OVERRIDE_VERIFIED_NOTICE_LINES] : undefined,
  };
}

export function buildManualOverrideOrdinanceDisplay(
  entry: SetbackManualOverrideEntry,
  municipalityLabel: string,
): OrdinanceDisplayResult {
  return {
    municipalityLabel: entry.municipalityLabel ?? municipalityLabel,
    policy: buildManualOverridePolicy(entry),
    cards: [buildManualOverrideCard(entry)],
    hasParsedCandidate: false,
    hasManualOverride: true,
    manualVerifiedAt: entry.verifiedAt,
  };
}
